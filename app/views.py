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
    #         "font_size": int(request.data.get("fontSize", 48)),
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
    name = data.get("participantName")
    anchor_mode = data.get("anchorMode", "center")
    in_editor = data.get("inEditor") == "true"
    text_position = parse_json_field(data.get("textPosition"), {})
    selected_font = data.get("selectedFont")
    font_size = int(data.get("fontSize"))
    text_color = data.get("textColor")
    font_path = f"fonts/{selected_font}.ttf"

    font = ImageFont.truetype(font_path, font_size)

    y_axis = int(text_position["y"])  # type: ignore
    x_axis = int(text_position["x"])  # type: ignore

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

        buffer = process_image(
            image, name, font, anchor_mode, x_axis, y_axis, text_color
        )
        image_data = buffer.getvalue()
        buffer.close()

        return HttpResponse(
            image_data,
            content_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{name}.png"'},
        )
    else:
        template_file = request.FILES.get("template")
        if not template_file:
            return Response({"error": "Template is required"}, status=400)

        # Load image directly from uploaded file
        image = Image.open(template_file).convert("RGBA")

        buffer = process_image(
            image, name, font, anchor_mode, x_axis, y_axis, text_color
        )
        image_data = buffer.getvalue()
        buffer.close()

        return HttpResponse(
            image_data,
            content_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{name}.png"'},
        )


def process_image(image, name, font, anchor_mode, x_axis, y_axis, text_color):
    draw = ImageDraw.Draw(image)

    if anchor_mode == "center":
        bbox = draw.textbbox((0, 0), name, font=font)
        text_left, text_top, text_right, text_bottom = bbox
        text_w = text_right - text_left
        text_h = text_bottom - text_top

        x_draw = x_axis - text_w / 2 - text_left
        y_draw = y_axis - text_h / 2 - text_top
        draw.text((x_draw, y_draw), name, font=font, fill=text_color)
    else:
        draw.text((x_axis, y_axis - 10), name, font=font, fill=text_color, anchor="lt")

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer
