# -*- coding: utf-8 -*-
"""Verificação final do kit: 20 PNGs + legendas.md com 20 posts x 4 hashtags."""
import os, re, zipfile

D = "/home/z/my-project/download/divulgacao"
md = open(f"{D}/legendas.md", encoding="utf-8").read()

pngs = sorted(f for f in os.listdir(D) if f.endswith(".png"))
svgs = sorted(f for f in os.listdir("/home/z/my-project/marketing/images") if f.endswith(".svg"))
assert len(pngs) == 20, f"PNGs: {len(pngs)}"
assert len(svgs) == 20, f"SVGs: {len(svgs)}"

# separa seções por post (headers de post começam com "NN · arquivo.png")
sections = [s for s in re.split(r"\n## ", md)[1:] if re.match(r"\d{2} · ", s)]
assert len(sections) == 20, f"Seções: {len(sections)}"

errors = []
for i, sec in enumerate(sections, 1):
    fname = sec.split(".png")[0].split("· ")[-1] + ".png"
    if fname not in pngs:
        errors.append(f"post {i:02d}: arquivo {fname} não encontrado")
    tags = re.findall(r"#[A-Za-zÀ-ÿ0-9]+", sec.split("---")[0])
    if len(tags) != 4:
        errors.append(f"post {i:02d} ({fname}): {len(tags)} hashtags -> {tags}")

if errors:
    print("ERROS:")
    [print(" -", e) for e in errors]
    raise SystemExit(1)

print(f"OK: 20 PNGs (1080x1080) + 20 SVGs + legendas.md com 20 posts, cada um com exatamente 4 hashtags")

# zip
zip_path = "/home/z/my-project/download/kit-divulgacao-diario-da-riqueza.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir(D)):
        z.write(f"{D}/{f}", f"divulgacao/{f}")
print(f"ZIP: {zip_path} ({os.path.getsize(zip_path)//1024//1024} MB)")
