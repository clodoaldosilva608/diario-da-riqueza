/**
 * Criptografia do sync multi-dispositivo — AES-GCM 256 + PBKDF2.
 *
 * Modelo de confiança (igual ao Actual Budget, mas com senha do usuário):
 * - O servidor armazena APENAS o blob cifrado (nunca vê a senha);
 * - A chave deriva de: senha + vaultId (salt estável do cofre);
 * - 250.000 iterações PBKDF2-SHA256 (OWASP 2023+);
 * - IV aleatório de 96 bits por envio (GCM nunca reutiliza IV com a chave).
 *
 * Tudo via WebCrypto nativo — zero dependências.
 */

const PBKDF2_ITERATIONS = 250_000;

async function deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface EncryptedEnvelope {
  /** IV em base64 (96 bits) */
  iv: string;
  /** Ciphertext em base64 (JSON do dump) */
  blob: string;
}

/** Criptografa qualquer objeto serializável para o cofre */
export async function encryptForVault(
  data: unknown,
  passphrase: string,
  vaultId: string,
): Promise<EncryptedEnvelope> {
  const key = await deriveKey(passphrase, vaultId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource,
  );
  return { iv: bufToB64(iv), blob: bufToB64(cipher) };
}

/** Descriptografa o envelope do cofre (lança erro se senha/cofre errados) */
export async function decryptFromVault<T = unknown>(
  envelope: EncryptedEnvelope,
  passphrase: string,
  vaultId: string,
): Promise<T> {
  const key = await deriveKey(passphrase, vaultId);
  const iv = b64ToBuf(envelope.iv);
  const cipher = b64ToBuf(envelope.blob);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipher as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/**
 * Código de cofre legível: DR-XXXX-XXXX-XXXX (sem caracteres ambíguos
 * 0/O/1/I/L) — digitável entre dispositivos.
 */
export function generateVaultId(): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const pick = () =>
    Array.from(
      crypto.getRandomValues(new Uint8Array(4)),
      (n) => alphabet[n % alphabet.length],
    ).join('');
  return `DR-${pick()}-${pick()}-${pick()}`;
}

export function isValidVaultId(code: string): boolean {
  return /^DR-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/.test(code.trim().toUpperCase());
}
