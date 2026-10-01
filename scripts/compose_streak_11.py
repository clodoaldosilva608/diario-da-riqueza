#!/usr/bin/env python3
"""Compõe a grade de consistência (dias 1–30) sobre o fundo abstrato da 11.

Grade 5x6 desenhada por código: números Playfair Display dourados em ordem
exata 1-30, dia 30 destacado com círculo dourado. Zero risco de números
repetidos/pulados da IA.
"""
from PIL import Image, ImageDraw, ImageFont

BASE = "/home/z/my-project"
IMG = f"{BASE}/download/divulgacao/11_streak.png"
FONT = f"{BASE}/assets/fonts/PlayfairDisplay.ttf"

GOLD = (212, 175, 55)        # --primary
GOLD_DIM = (212, 175, 55, 90)
BLACK = (12, 12, 14)

img = Image.open(IMG).convert("RGB")
draw = ImageDraw.Draw(img, "RGBA")
W, H = img.size  # 1024x1024

font = ImageFont.truetype(FONT, 64)
try:
    font.set_variation_by_axes([600])
except Exception:
    pass

# grade 6 colunas x 5 linhas, centralizada
cols, rows = 6, 5
cell_w, cell_h = 128, 122
grid_w, grid_h = cols * cell_w, rows * cell_h
x0 = (W - grid_w) // 2
y0 = (H - grid_h) // 2 + 14

# linhas da grade
for c in range(cols + 1):
    x = x0 + c * cell_w
    draw.line([(x, y0), (x, y0 + grid_h)], fill=GOLD_DIM, width=2)
for r in range(rows + 1):
    y = y0 + r * cell_h
    draw.line([(x0, y), (x0 + grid_w, y)], fill=GOLD_DIM, width=2)

# números 1-30
for n in range(1, 31):
    r, c = divmod(n - 1, cols)
    cx = x0 + c * cell_w + cell_w // 2
    cy = y0 + r * cell_h + cell_h // 2
    label = str(n)
    bbox = draw.textbbox((0, 0), label, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    if n == 30:  # dia da chama: destaque
        rr = 46
        draw.ellipse(
            [cx - rr, cy - rr, cx + rr, cy + rr],
            fill=GOLD + (255,), outline=(255, 235, 170, 255), width=3,
        )
        draw.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), label,
                  font=font, fill=BLACK)
    else:
        draw.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), label,
                  font=font, fill=GOLD)

img.save(IMG, optimize=True)
print(f"OK: grade 1-30 composta em {IMG}")
