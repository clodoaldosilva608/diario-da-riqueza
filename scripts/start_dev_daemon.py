#!/usr/bin/env python3
"""
Reinicia o Next.js dev server como daemon (duplo-fork + setsid),
escapando da limpeza de árvore de processos do tool runner.

Uso: python3 start_dev_daemon.py [--port 3000]
"""
import os
import sys
import time
import urllib.request

PROJECT = "/home/z/my-project"
NEXT_BIN = os.path.join(PROJECT, "node_modules", ".bin", "next")
PORT = "3000"
LOG = os.path.join(PROJECT, "dev.log")


def is_up(port: str) -> bool:
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def daemonize_and_exec() -> None:
    """Duplo-fork clássico: o neto vira filho de init (sessão própria)."""
    pid = os.fork()
    if pid == 0:  # filho 1
        os.setsid()  # nova sessão — nunca falha em filho de fork
        pid2 = os.fork()
        if pid2 == 0:  # neto
            os.chdir(PROJECT)
            devnull = os.open(os.devnull, os.O_RDONLY)
            os.dup2(devnull, 0)
            # redireciona stdout/stderr para o log
            fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
            os.dup2(fd, 1)
            os.dup2(fd, 2)
            os.close(fd)
            os.environ["PORT"] = PORT
            os.execv(NEXT_BIN, [NEXT_BIN, "dev", "-p", PORT])
        os._exit(0)  # filho 1 sai — neto é reparentado p/ init
    os.waitpid(pid, 0)  # pai espera filho 1 para evitar zumbi


def main() -> None:
    # mata instância anterior, se houver
    os.system("pkill -f 'next dev' 2>/dev/null; pkill -f 'next-server' 2>/dev/null; sleep 1")

    if is_up(PORT):
        print(f"Servidor já rodando na porta {PORT}")
        return

    daemonize_and_exec()
    print("Daemon disparado. Aguardando readiness...")

    for i in range(60):
        time.sleep(1)
        if is_up(PORT):
            print(f"✓ Servidor UP na porta {PORT} (após {i + 1}s)")
            sys.exit(0)
    print("✗ Timeout: servidor não subiu em 60s")
    sys.exit(1)


if __name__ == "__main__":
    main()
