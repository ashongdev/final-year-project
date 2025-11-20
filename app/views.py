import os
import shutil
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageDraw, ImageFont
from rest_framework.decorators import api_view
from rest_framework.response import Response


# Create your views here.
@api_view(["POST"])
def upload(request):
    if os.path.exists("uploads"):
        shutil.rmtree("uploads")
    else:
        os.makedirs("uploads", exist_ok=True)

    file = request.FILES.get("template")
    ext = file.name.split(".")[-1]
    unique_name = f"{uuid.uuid4()}.{ext}"
    file_name = default_storage.save(f"uploads/{unique_name}", ContentFile(file.read()))
    default_storage.path(file_name)

    return Response({"fileName": unique_name})


@api_view(["POST"])
def generate(request):
    data = request.data
    file_name = data.get("fileName")
    recipients = data.get("recipients")

    cert_template = Image.open(f"uploads/{file_name}")
    y_axis = data.get("textPosition")["y"]
    x_axis = data.get("textPosition")["x"]
    selected_font = data.get("selectedFont")
    font_size = int(data.get("fontSize"))
    text_color = data.get("textColor")

    if os.path.exists("certificates"):
        shutil.rmtree("certificates")
    os.makedirs("certificates", exist_ok=True)

    font_path = f"fonts/{selected_font}.ttf"
    font = ImageFont.truetype(font_path, font_size)

    for recipient in recipients:
        name = recipient["name"]

        img = cert_template.copy()
        draw = ImageDraw.Draw(img)

        text_w, text_h = draw.textbbox((0, 0), name, font=font)[2:]
        x_center = x_axis
        y_center = y_axis

        draw.text(
            (x_center - text_w / 2, y_center - text_h / 2),
            name,
            font=font,
            fill=text_color,
        )

        output_path = f"certificates/{name}.png"
        img.save(output_path)

    return Response({"response": "Hello World"})
