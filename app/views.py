import os
from io import BytesIO

import cloudinary
import cloudinary.api
import cloudinary.exceptions
import cloudinary.uploader
import requests
from django.http import HttpResponse
from django.utils import timezone
from dotenv import load_dotenv
from PIL import Image
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework.permissions import IsAuthenticated
from .util import process_image, parse_json_field

load_dotenv()

CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")

# Configuration
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = 'http://localhost:8080/auth/google/callback'
    client_class = OAuth2Client


@api_view(["GET"])
def wake(request):
    return Response({"status": "success", "time": timezone.now()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload(request):
    file = request.FILES.get("template")
    public_id = request.data.get("public_id")

    # Save image to in-memory buffer
    buffer = BytesIO()

    cert_template = Image.open(file)
    img = cert_template.copy()

    img.save(buffer, format="PNG")
    buffer.seek(0)

    # Upload directly from memory
    result = cloudinary.uploader.upload(buffer, public_id=public_id)

    return Response(
        {"public_id": result["public_id"], "secure_url": result["secure_url"]}
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_public_id(request):
    public_id = request.data.get("public_id")

    if not public_id:
        return Response({"error": "public_id is required"}, status=400)

    try:
        cloudinary.api.resource(public_id, resource_type="image")
        # If this succeeds, the asset EXISTS
        return Response({"exists": True}, status=200)

    except cloudinary.exceptions.NotFound:
        # Asset does NOT exist
        return Response({"exists": False}, status=200)

@api_view(["POST"])
# @permission_classes([IsAuthenticated])
def generate(request):
    data = request.data
    public_id = data.get("certificateId")
    in_editor = data.get("inEditor") == "true"

    # Parse fields - new way (support list of fields)
    fields = parse_json_field(data.get("fields"), [])

    # Fallback for legacy requests (single field)
    if not fields:
        legacy_field = {
            "text": data.get("participantName", ""),
            "x": int(parse_json_field(data.get("textPosition"), {}).get("x", 0)),  # type: ignore
            "y": int(parse_json_field(data.get("textPosition"), {}).get("y", 0)),  # type: ignore
            "font": data.get("selectedFont", "Bickham Script Pro Regular"),
            "fontSize": int(data.get("fontSize", 100)),
            "color": data.get("textColor", "#000000"),
            "anchorMode": data.get("anchorMode", "center"),
        }
        fields = [legacy_field]

    if not in_editor:
        url = f"https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/image/upload/{public_id}.png"

        response = requests.get(url)

        if response.status_code != 200:
            return Response(
                {"error": "Failed to fetch certificate template"},
                status=502,
            )

        content_type = response.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            return Response(
                {"error": "Cloudinary did not return an image"},
                status=502,
            )

        image = Image.open(BytesIO(response.content)).convert("RGBA")
    else:
        template_file = request.FILES.get("template")
        if not template_file:
            return Response({"error": "Template is required"}, status=400)

        # Load image directly from uploaded file
        image = Image.open(template_file).convert("RGBA")

    # Process ALL fields
    buffer = process_image(image, fields)
    image_data = buffer.getvalue()
    buffer.close()

    # Determine filename (use first field text or default)
    filename = "Certificate"
    if fields and fields[0].get("text"):
        filename = fields[0].get("text")

    return HttpResponse(
        image_data,
        content_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}.png"'},
    )

