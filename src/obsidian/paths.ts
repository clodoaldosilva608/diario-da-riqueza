/**
 * Diário da Riqueza — Navegação de caminhos no File System Access API.
 *
 * A API NUNCA aceita separadores no nome: `getFileHandle('a/b.md')` lança
 * `NameNotAllowedError` ("Name is not allowed."). É obrigatório navegar
 * pasta a pasta com `getDirectoryHandle`. Estes helpers centralizam essa
 * regra para todo o sync do vault.
 *
 * Todos recebem um path relativo à pasta raiz do namespace
 * (`Diario_da_Riqueza/`), ex.: `_dados/diario-da-riqueza.json`.
 */

import type { DirHandle } from '@/filesystem';

/** Valida um segmento de nome (defesa extra — entradas nossas já são seguras) */
function assertName(name: string, context: string): void {
  if (
    name.length === 0 ||
    name === '.' ||
    name === '..' ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0')
  ) {
    throw new Error(`Caminho inválido para o vault (${context}): "${name}"`);
  }
}

/** Divide `a/b/c.md` → { segments: ['a','b'], fileName: 'c.md' } */
export function splitVaultPath(path: string): { segments: string[]; fileName: string } {
  const parts = path.split('/').filter((p) => p.length > 0);
  if (parts.length < 2) {
    throw new Error(`Caminho inválido para o vault: "${path}"`);
  }
  const fileName = parts.pop()!;
  for (const seg of parts) assertName(seg, path);
  assertName(fileName, path);
  return { segments: parts, fileName };
}

/** Retorna true se o path é um arquivo na raiz (sem subpastas) */
export function isRootFile(path: string): boolean {
  return !path.includes('/');
}

/** Navega/cria as pastas de `segments` a partir de `root` */
export async function resolveDirHandle(
  root: DirHandle,
  segments: string[],
  create: boolean,
): Promise<DirHandle> {
  let dir = root;
  for (const seg of segments) {
    dir = await dir.getDirectoryHandle(seg, { create });
  }
  return dir;
}

/** Grava conteúdo em `path` (relativo a `root`), criando pastas conforme preciso */
export async function putPathAt(root: DirHandle, path: string, content: string): Promise<void> {
  const { segments, fileName } = isRootFile(path)
    ? { segments: [], fileName: path }
    : splitVaultPath(path);
  const dir = segments.length ? await resolveDirHandle(root, segments, true) : root;
  const fh = await dir.getFileHandle(fileName, { create: true });
  const w = await fh.createWritable();
  await w.write(content);
  await w.close();
}

/** Lê `path` (relativo a `root`); retorna null se não existir ou falhar */
export async function readPathAt(root: DirHandle, path: string): Promise<string | null> {
  try {
    const { segments, fileName } = isRootFile(path)
      ? { segments: [], fileName: path }
      : splitVaultPath(path);
    const dir = segments.length ? await resolveDirHandle(root, segments, false) : root;
    const fh = await dir.getFileHandle(fileName, { create: false });
    return await (await fh.getFile()).text();
  } catch {
    return null;
  }
}

/** Remove o arquivo em `path` (relativo a `root`); silencioso se não existir */
export async function removePathAt(root: DirHandle, path: string): Promise<void> {
  try {
    const { segments, fileName } = isRootFile(path)
      ? { segments: [], fileName: path }
      : splitVaultPath(path);
    const dir = segments.length ? await resolveDirHandle(root, segments, false) : root;
    await dir.removeEntry?.(fileName);
  } catch {
    /* já não existe — ok */
  }
}
