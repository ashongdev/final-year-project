import logging
import os
from io import BytesIO

import cloudinary
import cloudinary.api
import cloudinary.exceptions
import cloudinary.uploader
import requests
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings
from django.core import signing
from django.db import models
from django.http import HttpResponse
from dotenv import load_dotenv
from PIL import Image
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from ..billing import user_has_pro_access
from ..models import (
    GenerationEvent,
    PublishedRecipient,
    Signature,
    TemplateParams,
    Templates,
)
from ..throttles import GenerateThrottle
from ..util import parse_json_field, process_image

# Must match app.views.participant.VERIFICATION_SALT / TOKEN_MAX_AGE_SECONDS,
# duplicated here (rather than imported) to avoid a views-package import cycle.
VERIFICATION_SALT = "recipient-verification"
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24  # 24h

load_dotenv()

logger = logging.getLogger("app")

CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = os.getenv("CALLBACK_URL")
    client_class = OAuth2Client


# ─── Auth ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response({
        "id": user.pk,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    })


# ─── Template management ──────────────────────────────────────────────────────

def _validate_image_file(file) -> str | None:
    """Return an error string if the file is invalid, else None."""
    if file.size > MAX_UPLOAD_BYTES:
        return f"File too large. Maximum size is {MAX_UPLOAD_BYTES // 1024 // 1024} MB."
    content_type = getattr(file, "content_type", "")
    if content_type not in ALLOWED_IMAGE_TYPES:
        return f"Unsupported file type: {content_type}. Allowed: JPEG, PNG, WEBP."
    return None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload(request):
    user = request.user
    file = request.FILES.get("template")
    if not file:
        return Response({"error": "No file provided."}, status=400)

    err = _validate_image_file(file)
    if err:
        return Response({"error": err}, status=400)

    try:
        image = Image.open(file)
        image.verify()  # Validate it is actually an image
    except Exception:
        return Response({"error": "File is not a valid image."}, status=400)

    # Re-open after verify (verify closes the file pointer)
    file.seek(0)
    image = Image.open(file)

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    requested_public_id = (request.data.get("public_id") or "").strip() or None
    existing_public_id = (request.data.get("existing_public_id") or "").strip() or None

    existing_template = None
    if existing_public_id:
        existing_template = Templates.objects.filter(
            public_id=existing_public_id, user=user
        ).first()

    if existing_template:
        # Re-publishing/re-uploading within the same session — overwrite the
        # asset already owned by this user in place instead of creating a
        # duplicate Cloudinary asset + Templates row.
        try:
            result = cloudinary.uploader.upload(
                buffer,
                public_id=existing_template.public_id,
                overwrite=True,
                invalidate=True,
            )
        except Exception as exc:
            logger.error("Cloudinary overwrite failed for user %s: %s", user.pk, exc)
            return Response({"error": "Upload to storage failed."}, status=502)

        final_public_id = result["public_id"]
        url = result["secure_url"]

        # A different final id was requested (e.g. a custom slug set at
        # publish time) — rename the same asset rather than duplicating it.
        if requested_public_id and requested_public_id != final_public_id:
            try:
                rename_result = cloudinary.uploader.rename(
                    final_public_id, requested_public_id, overwrite=True
                )
                final_public_id = rename_result["public_id"]
                url = rename_result["secure_url"]
            except cloudinary.exceptions.Error as exc:
                logger.warning(
                    "Rename failed for %s -> %s: %s",
                    final_public_id,
                    requested_public_id,
                    exc,
                )
                # Non-fatal: keep serving the asset under its current id.

        existing_template.public_id = final_public_id
        existing_template.url = url
        existing_template.save(update_fields=["public_id", "url", "updated_at"])

        logger.info(
            "Template replaced in place: %s by user %s", final_public_id, user.pk
        )
        return Response({"public_id": final_public_id, "secure_url": url})

    # This is a genuinely new template (not overwriting one already owned),
    # so it counts against the free tier's active-template cap.
    if not user_has_pro_access(user):
        active_count = Templates.objects.filter(user=user, state="active").count()
        if active_count >= settings.FREE_TEMPLATE_CAP:
            return Response(
                {
                    "error": (
                        f"Free accounts are limited to {settings.FREE_TEMPLATE_CAP} "
                        "templates. Upgrade to Pro for unlimited templates."
                    ),
                    "upgrade_required": True,
                },
                status=402,
            )

    try:
        result = cloudinary.uploader.upload(buffer, public_id=requested_public_id)
    except Exception as exc:
        logger.error("Cloudinary upload failed for user %s: %s", user.pk, exc)
        return Response({"error": "Upload to storage failed."}, status=502)

    final_public_id = result["public_id"]
    url = result["secure_url"]

    template = Templates.objects.create(
        public_id=final_public_id,
        user=user,
        url=url,
    )
    TemplateParams.objects.create(template=template, user=user)

    logger.info("Template uploaded: %s by user %s", final_public_id, user.pk)
    return Response({"public_id": final_public_id, "secure_url": url})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_signature(request):
    """
    Uploads an organizer's one-off, editor-scratch signature (either a
    picked file or a PNG exported from the draw pad) to Cloudinary and
    returns its URL for use as an image field. Signatures are always set by
    the organizer in the editor, never by recipients on the public
    participant link.

    Pass existing_public_id to overwrite that same asset in place instead of
    creating a new one each time a field's signature is redrawn/reuploaded,
    the same pattern used for template re-uploads. The one exception:
    existing_public_id is never honoured if it belongs to a saved Signature
    library entry, so reworking a field's signature can never corrupt one of
    the organizer's saved signatures, a fresh asset is created instead.
    """
    file = request.FILES.get("signature")
    if not file:
        return Response({"error": "No file provided."}, status=400)

    err = _validate_image_file(file)
    if err:
        return Response({"error": err}, status=400)

    try:
        image = Image.open(file)
        image.verify()
    except Exception:
        return Response({"error": "File is not a valid image."}, status=400)

    file.seek(0)
    image = Image.open(file).convert("RGBA")

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    existing_public_id = (request.data.get("existing_public_id") or "").strip() or None
    can_overwrite = bool(existing_public_id) and not Signature.objects.filter(
        user=request.user, public_id=existing_public_id
    ).exists()

    try:
        if can_overwrite:
            result = cloudinary.uploader.upload(
                buffer,
                public_id=existing_public_id,
                overwrite=True,
                invalidate=True,
            )
        else:
            result = cloudinary.uploader.upload(buffer, folder="signatures")
    except Exception as exc:
        logger.error("Signature upload failed for user %s: %s", request.user.pk, exc)
        return Response({"error": "Upload to storage failed."}, status=502)

    return Response(
        {"secure_url": result["secure_url"], "public_id": result["public_id"]}
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_public_id(request):
    public_id = request.data.get("public_id", "").strip()
    if not public_id:
        return Response({"error": "public_id is required."}, status=400)
    if len(public_id) > 255:
        return Response({"error": "public_id is too long."}, status=400)

    try:
        cloudinary.api.resource(public_id, resource_type="image")
        return Response({"exists": True})
    except cloudinary.exceptions.NotFound:
        return Response({"exists": False})
    except Exception as exc:
        logger.error("Cloudinary check_public_id error: %s", exc)
        return Response({"error": "Storage check failed."}, status=502)


# ─── Certificate generation ───────────────────────────────────────────────────

def _check_recipient_gate(public_id: str, verification_token: str) -> Response | None:
    """
    Returns a 403 Response if this template is gated (has a recipients
    allow-list) and the caller doesn't present a valid verification token
    for one of those recipients. Returns None if generation may proceed —
    either the template is ungated (no recipients set), or the token checks
    out.
    """
    template = Templates.objects.filter(public_id=public_id).first()
    if not template or not PublishedRecipient.objects.filter(template=template).exists():
        return None  # Ungated — open to anyone, as before.

    if not verification_token:
        return Response(
            {
                "error": "This certificate requires email verification.",
                "gated": True,
            },
            status=403,
        )

    try:
        payload = signing.loads(
            verification_token,
            salt=VERIFICATION_SALT,
            max_age=TOKEN_MAX_AGE_SECONDS,
        )
    except signing.BadSignature:
        return Response(
            {
                "error": "Verification expired or invalid. Please verify again.",
                "gated": True,
            },
            status=403,
        )

    if payload.get("public_id") != public_id:
        return Response(
            {"error": "Verification does not match this certificate.", "gated": True},
            status=403,
        )

    recipient = PublishedRecipient.objects.filter(
        template=template, email__iexact=payload.get("email", "")
    ).first()
    if not recipient:
        return Response(
            {"error": "You are no longer on the recipient list.", "gated": True},
            status=403,
        )

    # Redownloads beyond the free cap require the template owner to be Pro
    # (the organizer's plan, not the recipient's — recipients never have
    # accounts here).
    if (
        recipient.download_count >= settings.FREE_REDOWNLOAD_CAP
        and not user_has_pro_access(template.user)
    ):
        return Response(
            {
                "error": (
                    "This certificate has reached its free redownload limit. "
                    "Ask the organizer to upgrade to Pro for unlimited redownloads."
                ),
                "gated": True,
            },
            status=403,
        )

    PublishedRecipient.objects.filter(pk=recipient.pk).update(
        download_count=models.F("download_count") + 1
    )
    return None


def _check_field_count_gate(
    fields: list, in_editor: bool, public_id: str, request_user
) -> Response | None:
    """
    More than one field is the Advanced editor's whole feature, a Pro-only
    capability. For a published template, the relevant plan is the
    template owner's (self-serve recipients never have accounts); for an
    in-editor draft with no persisted template yet, it's whoever is signed
    in and generating right now.
    """
    if len(fields) <= settings.FREE_FIELD_CAP:
        return None

    if not in_editor and public_id:
        template = Templates.objects.filter(public_id=public_id).first()
        if template and user_has_pro_access(template.user):
            return None
    elif (
        request_user
        and request_user.is_authenticated
        and user_has_pro_access(request_user)
    ):
        return None

    return Response(
        {
            "error": "Multiple fields require a Pro plan (the Advanced editor).",
            "upgrade_required": True,
        },
        status=402,
    )


@api_view(["POST"])
@throttle_classes([GenerateThrottle])
def generate(request):
    """
    Generate a certificate PNG.

    Supports two modes:
      - inEditor=true: image file uploaded directly in request.FILES["template"]
      - inEditor=false (or absent): fetch image from Cloudinary by certificateId
    """
    data = request.data
    public_id = data.get("certificateId", "").strip()
    in_editor = data.get("inEditor") == "true"
    # "preview" (the editor's Preview button) reuses this same endpoint but
    # shouldn't count as a real issuance. Anything else — including the
    # editor's own Download button and the public participant link, which
    # doesn't send this field at all — defaults to counting.
    purpose = data.get("purpose", "download")

    fields = parse_json_field(data.get("fields"), [])

    # Legacy single-field fallback
    if not fields:
        pos = parse_json_field(data.get("textPosition"), {})
        fields = [{
            "text": data.get("participantName", ""),
            "x": int(pos.get("x", 0)),
            "y": int(pos.get("y", 0)),
            "font": data.get("selectedFont", "Bickham Script Pro Regular"),
            "fontSize": int(data.get("fontSize", 100)),
            "color": data.get("textColor", "#000000"),
            "anchorMode": data.get("anchorMode", "center"),
        }]

    if not isinstance(fields, list) or not fields:
        return Response({"error": "No fields provided."}, status=400)

    field_gate_err = _check_field_count_gate(fields, in_editor, public_id, request.user)
    if field_gate_err:
        return field_gate_err

    if in_editor:
        template_file = request.FILES.get("template")
        if not template_file:
            return Response({"error": "Template file is required in editor mode."}, status=400)
        err = _validate_image_file(template_file)
        if err:
            return Response({"error": err}, status=400)
        try:
            image = Image.open(template_file).convert("RGBA")
        except Exception:
            return Response({"error": "Could not open template image."}, status=400)
    else:
        if not public_id:
            return Response({"error": "certificateId is required."}, status=400)
        if len(public_id) > 255:
            return Response({"error": "certificateId is too long."}, status=400)

        err = _check_recipient_gate(public_id, data.get("verificationToken", ""))
        if err:
            return err

        url = f"https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/image/upload/{public_id}.png"
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            content_type = resp.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                return Response({"error": "Certificate template is not an image."}, status=502)
            image = Image.open(BytesIO(resp.content)).convert("RGBA")
        except requests.RequestException as exc:
            logger.warning("Failed to fetch template %s: %s", public_id, exc)
            return Response({"error": "Failed to fetch certificate template."}, status=502)

    try:
        buffer = process_image(image, fields)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    except Exception as exc:
        logger.exception("Image processing failed: %s", exc)
        return Response({"error": "Certificate generation failed."}, status=500)

    if purpose != "preview" and public_id:
        # Count against a published template whenever we can attribute this
        # generation to one — the public participant link (always has a
        # public_id, never a "preview"), and the editor's own Download
        # button once a template has been uploaded/published. A brand-new,
        # never-uploaded draft has no public_id yet, so there's nothing to
        # attribute it to and it's correctly skipped. in_editor distinguishes
        # the organizer downloading their own copy from an actual recipient
        # using the public self-serve link.
        tpl = Templates.objects.filter(public_id=public_id).first()
        if tpl:
            Templates.objects.filter(pk=tpl.pk).update(
                generation_count=models.F("generation_count") + 1
            )
            kind = (
                GenerationEvent.Kind.EDITOR
                if in_editor
                else GenerationEvent.Kind.SELF_SERVE
            )
            GenerationEvent.objects.create(template=tpl, kind=kind, count=1)

    image_data = buffer.getvalue()
    buffer.close()

    filename = fields[0].get("text", "Certificate") or "Certificate"
    # Sanitise filename — strip path separators and null bytes
    filename = filename.replace("/", "").replace("\\", "").replace("\x00", "")[:100]

    return HttpResponse(
        image_data,
        content_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}.png"'},
    )
