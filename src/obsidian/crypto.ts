/**
 * Diário da Riqueza — Criptografia do backup portátil (.drq) e deviceId.
 *
 * Formato do arquivo: `DRQ1` (4 bytes) + salt (16) + IV (12) + AES-GCM-256.
 * Derivação de chave: PBKDF2-SHA256, 210.000 iterações (OWASP 2023+).
 * Tudo via WebCrypto — client-side, nenhum segredo sai do dispositivo.
 */

const MAGIC = new Uint8Array([0x44, 0x52, 0x51, 0x31]); // "DRQ1"
const SALT_LEN = 16;
const IV_LEN = 12;
const PBKDF2_ITERATIONS = 210_000;

const te = new TextEncoder();
const td = new TextDecoder();

/* ============================== deviceId ============================== */

/** Identificador local do dispositivo (para diagnóstico no arquivo de sync) */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  const KEY = 'dr_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

/* ============================== DERIVAÇÃO ============================== */

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    te.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/* ============================== CIFRAR / DECIFRAR ============================== */

/** Criptografa um JSON string → bytes .drq */
export async function encryptState(json: string, passphrase: string): Promise<Uint8Array> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('A senha precisa ter pelo menos 8 caracteres.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(passphrase, salt);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, key, te.encode(json)),
  );
  const out = new Uint8Array(MAGIC.length + SALT_LEN + IV_LEN + ct.length);
  out.set(MAGIC, 0);
  out.set(salt, MAGIC.length);
  out.set(iv, MAGIC.length + SALT_LEN);
  out.set(ct, MAGIC.length + SALT_LEN + IV_LEN);
  return out;
}

/** Decifra bytes .drq → JSON string */
export async function decryptState(bytes: Uint8Array, passphrase: string): Promise<string> {
  if (bytes.length < MAGIC.length + SALT_LEN + IV_LEN + 16) {
    throw new Error('Arquivo de backup inválido ou corrompido.');
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error('Este arquivo não é um backup do Diário da Riqueza.');
  }
  const salt = bytes.slice(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = bytes.slice(MAGIC.length + SALT_LEN, MAGIC.length + SALT_LEN + IV_LEN);
  const ct = bytes.slice(MAGIC.length + SALT_LEN + IV_LEN);
  const key = await deriveKey(passphrase, salt);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ct as unknown as BufferSource,
    );
    return td.decode(plain);
  } catch {
    throw new Error('Senha incorreta ou arquivo corrompido.');
  }
}
