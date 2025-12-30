import os
from io import BytesIO

import cloudinary
import cloudinary.uploader
import requests
from django.http import HttpResponse
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
from rest_framework.decorators import api_view
from rest_framework.response import Response

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
def generate(request):
    data = request.data
    public_id = data.get("certificateId")
    name = data.get("participantName")
    anchor_mode = data.get("anchorMode", "center")

    url = f"https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/image/upload/{public_id}.png"

    response = requests.get(url)

    image = Image.open(BytesIO(response.content)).convert("RGBA")

    y_axis = data.get("textPosition")["y"]
    x_axis = data.get("textPosition")["x"]
    selected_font = data.get("selectedFont")
    font_size = int(data.get("fontSize"))
    text_color = data.get("textColor")

    font_path = f"fonts/{selected_font}.ttf"
    font = ImageFont.truetype(font_path, font_size)

    # img = cert_template.copy()
    draw = ImageDraw.Draw(image)

    bbox = draw.textbbox((0, 0), name, font=font)
    text_left, text_top, text_right, text_bottom = bbox
    text_w = text_right - text_left
    text_h = text_bottom - text_top

    if anchor_mode == "center":
        x_draw = x_axis - text_w / 2 - text_left
        y_draw = y_axis - text_h / 2 - text_top
    else:
        x_draw = x_axis - text_left
        y_draw = y_axis - text_top

    draw.text((x_draw, y_draw), name, font=font, fill=text_color)

    # Save image to in-memory buffer
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    return HttpResponse(
        buffer,
        content_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{name}.png"'},
    )
