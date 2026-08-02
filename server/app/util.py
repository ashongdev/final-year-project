import json
import logging
import os
import re
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("app")

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"
ALLOWED_FONT_RE = re.compile(r"^[A-Za-z0-9 .\-_]+$")
MAX_TEXT_LENGTH = 200
MAX_FONT_SIZE = 600
MIN_FONT_SIZE = 6
DEFAULT_FONT = "Bickham Script Pro Regular"

# Signature images (organizer-supplied) are pasted at whatever size the field
# specifies, clamped to a sane range so a malformed width/height can't blow
# up memory or produce a nonsensical certificate.
MIN_SIGNATURE_DIMENSION = 10
MAX_SIGNATURE_DIMENSION = 1000


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


def _fetch_signature_image(url: str) -> "Image.Image | None":
    """Fetch and decode a signature image, returning None on any failure —
    a broken signature URL shouldn't fail the whole certificate render."""
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content)).convert("RGBA")
    except Exception as exc:
        logger.warning("Failed to fetch signature image %s: %s", url, exc)
        return None


def _draw_image_field(image, field: dict, signature_cache: dict) -> None:
    """Paste a signature (or other image field) onto the certificate."""
    image_url = field["imageUrl"]

    if image_url not in signature_cache:
        signature_cache[image_url] = _fetch_signature_image(image_url)
    sig_image = signature_cache[image_url]
    if sig_image is None:
        return

    width = max(
        MIN_SIGNATURE_DIMENSION,
        min(MAX_SIGNATURE_DIMENSION, int(field.get("width", 200))),
    )
    height = max(
        MIN_SIGNATURE_DIMENSION,
        min(MAX_SIGNATURE_DIMENSION, int(field.get("height", 100))),
    )
    resized = sig_image.resize((width, height))

    x_axis = int(field.get("x", 0))
    y_axis = int(field.get("y", 0))
    anchor_mode = field.get("anchorMode", "center")

    paste_y = int(y_axis - height / 2)
    paste_x = int(x_axis - width / 2) if anchor_mode == "center" else int(x_axis)

    image.paste(resized, (paste_x, paste_y), resized)


def process_image(image, fields: list, signature_cache: dict | None = None) -> BytesIO:
    """Draw all text and image (signature) fields onto the image and return
    a PNG buffer. Pass a shared signature_cache across repeated calls (e.g.
    batch generation) so the same signature isn't re-fetched for every
    recipient."""
    draw = ImageDraw.Draw(image)
    cache = signature_cache if signature_cache is not None else {}

    for field in fields:
        if field.get("imageUrl"):
            _draw_image_field(image, field, cache)
            continue

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

        # Anchor on advance width (horizontal) and ascent/descent metrics
        # (vertical) rather than the glyphs' tight ink bbox — this matches
        # how the editor preview lays text out in CSS (line-height-based
        # centering), whereas bbox-based centering drifts for script fonts
        # whose ink sits well inside the font's own metrics envelope.
        anchor = "mm" if anchor_mode == "center" else "lm"
        draw.text((x_axis, y_axis), text, font=font, fill=color, anchor=anchor)

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
