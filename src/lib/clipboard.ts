/**
 * Copia texto para a área de transferência com fallback para navegadores
 * sem Clipboard API (ou com permissão negada). Nenhum dado sai do
 * dispositivo — a cópia é 100% local.
 */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta o fallback abaixo */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const okFlag = document.execCommand('copy');
    document.body.removeChild(ta);
    return okFlag;
  } catch {
    return false;
  }
}
