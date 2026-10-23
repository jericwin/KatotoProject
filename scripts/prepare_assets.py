"""Builds optimized web assets from the original Katoto files in the project root.

Run from the project root:  python scripts/prepare_assets.py
Requires Pillow, numpy and pypdf.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SRC_LOGO = ROOT / "logo.jpg"
SRC_PILLARS = ROOT / "e779ce4b-7349-4036-bc3b-d89aa98037d4.jpeg"
SRC_PROFILE = ROOT / "Katoto Project Profile 2026 .pdf"

ASSETS = ROOT / "src" / "assets"
PUBLIC = ROOT / "public"
ASSETS.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


def white_to_alpha(img: Image.Image) -> Image.Image:
    """Turn the white JPEG background transparent, with a soft edge."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    whiteness = rgb.min(axis=2)
    alpha = np.clip((255 - whiteness) * (255 / 40), 0, 255).astype(np.uint8)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(out, "RGBA")


def bbox_of_alpha(img: Image.Image, pad: int = 8):
    a = np.asarray(img.split()[-1])
    ys, xs = np.where(a > 10)
    return (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
            min(xs.max() + pad, img.width), min(ys.max() + pad, img.height))


# --- Logo -------------------------------------------------------------------
logo = white_to_alpha(Image.open(SRC_LOGO))
logo_full = logo.crop(bbox_of_alpha(logo))
logo_full.thumbnail((900, 900), Image.LANCZOS)
logo_full.save(ASSETS / "katoto-logo.webp", quality=90, method=6)
logo_full.save(ASSETS / "katoto-logo.png", optimize=True)

# The five figures + Paete seal sit above row ~976 of the 2000px source.
mark = logo.crop((0, 0, logo.width, 978))
mark = mark.crop(bbox_of_alpha(mark, pad=4))
mark_web = mark.copy()
mark_web.thumbnail((360, 360), Image.LANCZOS)
mark_web.save(ASSETS / "katoto-mark.webp", quality=92, method=6)

# Favicons: mark on a square transparent canvas.
side = max(mark.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
for size, name in [(32, "favicon-32.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
    square.resize((size, size), Image.LANCZOS).save(PUBLIC / name, optimize=True)
# Apple touch icon needs an opaque background.
touch = Image.new("RGBA", (side + 80, side + 80), (251, 247, 239, 255))
touch.paste(mark, (40 + (side - mark.width) // 2, 40 + (side - mark.height) // 2), mark)
touch.convert("RGB").resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png", optimize=True)

# --- Pillar photos (six circles from the "6 Pillars" graphic) ----------------
pillars_src = Image.open(SRC_PILLARS).convert("RGB")
centers = {
    "education": (200, 1005),
    "health": (425, 1005),
    "youth-empowerment": (650, 1002),
    "culture-arts": (870, 1005),
    "environment": (1100, 1005),
    "good-governance": (1325, 1005),
}
R = 92  # inside the orange ring
for name, (x, y) in centers.items():
    crop = pillars_src.crop((x - R, y - R, x + R, y + R))
    mask = Image.new("L", (R * 8, R * 8), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, R * 8 - 1, R * 8 - 1), fill=255)
    mask = mask.resize(crop.size, Image.LANCZOS)
    crop.putalpha(mask)
    crop.save(ASSETS / f"pillar-{name}.webp", quality=88, method=6)

# --- Certificate of accreditation (embedded image, page 11 of the profile) ---
reader = PdfReader(str(SRC_PROFILE))
cert = max(reader.pages[10].images, key=lambda i: i.image.width * i.image.height).image.convert("RGB")
cert_lg = cert.copy()
cert_lg.thumbnail((1200, 1600), Image.LANCZOS)
cert_lg.save(ASSETS / "yda-accreditation-2026.webp", quality=82, method=6)
cert_sm = cert.copy()
cert_sm.thumbnail((520, 700), Image.LANCZOS)
cert_sm.save(ASSETS / "yda-accreditation-2026-sm.webp", quality=82, method=6)

# --- Original "6 Pillars" poster for the gallery ------------------------------
poster = pillars_src.copy()
poster.thumbnail((1400, 1400), Image.LANCZOS)
poster.save(ASSETS / "six-pillars-poster.webp", quality=82, method=6)

# --- Social share image (1200x630) -------------------------------------------
og = Image.new("RGB", (1200, 630), (251, 247, 239))
og_logo = logo_full.copy()
og_logo.thumbnail((640, 420), Image.LANCZOS)
og.paste(og_logo, ((1200 - og_logo.width) // 2, 70), og_logo)
strip_y = 70 + og_logo.height + 40
size = 120
gap = 24
total = size * 6 + gap * 5
for i, name in enumerate(centers):
    c = Image.open(ASSETS / f"pillar-{name}.webp").resize((size, size), Image.LANCZOS)
    og.paste(c, ((1200 - total) // 2 + i * (size + gap), min(strip_y, 630 - size - 30)), c)
og.save(PUBLIC / "og-image.jpg", quality=85, optimize=True)

print("Assets written to", ASSETS, "and", PUBLIC)
