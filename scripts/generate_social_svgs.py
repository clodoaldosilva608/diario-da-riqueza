# -*- coding: utf-8 -*-
"""
Gera 20 artes de divulgação do Diário da Riqueza (SVG 1080x1080 -> PNG).
Sistema de design: obsidiana #09090B + dourado #D4AF37, Playfair Display (display)
+ DejaVu Sans (corpo). Ícones vetoriais desenhados à mão, texto com fit automático.
Saídas:
  SVG -> /home/z/my-project/marketing/images/   (fonte editável)
  PNG -> /home/z/my-project/download/divulgacao/ (entregável)
"""
import os
import cairosvg
from PIL import ImageFont

W = H = 1080
BASE = "/home/z/my-project"
SVG_DIR = f"{BASE}/marketing/images"
PNG_DIR = f"{BASE}/download/divulgacao"
os.makedirs(SVG_DIR, exist_ok=True)
os.makedirs(PNG_DIR, exist_ok=True)

# ---------- paleta ----------
BG = "#09090B"
SURFACE = "#141417"
BORDER = "#2C2C33"
GOLD = "#D4AF37"
GOLD_L = "#F5D576"
GOLD_D = "#B8912A"
TXT = "#FAFAFA"
TXT2 = "#B6B6BE"
TXT3 = "#8B8B94"

PF = "/home/z/.local/share/fonts/PlayfairDisplay.ttf"
DVR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
DVB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

_fc = {}
def _pil(key, size):
    k = (key, size)
    if k not in _fc:
        path = {"display": PF, "body": DVR, "bodyb": DVB}[key]
        f = ImageFont.truetype(path, int(size))
        if key == "display":
            try:
                f.set_variation_by_name("Bold")
            except Exception:
                pass
        _fc[k] = f
    return _fc[k]

def text_w(s, font="body", size=30, ls=0):
    return _pil(font, size).getlength(s) + ls * max(0, len(s) - 1)

def fit_size(s, font, size, max_w, ls=0, min_size=16):
    while size > min_size and text_w(s, font, size, ls) > max_w:
        size -= 1
    return size

def wrap(s, font, size, max_w, max_lines=3):
    words, lines, cur = s.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if text_w(t, font, size) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:  # encolhe e tenta de novo
        return wrap(s, font, size - 2, max_w, max_lines)
    return lines

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

# ---------- blocos SVG ----------
def T(x, y, s, font="body", size=30, fill=TXT, weight=None, anchor="middle",
      ls=None, opacity=None):
    fam = "Playfair Display" if font == "display" else "DejaVu Sans"
    a = [f'x="{x}" y="{y}"', f'font-family="{fam}"', f'font-size="{size}"',
         f'fill="{fill}"', f'text-anchor="{anchor}"']
    if font == "display" or weight == "bold":
        a.append('font-weight="bold"')
    if ls is not None:
        a.append(f'letter-spacing="{ls}"')
    if opacity is not None:
        a.append(f'opacity="{opacity}"')
    return f'<text {" ".join(a)}>{esc(s)}</text>'

def tspan_lines(x, y0, lines, font, size, fill, lh, anchor="middle"):
    fam = "Playfair Display" if font == "display" else "DejaVu Sans"
    out = [f'<text x="{x}" y="{y0}" font-family="{fam}" font-size="{size}" '
           f'fill="{fill}" text-anchor="{anchor}" font-weight="bold">']
    for i, ln in enumerate(lines):
        a = f'dy="0"' if i == 0 else f'dy="{lh}"'
        xx = x if i == 0 else 0
        if i > 0:
            out.append(f'<tspan x="{x}" dy="{lh}">{esc(ln)}</tspan>')
        else:
            out.append(esc(ln))
    out.append("</text>")
    return "".join(out)

