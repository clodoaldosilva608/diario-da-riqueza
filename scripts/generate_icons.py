#!/usr/bin/env python3
"""Gera ícones premium do PWA Diário da Riqueza (preto profundo + dourado)."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/z/my-project/public/icons"
os.makedirs(OUT, exist_ok=True)

BLACK = (10, 10, 12)
GOLD = (212, 175, 55)
GOLD_LIGHT = (245, 208, 97)
EMERALD = (16, 185, 129)
WHITE = (250, 250, 250)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf",
]
font_path = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fundo: preto profundo com borda dourada sutil
    pad = int(size * 0.10) if maskable else int(size * 0.04)
    box = [pad, pad, size - pad, size - pad]
    radius = int(size * 0.18)
    d.rounded_rectangle(box, radius=radius, fill=(*BLACK, 255), outline=(*GOLD, 255), width=max(2, size // 64))

    cx, cy = size // 2, size // 2

    # Monograma "DR" serifado dourado
    fsize = int(size * (0.42 if maskable else 0.46))
    font = ImageFont.truetype(font_path, fsize) if font_path else ImageFont.load_default()
    text = "DR"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]
    d.text((tx, ty), text, font=font, fill=(*GOLD_LIGHT, 255))

    # Barra esmeralda inferior (crescimento)
    bar_w = int(size * (0.30 if maskable else 0.34))
    bar_h = max(3, size // 36)
    d.rounded_rectangle(
        [cx - bar_w // 2, size - pad - int(size * 0.14), cx + bar_w // 2, size - pad - int(size * 0.14) + bar_h],
        radius=bar_h, fill=(*EMERALD, 255),
    )
    return img


def make_favicon(size: int) -> Image.Image:
    return make_icon(size)


# Ícones principais
make_icon(512).save(f"{OUT}/icon-512.png")
make_icon(192).save(f"{OUT}/icon-192.png")
make_icon(512, maskable=True).save(f"{OUT}/icon-maskable-512.png")
make_icon(180).save(f"{OUT}/apple-touch-icon.png")

# Favicon dentro de src/app (Next.js auto)
fav = make_favicon(64)
fav.save("/home/z/my-project/src/app/icon.png")

print("Ícones gerados com sucesso:")
for f in sorted(os.listdir(OUT)):
    print(" -", f)
print(" - src/app/icon.png")
