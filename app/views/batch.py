"""
Batch certificate generation: generate one certificate per recipient and return a ZIP.
"""
import io
import logging
import zipfile

import requests
from PIL import Image
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse

from django.db import models

from ..models import GenerationEvent, Templates
from ..throttles import GenerateThrottle
from ..util import parse_json_field, process_image, MAX_TEXT_LENGTH
from ..views import CLOUDINARY_CLOUD_NAME, _validate_image_file

logger = logging.getLogger("app")

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
        return Response({"error": "fields is required and must be a non-empty array."}, status=400)
    if not isinstance(recipients, list) or not recipients:
        return Response({"error": "recipients is required and must be a non-empty array."}, status=400)
    if len(recipients) > MAX_RECIPIENTS:
        return Response({"error": f"Maximum {MAX_RECIPIENTS} recipients per batch."}, status=400)

    # Load the base image once
    if in_editor:
        template_file = request.FILES.get("template")
        if not template_file:
            return Response({"error": "Template file is required in editor mode."}, status=400)
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
            return Response({"error": "Failed to fetch certificate template."}, status=502)

    zip_buffer = io.BytesIO()
    errors = []
    success_count = 0

    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx, recipient in enumerate(recipients):
            name = str(recipient.get("name", "")).strip()[:MAX_TEXT_LENGTH]
            if not name:
                errors.append(f"Recipient {idx + 1}: missing name, skipped.")
                continue

            # Substitute first field text with recipient name; other fields remain fixed
            recipient_fields = [
                {**f, "text": name} if i == 0 else f
                for i, f in enumerate(fields)
            ]

            try:
                img_copy = base_image.copy()
                buf = process_image(img_copy, recipient_fields)
                safe_name = name.replace("/", "").replace("\\", "").replace("\x00", "")
                zf.writestr(f"{safe_name}.png", buf.getvalue())
                buf.close()
                success_count += 1
            except Exception as exc:
                logger.warning("Batch: failed to generate for %s: %s", name, exc)
                errors.append(f"Recipient {idx + 1} ({name}): generation failed.")

    if not in_editor and success_count:
        # Only count against a published template — editor-only batch tests
        # (raw file upload, no certificateId) aren't real issuances.
        tpl = Templates.objects.filter(public_id=public_id).first()
        if tpl:
            Templates.objects.filter(pk=tpl.pk).update(
                generation_count=models.F("generation_count") + success_count
            )
            GenerationEvent.objects.create(
                template=tpl, kind=GenerationEvent.Kind.BATCH, count=success_count
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
