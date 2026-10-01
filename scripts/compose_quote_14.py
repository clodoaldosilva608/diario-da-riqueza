#!/usr/bin/env python3
"""Compõe o texto da citação sobre o card 14 (fundo gerado por IA sem texto).

Texto central em branco (Playfair Display, a display da marca) + assinatura
"Diário da Riqueza" em dourado. Zero risco de erro tipográfico da IA.
"""
from PIL import Image, ImageDraw, ImageFont

BASE = "/home/z/my-project"
IMG = f"{BASE}/download/divulgacao/14_citacao.png"
FONT = f"{BASE}/assets/fonts/PlayfairDisplay.ttf"

WHITE = (244, 244, 245)   # --foreground
GOLD = (212, 175, 55)     # --primary

lines = ["Riqueza se constrói", "na disciplina", "de cada dia."]

img = Image.open(IMG).convert("RGB")
draw = ImageDraw.Draw(img)
W, H = img.size  # 1024x1024

def load(size, variation):
    font = ImageFont.truetype(FONT, size)
    try:
        font.set_variation_by_axes([variation])
    except Exception as e:
        print(f"(variação {variation} indisponível: {e})")
    return font

quote_font = load(74, 560)     # semibold
sign_font = load(30, 500)

# medir linhas
line_h = int(74 * 1.42)
total_h = line_h * len(lines)
top = int(H * 0.30)            # centro visual entre as aspas
for i, line in enumerate(lines):
    bbox = draw.textbbox((0, 0), line, font=quote_font)
    w = bbox[2] - bbox[0]
    x = (W - w) // 2 - bbox[0]
    y = top + i * line_h - bbox[1]
    draw.text((x, y), line, font=quote_font, fill=WHITE)

# assinatura dourada abaixo do bloco
sign = "— Diário da Riqueza"
bbox = draw.textbbox((0, 0), sign, font=sign_font)
w = bbox[2] - bbox[0]
x = (W - w) // 2 - bbox[0]
y = top + total_h + 34 - bbox[1]
draw.text((x, y), sign, font=sign_font, fill=GOLD)

img.save(IMG, optimize=True)
print(f"OK: citação composta em {IMG} ({img.size[0]}x{img.size[1]})")