DEFS = f"""<defs>
<linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="{GOLD_L}"/><stop offset="55%" stop-color="{GOLD}"/>
  <stop offset="100%" stop-color="{GOLD_D}"/>
</linearGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="{GOLD}" stop-opacity="0.11"/>
  <stop offset="100%" stop-color="{GOLD}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="glow2" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="{GOLD}" stop-opacity="0.05"/>
  <stop offset="100%" stop-color="{GOLD}" stop-opacity="0"/>
</radialGradient>
</defs>"""

def diamond(cx, cy, r=6, fill=GOLD, opacity=1.0):
    return (f'<path d="M{cx} {cy-r} L{cx+r} {cy} L{cx} {cy+r} L{cx-r} {cy} Z" '
            f'fill="{fill}" opacity="{opacity}"/>')

def chip(label="DIÁRIO DA RIQUEZA", y=112):
    size, ls = 25, 9
    w = text_w(label, "bodyb", size, ls)
    x0 = W / 2 - w / 2
    s = T(f"{x0:.1f}", y, label, "bodyb", size, GOLD, ls=ls, anchor="start")
    s += diamond(x0 - 36, y - 8, 6, GOLD, 0.9)
    s += diamond(x0 + w + 36, y - 8, 6, GOLD, 0.9)
    return s

def frame():
    s = f'<rect x="26" y="26" width="{W-52}" height="{H-52}" rx="26" fill="none" stroke="{BORDER}" stroke-width="2"/>'
    L, o = 36, 0.85
    for cx, cy, dx, dy in [(26, 26, 1, 1), (W-26, 26, -1, 1), (26, H-26, 1, -1), (W-26, H-26, -1, -1)]:
        s += (f'<path d="M{cx+dx*14} {cy+dy*o*0} M{cx+dx*14} {cy} L{cx+dx*(14+L)} {cy}" stroke="{GOLD}" stroke-width="3" opacity="{o}" fill="none"/>'
              f'<path d="M{cx} {cy+dy*14} L{cx} {cy+dy*(14+L)}" stroke="{GOLD}" stroke-width="3" opacity="{o}" fill="none"/>')
    return s

def footer_pill(y=900, h=80, url="diariodariqueza.vercel.app"):
    size, ls = 31, 2
    tw = text_w(url, "bodyb", size, ls)
    pw = tw + 150
    x = W / 2 - pw / 2
    s = f'<rect x="{x:.1f}" y="{y}" width="{pw:.1f}" height="{h}" rx="{h/2}" fill="{SURFACE}" stroke="{BORDER}" stroke-width="2"/>'
    s += T(W/2, y + h/2 + size*0.36, url, "bodyb", size, "#ECECEF", ls=ls)
    s += diamond(W/2 - tw/2 - 32, y + h/2 - 1, 5, GOLD, 0.9)
    s += diamond(W/2 + tw/2 + 32, y + h/2 - 1, 5, GOLD, 0.9)
    return s

def badge(icon_fn, cy=260):
    bx, by, bs = W/2 - 74, cy - 74, 148
    s = f'<ellipse cx="{W/2}" cy="{cy}" rx="150" ry="120" fill="url(#glow)"/>'
    s += f'<rect x="{bx}" y="{by}" width="{bs}" height="{bs}" rx="34" fill="{SURFACE}" stroke="{BORDER}" stroke-width="2"/>'
    s += f'<rect x="{bx+10}" y="{by+10}" width="{bs-20}" height="{bs-20}" rx="26" fill="none" stroke="{GOLD}" stroke-width="1.2" opacity="0.35"/>'
    s += f'<g transform="translate({bx},{by})">{icon_fn()}</g>'
    return s

def divider(y):
    return (f'<line x1="492" y1="{y}" x2="588" y2="{y}" stroke="{GOLD}" stroke-width="2.5"/>'
            + diamond(540, y, 5.5, GOLD_L))

