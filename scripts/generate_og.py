#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera a imagem Open Graph (1200x630) do Diário da Riqueza —
fundo preto premium + brilho dourado radial + tipografia serifada dourada.

Saída: src/app/opengraph-image.png (+ alt.txt)
Roda com: python3 scripts/generate_og.py
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

W, H = 1200, 630
BG = (9, 9, 11)          # #09090b
GOLD = (212, 175, 55)    # #d4af37
GOLD_LIGHT = (245, 208, 97)
GOLD_DARK = (176, 141, 40)
TXT = (244, 244, 245)
MUTED = (156, 156, 168)

OUT_DIR = "/home/z/my-project/src/app"
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
]
SANS_CANDIDATES = [
    "/usr/share/fonts/truetype/english/Carlito-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
SANS_BOLD_CANDIDATES = [
    "/usr/share/fonts/truetype/english/Carlito-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def pick(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    raise SystemExit("Nenhuma fonte encontrada: " + ", ".join(paths))


def radial_glow(size, color, radius_scale=0.75):
    """Imagem RGBA com um brilho radial suave centralizado no topo."""
    w, h = size
    glow = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(glow)
    cx, cy = w // 2, -int(h * 0.25)
    r = int(min(w, h) * radius_scale)
    steps = 60
    for i in range(steps, 0, -1):
        rad = int(r * i / steps)
        alpha = int(38 * (1 - i / steps) ** 1.6)  # bem sutil
        d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=alpha)
    return glow.filter(ImageFilter.GaussianBlur(6))


def gradient_text(text, font, colors):
    """Renderiza texto com gradiente vertical e retorna RGBA."""
    # Mede o texto
    tmp = Image.new("RGBA", (10, 10))
    bbox = ImageDraw.Draw(tmp).textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 4
    img = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))

    # Máscara do texto
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).text((pad - bbox[0], pad - bbox[1]), text, font=font, fill=255)

    # Gradiente vertical
    grad = Image.new("RGBA", img.size)
    gd = ImageDraw.Draw(grad)
    c0, c1, c2 = colors
    for y in range(img.size[1]):
        t = y / max(1, img.size[1] - 1)
        if t < 0.5:
            k = t / 0.5
            col = tuple(int(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
        else:
            k = (t - 0.5) / 0.5
            col = tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))
        gd.line([(0, y), (img.size[0], y)], fill=col + (255,))

    img.paste(grad, (0, 0), mask)
    return img


def rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def main():
    serif_path = pick(FONT_CANDIDATES)
    sans_path = pick(SANS_CANDIDATES)
    sans_bold_path = pick(SANS_BOLD_CANDIDATES)

    f_title = ImageFont.truetype(serif_path, 104)
    f_sub = ImageFont.truetype(sans_path, 30)
    f_badge = ImageFont.truetype(sans_bold_path, 22)
    f_url = ImageFont.truetype(sans_bold_path, 24)

    img = Image.new("RGB", (W, H), BG)

    # Brilho dourado radial (topo) — bem discreto
    glow = radial_glow((W, H), GOLD)
    gold_layer = Image.new("RGB", (W, H), GOLD)
    img = Image.composite(gold_layer, img, glow)

    d = ImageDraw.Draw(img)

    # Moldura interna fina dourada
    m = 28
    rounded_rect(d, [m, m, W - m, H - m], radius=26, outline=(212, 175, 55, 90), width=2)

    # Divider dourado central (sutil, sob o subtítulo)
    def center_text(text, font, y, fill):
        bbox = d.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2 - bbox[0], y), text, font=font, fill=fill)
        return tw

    # Badge superior
    badge_txt = "ORGANIZAÇÃO  •  DISCIPLINA  •  CONSISTÊNCIA"
    bb = d.textbbox((0, 0), badge_txt, font=f_badge)
    btw, bth = bb[2] - bb[0], bb[3] - bb[1]
    pad_x, pad_y = 26, 12
    bx0, by0 = (W - btw) / 2 - pad_x, 96
    bx1, by1 = (W + btw) / 2 + pad_x, 96 + bth + pad_y * 2
    rounded_rect(d, [bx0, by0, bx1, by1], radius=999, outline=(212, 175, 55), width=2)
    d.text(((W - btw) / 2 - bb[0], by0 + pad_y - bb[1]), badge_txt, font=f_badge, fill=GOLD)

    # Título com gradiente dourado
    title = gradient_text("Diário da Riqueza", f_title, [GOLD_LIGHT, GOLD, GOLD_DARK])
    img.paste(title, ((W - title.size[0]) // 2, 210), title)
    d = ImageDraw.Draw(img)

    # Subtítulo em duas linhas
    center_text(
        "Transforme seus objetivos em uma prática diária:",
        f_sub, 402, TXT,
    )
    center_text(
        "metas, orçamento, estudos e hábitos — gratuito e offline.",
        f_sub, 446, MUTED,
    )

    # Divider dourado
    dw = 220
    dy = 524
    for x in range(W // 2 - dw // 2, W // 2 + dw // 2):
        t = abs(x - W // 2) / (dw / 2)
        alpha = int(140 * (1 - t))
        d.line([(x, dy), (x, dy)], fill=(min(212, alpha + 60), min(175, alpha + 40), min(55, alpha)))

    # URL no rodapé
    center_text("diario-da-riqueza.vercel.app", f_url, 548, (196, 168, 90))

    out = os.path.join(OUT_DIR, "opengraph-image.png")
    img.save(out, "PNG", optimize=True)
    with open(os.path.join(OUT_DIR, "opengraph-image.alt.txt"), "w", encoding="utf-8") as fh:
        fh.write(
            "Logotipo do Diário da Riqueza sobre fundo preto com detalhes dourados, "
            "acompanhado da frase 'Transforme seus objetivos em uma prática diária'."
        )
    print("OK:", out, img.size)


if __name__ == "__main__":
    main()
