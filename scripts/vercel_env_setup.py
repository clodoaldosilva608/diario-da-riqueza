#!/usr/bin/env python3
"""Configura env vars do projeto diario-da-riqueza na Vercel.

Lê os valores de .env.local (local) e cria/atualiza cada variável via API.
NUNCA imprime os valores — apenas nomes e códigos HTTP.
"""
import json
import os
import sys
import urllib.request

BASE = "/home/z/my-project"
ENV_FILE = os.path.join(BASE, ".env.local")
PROJECT_ID = "prj_RmYNRkVYWtnrAgFDwb0kyb2dOXoj"
TEAM_ID = "team_iylYgr5VwMOCi7FtolZSwtcO"
API = "https://api.vercel.com"

NAMES = [
    "CAKTO_CLIENT_ID",
    "CAKTO_CLIENT_SECRET",
    "CAKTO_WEBHOOK_TOKEN",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "ADMIN_SESSION_SECRET",
]
TARGETS = ["production", "preview", "development"]


def load_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def req(method, url, token, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main():
    token = os.environ["VERCEL_TOKEN"]
    env = load_env(ENV_FILE)
    missing = [n for n in NAMES if not env.get(n)]
    if missing:
        print(f"FALTANDO em .env.local: {missing}")
        sys.exit(1)

    # 1. Listar env vars existentes
    status, body = req("GET", f"{API}/v9/projects/{PROJECT_ID}/env?teamId={TEAM_ID}", token)
    existing = {}
    if status == 200:
        for item in json.loads(body).get("envs", []):
            existing[item["key"]] = item
    else:
        print(f"ERRO ao listar envs: HTTP {status}")
        sys.exit(1)
    print(f"Env vars existentes no projeto: {sorted(existing.keys()) or '(nenhuma)'}")

    # 2. Criar/atualizar cada variável
    for name in NAMES:
        value = env[name]
        payload = {
            "key": name,
            "value": value,
            "type": "encrypted",
            "target": TARGETS,
        }
        if name in existing:
            env_id = existing[name]["id"]
            # upsert: remover e recriar (mais simples e confiável)
            st_del, _ = req(
                "DELETE",
                f"{API}/v9/projects/{PROJECT_ID}/env/{env_id}?teamId={TEAM_ID}",
                token,
            )
            verb = f"REMOVIDA({st_del})+CRIADA" if st_del in (200, 204) else "CRIADA(dup?)"
        else:
            verb = "CRIADA"
        st, body = req(
            "POST",
            f"{API}/v10/projects/{PROJECT_ID}/env?teamId={TEAM_ID}",
            token,
            payload,
        )
        ok = st in (200, 201)
        print(f"  {name}: {verb} → HTTP {st} {'OK' if ok else 'ERRO: ' + body[:120]}")

    print("Concluído.")


if __name__ == "__main__":
    main()
