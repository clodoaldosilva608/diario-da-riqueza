#!/usr/bin/env python3
"""
Diário da Riqueza — geração do QR Code Pix (BR Code).

O payload abaixo foi fornecido pelo próprio banco do criador do projeto
(código "Pix copia e cola" oficial). Este script:

  1. Valida a estrutura EMV® do payload campo a campo (TLV).
  2. Recalcula o CRC16-CCITT (0xFFFF) e compara com o CRC embarcado.
  3. Gera o PNG do QR localmente (nenhum serviço externo — offline-first).
  4. Decodifica o PNG gerado com OpenCV e confere que o conteúdo decodificado
     é EXATAMENTE o payload (garantia de QR válido e testável).

Saída: src/components/support/pix-qr.png (importado estaticamente pelo
PixSupportDialog — vira asset com hash em /_next/static, cache-first no
service worker → funciona offline).
"""

import sys

import cv2
import numpy as np
import qrcode
from PIL import Image

# Payload oficial (copia e cola) fornecido pelo banco — usar EXATAMENTE como está.
PAYLOAD = (
    "00020126580014BR.GOV.BCB.PIX0136bde7ca55-faa9-4589-8a0f-abe387172552"
    "5204000053039865802BR5925Clodoaldo Conceicao Silva6009SAO PAULO"
    "62140510pMCJsdrOJX63044614"
)

OUT = "/home/z/my-project/src/components/support/pix-qr.png"

failures = []


def check(cond: bool, label: str, detail: str = "") -> None:
    status = "OK " if cond else "FALHOU"
    print(f"[{status}] {label}" + (f" — {detail}" if detail else ""))
    if not cond:
        failures.append(label)


def parse_tlv(data: str):
    """Divide o payload EMV em pares (id, valor) recursivamente no 1º nível."""
    out = []
    i = 0
    while i + 4 <= len(data):
        tag = data[i : i + 2]
        length = int(data[i + 2 : i + 4])
        value = data[i + 4 : i + 4 + length]
        if len(value) != length:
            return None  # campo truncado
        out.append((tag, value))
        i += 4 + length
    if i != len(data):
        return None  # sobra de bytes → estrutura inválida
    return out


def crc16_ccitt(data: str) -> int:
    """CRC16-CCITT (poly 0x1021, init 0xFFFF) — o padrão do BR Code."""
    crc = 0xFFFF
    for ch in data.encode("ascii"):
        crc ^= ch << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if (crc & 0x8000) else (crc << 1)
            crc &= 0xFFFF
    return crc


# ----------------------------- 1. Estrutura ---------------------------------
tlvs = parse_tlv(PAYLOAD)
check(tlvs is not None, "estrutura TLV íntegra (sem bytes sobrando/truncados)")
tlv = dict(tlvs or [])

check(tlv.get("00") == "01", "tag 00 (Payload Format Indicator) = 01")
mai = parse_tlv(tlv.get("26", ""))
check(mai is not None and dict(mai).get("00") == "BR.GOV.BCB.PIX",
      "tag 26 contém GUI BR.GOV.BCB.PIX")
key = dict(mai or {}).get("01", "")
check(len(key) == 36 and key.count("-") == 4,
      "chave Pix dentro do QR é do tipo UUID (aleatória do banco)", key)
check(tlv.get("53") == "986", "moeda BRL (986)")
check(tlv.get("58") == "BR", "país BR")
check(tlv.get("59") == "Clodoaldo Conceicao Silva",
      "nome do recebedor conferido", tlv.get("59", ""))
check(tlv.get("60") == "SAO PAULO", "cidade do recebedor conferida", tlv.get("60", ""))
check(tlv.get("63"), "CRC presente (tag 63)")
check(PAYLOAD.isascii(), "payload 100% ASCII (exigência do EMV BR Code)")

# ----------------------------- 2. CRC16 -------------------------------------
prefix = PAYLOAD[: len(PAYLOAD) - 4]
embedded = PAYLOAD[-4:]
computed = f"{crc16_ccitt(prefix):04X}"
check(computed == embedded.upper(),
      f"CRC16 recalculado {computed} == embarcado {embedded.upper()}")

if failures:
    print(f"\nERROS: {len(failures)} — payload inválido, QR NÃO será gerado.")
    sys.exit(1)

# ----------------------------- 3. Gerar QR ----------------------------------
qr = qrcode.QRCode(
    version=None,                    # auto
    error_correction=qrcode.constants.ERROR_CORRECT_Q,  # 25% de redundância
    box_size=12,                     # módulos grandes → PNG nítido
    border=4,                        # quiet zone padrão (4 módulos)
)
qr.add_data(PAYLOAD)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
img.save(OUT, "PNG")
print(f"\nQR gerado: {OUT} ({img.size[0]}x{img.size[1]}px, "
      f"versão {qr.version}, correção Q)")

# --------------------- 4. Verificação por decodificação ---------------------
decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(
    cv2.imdecode(np.fromfile(OUT, dtype=np.uint8), cv2.IMREAD_COLOR)
)
check(decoded == PAYLOAD,
      "PNG decodificado é EXATAMENTE o payload do banco",
      "" if decoded == PAYLOAD else f"decodificado: {decoded[:60]}...")

if failures:
    print(f"\nFALHAS NA VERIFICAÇÃO: {len(failures)}")
    sys.exit(1)
print("\n=== QR CODE VÁLIDO, TESTADO E SALVO ===")
