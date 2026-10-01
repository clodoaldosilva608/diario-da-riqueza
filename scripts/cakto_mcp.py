#!/usr/bin/env python3
"""Cliente MCP mínimo para o servidor cakto (Streamable HTTP).

⚠️ SEGURANÇA: este arquivo NÃO contém credenciais — leia-as das variáveis
de ambiente (ou de .env.local, nunca commitado). O client secret da Cakto
foi exposto publicamente em versões anteriores deste arquivo e JÁ DEVE
ESTAR ROTACIONADO no painel da Cakto.

Uso:
  export CAKTO_CLIENT_ID=...
  export CAKTO_CLIENT_SECRET=...
  python3 scripts/cakto_mcp.py <tool_name> '<json_args>'
"""
import json
import os
import sys
import urllib.request

URL = "https://mcp.cakto.com.br"

_client_id = os.environ.get("CAKTO_CLIENT_ID")
_client_secret = os.environ.get("CAKTO_CLIENT_SECRET")
if not _client_id or not _client_secret:
    sys.exit(
        "ERRO: defina CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET no ambiente "
        "(nunca hardcode neste arquivo)."
    )

H = {
    "X-Cakto-Client-Id": _client_id,
    "X-Cakto-Client-Secret": _client_secret,
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "User-Agent": "curl/8.5.0",  # UA "curl" evita bloqueio do Cloudflare
}
_id = [0]

def rpc(method, params=None, notify=False):
    body = {"jsonrpc": "2.0", "method": method}
    if params is not None:
        body["params"] = params
    if not notify:
        _id[0] += 1
        body["id"] = _id[0]
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers=H, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode()
    if notify:
        return None
    for line in raw.splitlines():
        if line.startswith("data:"):
            raw = line[5:].strip()
            break
    return json.loads(raw)

def tool(name, args):
    return rpc("tools/call", {"name": name, "arguments": args})

rpc("initialize", {"protocolVersion": "2025-03-26", "capabilities": {},
                   "clientInfo": {"name": "dr-setup", "version": "1.0"}})
rpc("notifications/initialized", notify=True)

if __name__ == "__main__":
    name = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    res = tool(name, args)
    content = res.get("result", {}).get("content", [])
    for c in content:
        if c.get("type") == "text":
            print(c["text"])
    if res.get("result", {}).get("isError"):
        print("[isError]", file=sys.stderr)
