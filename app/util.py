from PIL import ImageDraw, ImageFont
from io import BytesIO
import json

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




def parse_json_field(value, default=None):
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    return json.loads(value)

