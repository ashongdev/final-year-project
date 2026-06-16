import json
import os
import re
from io import BytesIO
from pathlib import Path

from PIL import ImageDraw, ImageFont

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"
ALLOWED_FONT_RE = re.compile(r"^[A-Za-z0-9 .\-_]+$")
MAX_TEXT_LENGTH = 200
MAX_FONT_SIZE = 600
MIN_FONT_SIZE = 6
DEFAULT_FONT = "Bickham Script Pro Regular"


def _safe_font_path(font_name: str) -> Path:
    """Resolve a font name to an absolute path, rejecting traversal attempts."""
    if not font_name or not ALLOWED_FONT_RE.match(font_name):
        raise ValueError(f"Invalid font name: {font_name!r}")
    path = (FONTS_DIR / f"{font_name}.ttf").resolve()
    if not path.is_relative_to(FONTS_DIR):
        raise ValueError("Font path escapes fonts directory")
    if not path.exists():
        raise FileNotFoundError(f"Font file not found: {font_name}")
    return path


def _load_font(font_name: str, font_size: int) -> ImageFont.FreeTypeFont:
    """Load a truetype font, falling back to the default if not found."""
    font_size = max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, font_size))
    try:
        path = _safe_font_path(font_name)
        return ImageFont.truetype(str(path), font_size)
    except (ValueError, FileNotFoundError, OSError):
        try:
            fallback = _safe_font_path(DEFAULT_FONT)
            return ImageFont.truetype(str(fallback), font_size)
        except Exception:
            return ImageFont.load_default()


def process_image(image, fields: list) -> BytesIO:
    """Draw all text fields onto the image and return a PNG buffer."""
    draw = ImageDraw.Draw(image)

    for field in fields:
        text = str(field.get("text", ""))[:MAX_TEXT_LENGTH]
        if not text:
            continue

        font_name = field.get("font", DEFAULT_FONT)
        font_size = int(field.get("fontSize", 100))
        color = field.get("color", "#000000")
        x_axis = int(field.get("x", 0))
        y_axis = int(field.get("y", 0))
        anchor_mode = field.get("anchorMode", "center")

        font = _load_font(font_name, font_size)

        bbox = draw.textbbox((0, 0), text, font=font)
        text_left, text_top, text_right, text_bottom = bbox
        text_w = text_right - text_left
        text_h = text_bottom - text_top

        # Y: absolute center of text block
        y_draw = y_axis - text_h / 2 - text_top

        if anchor_mode == "center":
            x_draw = x_axis - text_w / 2 - text_left
        else:
            x_draw = x_axis - text_left

        draw.text((x_draw, y_draw), text, font=font, fill=color)

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def parse_json_field(value, default=None):
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default
