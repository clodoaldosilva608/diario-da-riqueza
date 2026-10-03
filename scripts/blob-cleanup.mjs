import { list, del } from '@vercel/blob';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const token = env.match(/^BLOB_READ_WRITE_TOKEN=(.+)$/m)?.[1]?.trim();
if (!token) { console.error('BLOB token ausente'); process.exit(1); }

const res = await list({ token, prefix: 'dr/' });
console.log('blobs encontrados:', res.blobs.length);
for (const b of res.blobs) {
  console.log(' -', b.pathname, b.size + 'B');
  await del(b.url, { token });
}
const after = await list({ token, prefix: 'dr/' });
console.log('restantes:', after.blobs.length);