def check_row(y, text, size=30):
    tw = text_w(text, "body", size)
    cx = W/2 - tw/2 - 36
    s = f'<circle cx="{cx:.1f}" cy="{y-10}" r="14" fill="{GOLD}"/>'
    s += (f'<path d="M{cx-6:.1f} {y-10} l4.5 5 l8 -9" stroke="{BG}" stroke-width="3.4" '
          f'fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    s += T(W/2, y, text, "body", size, TXT2)
    return s

# ---------- ícones (área 148x148, ouro sobre superfície) ----------
S = 'stroke="%s" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"' % GOLD

def ic_book():
    return (f'<rect x="44" y="40" width="58" height="68" rx="8" {S}/>'
            f'<line x1="56" y1="40" x2="56" y2="108" {S}/>'
            f'<line x1="68" y1="58" x2="90" y2="58" {S}/>'
            f'<line x1="68" y1="74" x2="90" y2="74" {S}/>'
            f'<line x1="68" y1="90" x2="82" y2="90" {S}/>'
            f'<path d="M102 92 L112 82" {S}/>' + diamond(110, 74, 7, GOLD_L))

def ic_wifi_off():
    return (f'<circle cx="74" cy="102" r="4.5" fill="{GOLD}"/>'
            f'<path d="M56 88 A 26 26 0 0 1 92 88" {S}/>'
            f'<path d="M44 74 A 44 44 0 0 1 104 74" {S}/>'
            f'<path d="M32 60 A 62 62 0 0 1 116 60" {S}/>'
            f'<line x1="42" y1="42" x2="106" y2="110" {S}/>')

def ic_shield():
    return (f'<path d="M74 36 L106 48 V76 C106 96 92 110 74 116 C56 110 42 96 42 76 V48 Z" {S}/>'
            f'<rect x="62" y="72" width="24" height="20" rx="5" {S}/>'
            f'<path d="M67 72 V64 A7 7 0 0 1 81 64 V72" {S}/>')

def ic_nouser():
    return (f'<circle cx="74" cy="56" r="15" {S}/>'
            f'<path d="M46 110 C46 86 102 86 102 110" {S}/>'
            f'<line x1="44" y1="42" x2="106" y2="110" {S}/>')

def ic_tag():
    return (f'<path d="M48 50 H80 L104 74 L80 98 H48 Z" {S}/>'
            f'<circle cx="61" cy="74" r="5.5" {S}/>'
            + diamond(88, 42, 6, GOLD_L, 0.95) + diamond(106, 60, 5, GOLD_L, 0.7))

def ic_phone():
    return (f'<rect x="56" y="34" width="38" height="80" rx="9" {S}/>'
            f'<line x1="68" y1="44" x2="82" y2="44" {S}/>'
            f'<path d="M75 62 V84 M66 76 L75 85 L84 76" {S}/>')

def ic_arrows():
    return (f'<path d="M56 98 V50 M42 64 L56 50 L70 64" {S}/>'
            f'<path d="M92 50 V98 M78 84 L92 98 L106 84" {S}/>'
            f'<line x1="42" y1="98" x2="70" y2="98" {S} stroke-dasharray="1 0"/>'
            f'<line x1="78" y1="50" x2="106" y2="50" {S}/>')

def ic_chart():
    return (f'<path d="M46 44 V102 H104" {S}/>'
            f'<path d="M56 92 L74 70 L86 80 L102 52" {S}/>'
            f'<circle cx="102" cy="52" r="6" fill="{GOLD}"/>')

def ic_target():
    return (f'<circle cx="74" cy="74" r="30" {S}/>'
            f'<circle cx="74" cy="74" r="17" {S}/>'
            f'<circle cx="74" cy="74" r="5" fill="{GOLD}"/>'
            f'<path d="M104 44 L90 58" {S}/>')

def ic_pen():
    return (f'<rect x="42" y="42" width="54" height="66" rx="7" {S}/>'
            f'<line x1="54" y1="60" x2="84" y2="60" {S}/>'
            f'<line x1="54" y1="76" x2="78" y2="76" {S}/>'
            f'<path d="M92 102 L118 76" {S}/><path d="M92 102 L88 106" {S}/>'
            + diamond(116, 72, 6, GOLD_L))

def ic_flame():
    return (f'<path d="M74 38 C88 56 100 72 96 94 C93 110 82 118 74 118 C66 118 55 110 52 94 C48 72 60 56 74 38 Z" {S}/>'
            f'<path d="M74 78 C80 86 84 92 82 100 C80 107 76 110 74 110 C72 110 68 107 66 100 C64 92 68 86 74 78 Z" fill="{GOLD}"/>')

def ic_backup():
    return (f'<path d="M46 86 H102" {S}/>'
            f'<path d="M54 86 V102 H94 V86" {S}/>'
            f'<path d="M74 38 V72 M60 60 L74 74 L88 60" {S}/>'
            + diamond(74, 32, 5, GOLD_L, 0.0) )

def ic_donut():
    return (f'<circle cx="74" cy="74" r="28" stroke="{BORDER}" stroke-width="15" fill="none"/>'
            f'<circle cx="74" cy="74" r="28" stroke="{GOLD}" stroke-width="15" fill="none" '
            f'stroke-dasharray="132 56.6" stroke-linecap="butt" transform="rotate(-90 74 74)"/>'
            f'<circle cx="74" cy="74" r="6" fill="{GOLD_L}"/>')

def ic_mural():
    g = ""
    for i, cx in enumerate([50, 74, 98]):
        for j, cy in enumerate([50, 74, 98]):
            if cx == 74 and cy == 74:
                continue
            g += f'<circle cx="{cx}" cy="{cy}" r="9" {S}/>'
    return g + f'<path d="M74 54 L80 68 L94 74 L80 80 L74 94 L68 80 L54 74 L68 68 Z" fill="{GOLD}"/>'

def ic_coffee():
    return (f'<path d="M50 62 H92 L88 92 A19 19 0 0 1 54 92 Z" {S}/>'
            f'<path d="M92 68 C108 66 108 88 90 86" {S}/>'
            f'<path d="M62 48 C62 42 68 42 68 36" {S}/>'
            f'<path d="M76 48 C76 42 82 42 82 36" {S}/>')

def ic_heart():
    return (f'<path d="M74 106 C42 84 40 58 60 52 C68 50 74 56 74 62 C74 56 80 50 88 52 C108 58 106 84 74 106 Z" {S}/>'
            + diamond(74, 74, 7, GOLD_L, 0.9))

def ic_crown():
    return (f'<path d="M42 96 L48 54 L64 72 L74 44 L84 72 L100 54 L106 96 Z" {S}/>'
            f'<line x1="50" y1="108" x2="98" y2="108" {S}/>'
            + diamond(74, 26, 6, GOLD_L, 0.95))

def ic_rocket():
    return (f'<path d="M74 34 C90 48 96 72 90 94 L58 94 C52 72 58 48 74 34 Z" {S}/>'
            f'<circle cx="74" cy="64" r="9" {S}/>'
            f'<path d="M58 82 L44 96 M90 82 L104 96 M74 96 V112" {S}/>'
            f'<path d="M70 94 C70 104 74 108 74 108 C74 108 78 104 78 94" fill="{GOLD}"/>')

# ---------- layouts ----------
def svg_open():
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
            f'xmlns="http://www.w3.org/2000/svg">\n<rect width="{W}" height="{H}" fill="{BG}"/>'
            + DEFS + frame())

