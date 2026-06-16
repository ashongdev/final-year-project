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
from django.http import HttpResponse
from dotenv import load_dotenv
from PIL import Image
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from ..models import TemplateParams, Templates
from ..throttles import GenerateThrottle
from ..util import parse_json_field, process_image

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

    public_id = request.data.get("public_id") or None

    try:
        result = cloudinary.uploader.upload(buffer, public_id=public_id)
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
