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
    file_path = default_storage.path(file_name)
    print("Saved at:", file_path)

    return Response({"fileName": unique_name})


@api_view(["POST"])
def generate(request):
    data = request.data
    file_name = data.get("fileName")
    print(file_name)
    cert_template = Image.open(f"uploads/{file_name}")

    text_position = data.get("textPosition")

    x_axis = text_position["x"]
    y_axis = text_position["y"]
    selected_font = data.get("selectedFont")
    font_size = data.get("fontSize")
    # font_weight = data.get("fontWeight")
    text_color = data.get("textColor")

    if os.path.exists("certificates"):
        shutil.rmtree("certificates")
    else:
        os.makedirs("certificates", exist_ok=True)

    font_size = int(font_size)

    font_path = f"{selected_font}.ttf"
    font = ImageFont.truetype(font_path, font_size)
    print(font_size)

    img = cert_template.copy()
    draw = ImageDraw.Draw(img)

    draw.text((x_axis + 40, y_axis + 40), "John Doe", fill=text_color, font=font)
    os.makedirs("certificates/", exist_ok=True)

    file_name = file_name.split(".")[0]
    output_path = f"certificates/{file_name}.png"
    img.save(output_path)

    return Response({"response": "Hello World"})