def layout_feature(slug, icon, headline_lines, sub, gold_words=None):
    s = svg_open() + chip() + f'<ellipse cx="540" cy="640" rx="430" ry="330" fill="url(#glow2)"/>'
    s += badge(icon)
    n = len(headline_lines)
    if n == 1:
        size = fit_size(headline_lines[0], "display", 84, 880)
        s += T(540, 505, headline_lines[0], "display", size, GOLD_L)
    else:
        size = fit_size(max(headline_lines, key=lambda t: text_w(t, "display", 78)), "display", 78, 880)
        s += T(540, 470, headline_lines[0], "display", size, TXT)
        s += T(540, 566, headline_lines[1], "display", size, GOLD_L)
    s += divider(624)
    lines = wrap(sub, "body", 31, 870, 3)
    y = 700
    for ln in lines:
        s += T(540, y, ln, "body", 31, TXT2)
        y += 47
    s += footer_pill()
    return s + "</svg>"

def layout_hero():
    s = svg_open() + chip()
    s += f'<ellipse cx="540" cy="420" rx="470" ry="360" fill="url(#glow)"/>'
    s += T(540, 336, "Diário da", "display", fit_size("Diário da", "display", 116, 900), "url(#gold)")
    s += T(540, 462, "Riqueza", "display", fit_size("Riqueza", "display", 116, 900), "url(#gold)")
    s += diamond(540, 512, 6, GOLD_L)
    s += T(540, 578, "Organize sua vida financeira", "bodyb", 40, TXT)
    s += divider(636)
    sub = ("Um diário completo para registrar seu dinheiro, acompanhar sua evolução "
           "e construir o hábito da organização — direto do seu celular.")
    y = 712
    for ln in wrap(sub, "body", 31, 860, 3):
        s += T(540, y, ln, "body", 31, TXT2)
        y += 47
    s += footer_pill()
    return s + "</svg>"

