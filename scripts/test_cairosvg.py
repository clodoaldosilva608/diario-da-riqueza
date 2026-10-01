"""Teste rápido: cairosvg renderiza Playfair Display + acentos PT-BR + gradientes?"""
import cairosvg

SVG = """<?xml version="1.0" encoding="UTF-8"?>
<svg width="540" height="360" viewBox="0 0 540 360" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5D576"/>
      <stop offset="55%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#B8912A"/>
    </linearGradient>
  </defs>
  <rect width="540" height="360" fill="#09090B"/>
  <rect x="1" y="1" width="538" height="358" fill="none" stroke="#27272A" stroke-width="2"/>
  <text x="270" y="120" font-family="Playfair Display" font-weight="bold" font-size="64"
        fill="url(#gold)" text-anchor="middle">Diário da Riqueza</text>
  <text x="270" y="185" font-family="DejaVu Sans" font-size="26" fill="#A1A1AA"
        text-anchor="middle">Acentuação: ação, ações, prévio, Organização</text>
  <text x="270" y="240" font-family="DejaVu Sans" font-weight="bold" font-size="30"
        fill="#F5D576" text-anchor="middle">R$ 9,90/mês • 100% grátis • offline</text>
  <text x="270" y="300" font-family="Playfair Display" font-size="24" font-style="italic"
        fill="#D4AF37" text-anchor="middle">— consistência em cada dia —</text>
</svg>"""

cairosvg.svg2png(bytestring=SVG.encode(), write_to="/home/z/my-project/scripts/test_render.png",
                 output_width=1080, output_height=720)
print("OK")
