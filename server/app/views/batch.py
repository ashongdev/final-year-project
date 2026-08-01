"""
Batch certificate generation: generate one certificate per recipient and return a ZIP.
"""

import io
import logging
import zipfile

import requests
from django.conf import settings
from django.db import models
from django.http import HttpResponse
from PIL import Image
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..billing import (
    batch_recipient_cap,
    get_or_create_subscription,
    user_has_pro_access,
)
from ..models import GenerationEvent, Subscription, Templates
from ..throttles import GenerateThrottle
from ..util import MAX_TEXT_LENGTH, parse_json_field, process_image
from ..views import CLOUDINARY_CLOUD_NAME, _check_field_count_gate, _validate_image_file

logger = logging.getLogger("app")

# Hard technical ceiling regardless of plan; batch_recipient_cap() in
# app.billing decides the actual per-request limit (free cap + credits, or
# this ceiling for Pro).
MAX_RECIPIENTS = 500


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([GenerateThrottle])
def generate_batch(request):
    """
    Generate one certificate per recipient and return all as a ZIP file.

    Payload (multipart):
      - template: image file (when in_editor=true) OR certificateId field
      - fields: JSON array of TextField objects (the template fields)
      - recipients: JSON array of {name, email} objects
      - inEditor: "true" | "false"
    """
    data = request.data
    in_editor = data.get("inEditor") == "true"
    public_id = data.get("certificateId", "").strip()

    fields = parse_json_field(data.get("fields"), [])
    recipients = parse_json_field(data.get("recipients"), [])

    if not isinstance(fields, list) or not fields:
        return Response(
            {"error": "fields is required and must be a non-empty array."}, status=400
        )
    if not isinstance(recipients, list) or not recipients:
        return Response(
            {"error": "recipients is required and must be a non-empty array."},
            status=400,
        )
    if len(recipients) > MAX_RECIPIENTS:
        return Response(
            {"error": f"Maximum {MAX_RECIPIENTS} recipients per batch."}, status=400
        )

    field_gate_err = _check_field_count_gate(fields, in_editor, public_id, request.user)
    if field_gate_err:
        return field_gate_err

    is_pro = user_has_pro_access(request.user)
    cap = batch_recipient_cap(request.user)
    if len(recipients) > cap:
        return Response(
            {
                "error": (
                    f"Free accounts (plus any credits) are limited to {cap} "
                    "recipients per batch. Upgrade to Pro for unlimited batches, "
                    "or buy a credit pack for a one-time boost."
                ),
                "upgrade_required": True,
            },
            status=402,
        )

    # Load the base image once
    if in_editor:
        template_file = request.FILES.get("template")
        if not template_file:
            return Response(
                {"error": "Template file is required in editor mode."}, status=400
            )
        err = _validate_image_file(template_file)
        if err:
            return Response({"error": err}, status=400)
        try:
            base_image = Image.open(template_file).convert("RGBA")
        except Exception:
            return Response({"error": "Could not open template image."}, status=400)
    else:
        if not public_id:
            return Response({"error": "certificateId is required."}, status=400)
        url = f"https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/image/upload/{public_id}.png"
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            base_image = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        except Exception as exc:
            logger.warning("Batch: failed to fetch template %s: %s", public_id, exc)
            return Response(
                {"error": "Failed to fetch certificate template."}, status=502
            )

    zip_buffer = io.BytesIO()
    errors = []
    success_count = 0
    # Shared across every recipient so a signature field's image is fetched
    # from Cloudinary once for the whole batch, not once per recipient.
    signature_cache: dict = {}

    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx, recipient in enumerate(recipients):
            name = str(recipient.get("name", "")).strip()[:MAX_TEXT_LENGTH]
            if not name:
                errors.append(f"Recipient {idx + 1}: missing name, skipped.")
                continue

            # Substitute first field text with recipient name; other fields remain fixed
            recipient_fields = [
                {**f, "text": name} if i == 0 else f for i, f in enumerate(fields)
            ]

            try:
                img_copy = base_image.copy()
                buf = process_image(img_copy, recipient_fields, signature_cache)
                safe_name = name.replace("/", "").replace("\\", "").replace("\x00", "")
                zf.writestr(f"{safe_name}.png", buf.getvalue())
                buf.close()
                success_count += 1
            except Exception as exc:
                logger.warning("Batch: failed to generate for %s: %s", name, exc)
                errors.append(f"Recipient {idx + 1} ({name}): generation failed.")

    if success_count and public_id:
        # Count whenever we can attribute this batch to a published template,
        # whether fetched by id (in_editor=False) or generated from the
        # editor's own re-uploaded file with a known certificateId attached.
        # A never-uploaded draft has no public_id yet and is correctly skipped.
        tpl = Templates.objects.filter(public_id=public_id).first()
        if tpl:
            Templates.objects.filter(pk=tpl.pk).update(
                generation_count=models.F("generation_count") + success_count
            )
            GenerationEvent.objects.create(
                template=tpl, kind=GenerationEvent.Kind.BATCH, count=success_count
            )

    if success_count and not is_pro:
        credits_used = max(0, success_count - settings.FREE_BATCH_RECIPIENT_CAP)
        if credits_used:
            subscription = get_or_create_subscription(request.user)
            new_balance = max(0, subscription.credit_balance - credits_used)
            Subscription.objects.filter(pk=subscription.pk).update(
                credit_balance=new_balance
            )

    zip_buffer.seek(0)
    response = HttpResponse(
        zip_buffer.getvalue(),
        content_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="certificates.zip"'},
    )

    if errors:
        response["X-Batch-Errors"] = "; ".join(errors[:10])

    return response