def layout_quote(quote, author="DIÁRIO DA RIQUEZA"):
    s = svg_open() + chip()
    s += f'<ellipse cx="540" cy="480" rx="450" ry="380" fill="url(#glow)"/>'
    s += T(540, 396, "\u201C", "display", 250, "url(#gold)", opacity=0.95)
    lines = wrap(quote, "display", 66, 850, 3)
    y = 540
    for ln in lines:
        s += T(540, y, ln, "display", 66, TXT)
        y += 86
    y += 8
    s += f'<line x1="500" y1="{y}" x2="580" y2="{y}" stroke="{GOLD}" stroke-width="2.5"/>'
    s += T(540, y + 62, "— " + author + " —", "bodyb", 27, GOLD, ls=5)
    s += footer_pill()
    return s + "</svg>"

def layout_founders():
    s = svg_open() + chip()
    s += f'<ellipse cx="540" cy="470" rx="450" ry="360" fill="url(#glow)"/>'
    s += T(540, 292, "Mural dos Fundadores", "display", fit_size("Mural dos Fundadores", "display", 68, 900), TXT)
    s += T(540, 512, "75", "display", 200, "url(#gold)")
    s += T(540, 586, "nomes eternizados na aplicação", "body", 30, TXT2)
    names = ["Rafael S.", "Thiago O.", "Mariana F.", "+ 72 apoiadores"]
    ch, gap, pad, fsize = 56, 16, 30, 26
    widths = [text_w(n, "bodyb", fsize) + pad * 2 for n in names]
    total = sum(widths) + gap * (len(names) - 1)
    x = W / 2 - total / 2
    for n, wch in zip(names, widths):
        s += f'<rect x="{x:.1f}" y="648" width="{wch:.1f}" height="{ch}" rx="{ch/2}" fill="{SURFACE}" stroke="{BORDER}" stroke-width="2"/>'
        s += T(x + wch / 2, 648 + ch / 2 + fsize * 0.35, n, "bodyb", fsize, TXT2)
        x += wch + gap
    label = "Clodoaldo S. — Fundador Ouro"
    lw = text_w(label, "bodyb", 28) + 120
    x = W / 2 - lw / 2
    s += f'<rect x="{x:.1f}" y="748" width="{lw:.1f}" height="60" rx="30" fill="rgba(212,175,55,0.10)" stroke="{GOLD}" stroke-width="2"/>'
    s += T(x + 44, 786, "", "bodyb", 28, GOLD_L)
    s += diamond(x + 34, 778, 6, GOLD_L)
    s += T(x + lw / 2 + 12, 786, label, "bodyb", 28, GOLD_L)
    s += footer_pill()
    return s + "</svg>"

