import json
import os
from io import BytesIO

import cloudinary
import cloudinary.api
import cloudinary.exceptions
import cloudinary.uploader
import requests
from django.http import HttpResponse
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
from rest_framework.decorators import api_view
from rest_framework.response import Response

# from .models import CertificatePreset

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


# Create your views here.
@api_view(["GET"])
def test_route(request):
    return Response({"message": "Hello World from RaspberryPi"})


@api_view(["POST"])
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

    # Save presets
    # CertificatePreset.objects.update_or_create(
    #     public_id=result["public_id"],
    #     defaults={
    #         "selected_font": request.data.get(
    #             "selectedFont", "Bickham Script Pro Regular"
    #         ),
    #         "font_size": int(request.data.get("fontSize", 100)),
    #         "font_weight": request.data.get("fontWeight", "400"),
    #         "text_color": request.data.get("textColor", "#000000"),
    #         "text_x": int(request.data.get("x", 0)),
    #         "text_y": int(request.data.get("y", 0)),
    #         "anchor_mode": request.data.get("anchorMode", "center"),
    #     },
    # )

    return Response(
        {"public_id": result["public_id"], "secure_url": result["secure_url"]}
    )


# @api_view(["POST"])
# def generate(request):
#     data = request.data
#     public_id = data.get("fileName")
#     recipients = data.get("recipients")
#     anchor_mode = data.get("anchorMode", "center")

#     url = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/{public_id}.png"
#     # url = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/{public_id}.png"

#     response = requests.get(url)
#     image = Image.open(BytesIO(response.content)).convert("RGBA")

#     y_axis = data.get("textPosition")["y"]
#     x_axis = data.get("textPosition")["x"]
#     selected_font = data.get("selectedFont")
#     font_size = int(data.get("fontSize"))
#     text_color = data.get("textColor")

#     font_path = f"fonts/{selected_font}.ttf"
#     font = ImageFont.truetype(font_path, font_size)

#     return_value = []

#     for recipient in recipients:
#         name = recipient["name"]

#         # img = cert_template.copy()
#         draw = ImageDraw.Draw(image)

#         bbox = draw.textbbox((0, 0), name, font=font)
#         text_left, text_top, text_right, text_bottom = bbox
#         text_w = text_right - text_left
#         text_h = text_bottom - text_top

#         if anchor_mode == "center":
#             x_draw = x_axis - text_w / 2 - text_left
#             y_draw = y_axis - text_h / 2 - text_top
#         else:
#             x_draw = x_axis - text_left
#             y_draw = y_axis - text_top

#         draw.text((x_draw, y_draw), name, font=font, fill=text_color)

#         # Save image to in-memory buffer
#         buffer = BytesIO()
#         image.save(buffer, format="PNG")
#         buffer.seek(0)

#         # Upload directly from memory
#         result = cloudinary.uploader.upload(buffer, public_id=name)
#         return_value.append(
#             {
#                 "image_urls": result.get("secure_url"),
#             }
#         )

#     return Response({"return_value": return_value})


@api_view(["POST"])
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


# @api_view(["GET"])
# def get_preset(request, public_id):
#     try:
#         preset = CertificatePreset.objects.get(public_id=public_id)
#         return Response(
#             {
#                 "selectedFont": preset.selected_font,
#                 "fontSize": preset.font_size,
#                 "fontWeight": preset.font_weight,
#                 "textColor": preset.text_color,
#                 "textPosition": {"x": preset.text_x, "y": preset.text_y},
#                 "anchorMode": preset.anchor_mode,
#             },
#             status=200,
#         )
#     except CertificatePreset.DoesNotExist:
#         return Response({"error": "Preset not found"}, status=404)


def parse_json_field(value, default=None):
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    return json.loads(value)


@api_view(["POST"])
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


def process_image(image, fields):
    draw = ImageDraw.Draw(image)

    for field in fields:
        text = field.get("text", "")
        font_name = field.get("font", "Bickham Script Pro Regular")
        font_size = int(field.get("fontSize", 100))
        color = field.get("color", "#000000")
        x_axis = int(field.get("x", 0))
        y_axis = int(field.get("y", 0))
        anchor_mode = field.get("anchorMode", "center")

        font_path = f"fonts/{font_name}.ttf"
        try:
            font = ImageFont.truetype(font_path, font_size)
        except Exception:
            # Fallback to default if font fails
            # In a real app, maybe log this or have a specific backup font
            # For now try to continue or raise?
            # Safe bet: fail gracefully or assume font exists as per frontend
            pass

        # Calculate the literal bounding box of the text pixels
        bbox = draw.textbbox((0, 0), text, font=font)  # type: ignore
        text_left, text_top, text_right, text_bottom = bbox
        text_w = text_right - text_left
        text_h = text_bottom - text_top

        # Shared Vertical Logic: The Y-axis is the absolute center of the text
        y_draw = y_axis - text_h / 2 - text_top

        # Horizontal Logic
        if anchor_mode == "center":
            x_draw = x_axis - text_w / 2 - text_left
        else:
            x_draw = x_axis - text_left

        draw.text((x_draw, y_draw), text, font=font, fill=color)  # type: ignore

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer
