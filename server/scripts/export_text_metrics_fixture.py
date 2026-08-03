"""Regenerate client/src/lib/__fixtures__/pillow-text-metrics.json — the
ground-truth half of the frontend/backend text-rendering parity check.

Why this exists: the live editor canvas renders text with HarfBuzz
(client/src/lib/textShaping.ts) to match what Pillow actually draws
(server/app/util.py's process_image). The two are independent
implementations of "the same" text layout, and have drifted apart for real,
non-obvious reasons before (an ascent/descent metric-table mismatch, then a
16% advance-width error from HarfBuzz applying GSUB ligatures/GPOS kerning
that Pillow's raqm-less layout never does). This fixture pins Pillow's
numbers for a fixed (font, text) matrix so client/scripts/verify-text-metrics.mjs
can catch the next drift immediately instead of it surfacing as a confusing
"the editor looks a bit off" report.

Run this whenever a font in server/fonts/ changes, then run
verify-text-metrics.mjs from client/. Both scripts should also be re-run
(numbers checked, not just "does it exit 0") any time textShaping.ts's
shaping logic changes — see that file's PILLOW_INCOMPATIBLE_FEATURE_TAGS
comment.
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REFERENCE_SIZE = 1000

FONTS = [
    "Bickham Script Pro Regular",
    "Great Vibes",
    "Alex Brush",
    "Snell Roundhand",
    "Kunstler Script",
    "Montserrat",
    "Inter",
    "Georgia",
    "Times New Roman",
    "Garamond",
    "Cinzel",
    "Playfair Display",
]

TEXTS = {
    "lowercase": "hello world",
    "uppercase": "HELLO WORLD",
    "mixed_ascender_descender": "John Micheal Doe",
    "accented": "Jose Garcia Munoz",
    "punctuation_only": "------------------",
    "descenders_only": "gjpqy",
    "ascenders_only": "bdfhkl",
    "no_ascender_descender": "aceimnorsuvwxz",
}

OUTPUT_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "client"
    / "src"
    / "lib"
    / "__fixtures__"
    / "pillow-text-metrics.json"
)


def main() -> None:
    fonts_dir = Path(__file__).resolve().parent.parent / "fonts"
    draw = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    results = []

    for font_name in FONTS:
        font = ImageFont.truetype(str(fonts_dir / f"{font_name}.ttf"), REFERENCE_SIZE)
        ascent, descent = font.getmetrics()
        for label, text in TEXTS.items():
            results.append(
                {
                    "font": font_name,
                    "label": label,
                    "text": text,
                    "ascent": ascent,
                    "descent": descent,
                    "advanceWidth": draw.textlength(text, font=font),
                }
            )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"referenceSize": REFERENCE_SIZE, "results": results}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(results)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