def layout_tier(kicker, price, per_month, headline, benefits):
    s = svg_open() + chip()
    s += f'<ellipse cx="540" cy="430" rx="440" ry="360" fill="url(#glow)"/>'
    kw = text_w(kicker, "bodyb", 26, 6)
    s += T(540 - kw/2, 214, kicker, "bodyb", 26, GOLD_L, ls=6, anchor="start")
    psize = fit_size(price, "display", 180, 760)
    if per_month:
        pw = text_w(price, "display", psize)
        mw = text_w(per_month, "bodyb", 42)
        total = pw + 18 + mw
        x0 = 540 - total / 2
        s += T(x0, 434, price, "display", psize, "url(#gold)", anchor="start")
        s += T(x0 + pw + 18, 434, per_month, "bodyb", 42, TXT3, anchor="start")
    else:
        s += T(540, 434, price, "display", psize, "url(#gold)")
    s += T(540, 530, headline, "bodyb", fit_size(headline, "bodyb", 44, 880), TXT)
    y = 640
    for b in benefits:
        s += check_row(y, b)
        y += 58
    s += footer_pill()
    return s + "</svg>"

def layout_cta():
    s = svg_open() + chip()
    s += f'<ellipse cx="540" cy="400" rx="450" ry="350" fill="url(#glow)"/>'
    s += T(540, 336, "Comece agora.", "display", fit_size("Comece agora.", "display", 96, 880), TXT)
    s += T(540, 442, "É grátis.", "display", fit_size("É grátis.", "display", 96, 880), GOLD_L)
    steps = [("1", "Acesse o site"), ("2", "Toque em instalar"), ("3", "Registre a entrada")]
    bw, bh, gap = 300, 150, 26
    total = bw * 3 + gap * 2
    x = W / 2 - total / 2
    for num, label in steps:
        s += f'<rect x="{x:.1f}" y="540" width="{bw}" height="{bh}" rx="26" fill="{SURFACE}" stroke="{BORDER}" stroke-width="2"/>'
        s += T(x + bw / 2, 606, num, "display", 50, GOLD_L)
        lines = wrap(label, "body", 26, bw - 40, 2)
        yy = 648 - (len(lines) - 1) * 16
        for ln in lines:
            s += T(x + bw / 2, yy, ln, "body", 26, TXT2)
            yy += 33
        x += bw + gap
    url = "diariodariqueza.vercel.app"
    size, ls = 40, 2
    tw = text_w(url, "bodyb", size, ls)
    pw = tw + 160
    px = W / 2 - pw / 2
    s += f'<rect x="{px:.1f}" y="788" width="{pw:.1f}" height="96" rx="48" fill="rgba(212,175,55,0.10)" stroke="{GOLD}" stroke-width="2.5"/>'
    s += T(540, 850, url, "bodyb", size, GOLD_L, ls=ls)
    s += T(540, 952, "Grátis • Offline • Sem cadastro • 100% no seu celular", "body", 26, TXT3)
    return s + "</svg>"

