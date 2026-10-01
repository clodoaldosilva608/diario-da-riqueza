# -*- coding: utf-8 -*-
"""merge_report.py — insere a capa (HTML/Playwright) como página 0 do
corpo (ReportLab), normalizando tudo para A4. Saída única em /download/."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

COVER = '/home/z/my-project/scripts/out/cover.pdf'
BODY = '/home/z/my-project/scripts/out/relatorio_corpo.pdf'
OUT = '/home/z/my-project/download/Relatorio_Prontidao_Lancamento_Diario_da_Riqueza.pdf'


def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page


writer = PdfWriter()
writer.add_page(normalize_page_to_a4(PdfReader(COVER).pages[0]))
for page in PdfReader(BODY).pages:
    writer.add_page(normalize_page_to_a4(page))
writer.add_metadata({
    '/Title': 'Relatório de Prontidão para Lançamento — Diário da Riqueza',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Auditoria de prontidão para lançamento público e uso em escala',
})
with open(OUT, 'wb') as f:
    writer.write(f)
print('OK ->', OUT)
