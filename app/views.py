import os
import shutil
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from dotenv import load_dotenv
from mailersend import EmailBuilder, MailerSendClient
from PIL import Image, ImageDraw, ImageFont
from rest_framework.decorators import api_view
from rest_framework.response import Response

load_dotenv()

MAILERSEND_API_KEY = os.getenv("MAILERSEND_API_KEY")


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


ms = MailerSendClient(api_key=MAILERSEND_API_KEY)


@api_view(["POST"])
def generate(request):
    data = request.data
    file_name = data.get("fileName")
    recipients = data.get("recipients")
    anchor_mode = data.get("anchorMode", "center")

    cert_template = Image.open(f"uploads/{file_name}")
    y_axis = data.get("textPosition")["y"]
    x_axis = data.get("textPosition")["x"]
    selected_font = data.get("selectedFont")
    font_size = int(data.get("fontSize"))
    text_color = data.get("textColor")

    # if os.path.exists("certificates"):
    #     shutil.rmtree("certificates")
    # os.makedirs("certificates", exist_ok=True)

    font_path = f"fonts/{selected_font}.ttf"
    font = ImageFont.truetype(font_path, font_size)

    for recipient in recipients:
        name = recipient["name"]
        recipient_email = recipient["email"]

        img = cert_template.copy()
        draw = ImageDraw.Draw(img)

        # Get the full bounding box
        bbox = draw.textbbox((0, 0), name, font=font)
        text_left, text_top, text_right, text_bottom = bbox
        text_w = text_right - text_left
        text_h = text_bottom - text_top

        if anchor_mode == "center":
            # Center the text, accounting for bbox offset
            x_draw = x_axis - text_w / 2 - text_left
            y_draw = y_axis - text_h / 2 - text_top
        else:
            # Top-left anchor, accounting for bbox offset
            x_draw = x_axis - text_left
            y_draw = y_axis - text_top

        draw.text(
            (x_draw, y_draw),
            name,
            font=font,
            fill=text_color,
        )

        output_path = f"certificates/{name}.png"
        # img.save(output_path)

        email = (
            EmailBuilder()
            .from_email("no-reply@ashongdev.me", "Cert Generator")
            .to_many([{"email": recipient_email, "name": name}])
            .subject("Here's your generated certificate.")
            .html("<h1>Hello World!</h1>")
            .attach_file(output_path)
            .build()
        )

        ms.emails.send(email)

    return Response({"response": "Certificates generated successfully"})