# ---------- catálogo dos 20 posts ----------
POSTS = [
    ("01-capa-marca", lambda: layout_hero()),
    ("02-offline", lambda: layout_feature("02", ic_wifi_off, ["100% offline"],
        "Funciona sem internet. Registre no ônibus, no mercado ou em viagem — ficar sem sinal não é mais problema.")),
    ("03-privacidade", lambda: layout_feature("03", ic_shield, ["Seus dados. Só seus."],
        "Nada é enviado para servidores. Tudo fica salvo apenas no seu celular, sob o seu controle.")),
    ("04-sem-cadastro", lambda: layout_feature("04", ic_nouser, ["Sem cadastro,", "sem complicação."],
        "Abra o site e comece a usar. Nenhum e-mail, nenhuma senha, nenhuma burocracia.")),
    ("05-gratuito", lambda: layout_feature("05", ic_tag, ["100% gratuito."],
        "Use os recursos principais sem pagar nada e exporte seus dados quando quiser.")),
    ("06-instalar", lambda: layout_feature("06", ic_phone, ["Instale em segundos"],
        "Sem loja de aplicativos: abra o site, toque em \u201CAdicionar à tela inicial\u201D e pronto.")),
    ("07-receitas-despesas", lambda: layout_feature("07", ic_arrows, ["Receitas e despesas", "sob controle"],
        "Registre entradas e saídas em segundos, com categorias, valores e observações.")),
    ("08-evolucao", lambda: layout_feature("08", ic_chart, ["Veja sua evolução"],
        "Gráficos claros mostram para onde o seu dinheiro vai, mês a mês.")),
    ("09-metas", lambda: layout_feature("09", ic_target, ["Metas que você alcança"],
        "Defina objetivos, acompanhe o progresso e comemore cada conquista no caminho.")),
    ("10-diario", lambda: layout_feature("10", ic_pen, ["Um diário para", "o seu dinheiro"],
        "Anote o que cada real significa para você. Escrever sobre dinheiro muda a relação com ele.")),
    ("11-sequencia", lambda: layout_feature("11", ic_flame, ["Consistência", "vira costume"],
        "Mantenha a sequência de dias registrados e transforme organização em hábito.")),
    ("12-backup", lambda: layout_feature("12", ic_backup, ["Seus dados,", "sempre seguros"],
        "Backup automático e exportação em PDF, Excel e JSON. Você nunca perde nada.")),
    ("13-orcamento", lambda: layout_feature("13", ic_donut, ["Orçamento simples", "de manter"],
        "Planeje gastos fixos e variáveis, acompanhe limites e veja a projeção até a sua meta.")),
    ("14-citacao", lambda: layout_quote("Riqueza se constrói na disciplina de cada dia.")),
    ("15-mural-fundadores", lambda: layout_founders()),
    ("16-apoio-5", lambda: layout_tier("APOIE O PROJETO", "R$ 5", None, "Apoie com um café",
        ["Mantém o projeto no ar", "Sem anúncios, sem cadastro", "Feito de forma independente"])),
    ("17-apoio-15", lambda: layout_tier("APOIE O PROJETO", "R$ 15", None, "Apoie e entre para a história",
        ["Nome no Mural dos Fundadores", "Eternizado na aplicação", "Apoia novas funcionalidades"])),
    ("18-apoio-50", lambda: layout_tier("APOIE O PROJETO", "R$ 50", None, "Apoio que fortalece o projeto",
        ["Destaque no Mural dos Fundadores", "Nome eternizado no app", "Acelera o desenvolvimento"])),
    ("19-fundador-ouro", lambda: layout_tier("ASSINATURA MENSAL", "R$ 9,90", "/mês", "Torne-se Fundador Ouro",
        ["Nome eternizado no Mural", "Título de Fundador Ouro", "Apoia a evolução contínua do app"])),
    ("20-cta-final", lambda: layout_cta()),
]

if __name__ == "__main__":
    for slug, fn in POSTS:
        svg = fn()
        svg_path = f"{SVG_DIR}/{slug}.svg"
        png_path = f"{PNG_DIR}/{slug}.png"
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(svg)
        cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=W, output_height=H)
        print("OK", slug)
    # inventário
    from PIL import Image
    files = sorted(f for f in os.listdir(PNG_DIR) if f.endswith(".png"))
    print(f"\n{len(files)} PNGs gerados:")
    for f in files:
        im = Image.open(f"{PNG_DIR}/{f}")
        print(f"  {f}  {im.size[0]}x{im.size[1]}  {os.path.getsize(f'{PNG_DIR}/{f}')//1024} KB")
