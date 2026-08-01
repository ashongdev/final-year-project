"""
Signature library: saved, reusable signature images an organizer can pick
from when setting up a Signature field, distinct from the one-off
draw/upload flow in the editor (see app.views.upload_signature), which
overwrites its own ephemeral asset in place rather than being saved here.
"""
import logging
from io import BytesIO

import cloudinary.uploader
from PIL import Image
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import _validate_image_file
from ..models import Signature
from ..serializer import SignatureSerializer

logger = logging.getLogger("app")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_signatures(request):
    signatures = Signature.objects.filter(user=request.user)
    serializer = SignatureSerializer(signatures, many=True)
    return Response({"signatures": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_signature(request):
    """Uploads a signature (drawn or picked file) and saves it to the library."""
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

    name = (request.data.get("name") or "Signature").strip()[:255] or "Signature"

    try:
        result = cloudinary.uploader.upload(buffer, folder="signatures")
    except Exception as exc:
        logger.error(
            "Signature library upload failed for user %s: %s", request.user.pk, exc
        )
        return Response({"error": "Upload to storage failed."}, status=502)

    signature = Signature.objects.create(
        user=request.user,
        name=name,
        url=result["secure_url"],
        public_id=result["public_id"],
    )
    serializer = SignatureSerializer(signature)
    return Response({"signature": serializer.data}, status=201)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def rename_signature(request):
    signature_id = request.data.get("signatureId")
    name = (request.data.get("name") or "").strip()

    if not signature_id:
        return Response({"error": "signatureId is required."}, status=400)
    if not name:
        return Response({"error": "name is required."}, status=400)

    updated = Signature.objects.filter(user=request.user, id=signature_id).update(
        name=name[:255]
    )
    if not updated:
        return Response({"error": "Signature not found."}, status=404)

    return Response({"ok": True})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_signature(request):
    signature_id = request.query_params.get("signatureId")
    if not signature_id:
        return Response({"error": "signatureId is required."}, status=400)

    signature = Signature.objects.filter(user=request.user, id=signature_id).first()
    if not signature:
        return Response({"error": "Signature not found."}, status=404)

    try:
        cloudinary.uploader.destroy(signature.public_id)
    except Exception as exc:
        logger.warning(
            "Failed to destroy Cloudinary signature asset %s: %s",
            signature.public_id,
            exc,
        )
        # Non-fatal: still remove the DB row so it doesn't linger in the library.

    signature.delete()
    return Response({"ok": True})
