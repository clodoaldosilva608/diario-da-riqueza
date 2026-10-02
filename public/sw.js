/**
 * Service Worker — Diário da Riqueza (offline-first)
 *
 * Estratégia:
 *  - Navegações: network-first com fallback para cache e para '/' (shell).
 *  - Estáticos (/_next/static, /icons) e mídia dos avisos (chave UUID
 *    imutável): cache-first.
 *  - APIs (/api/*): network-first — avisos do criador e mural de
 *    fundadores precisam chegar FRESCOS (o SWR servia título antigo por
 *    uma visita); offline cai para o cache existente.
 *  - Demais GETs: stale-while-revalidate simples.
 */

const CACHE = 'diario-riqueza-v2';
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegações: rede primeiro, cache como fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(request)) ??
            (await cache.match('/')) ??
            new Response('Offline', { status: 503, statusText: 'Offline' })
          );
        }),
    );
    return;
  }

  // Estáticos imutáveis + mídia dos avisos (UUID): cache-first
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/api/announcements/media';
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // APIs dinâmicas: network-first (offline → último cache conhecido)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return (
            cached ??
            new Response('Offline', {
              status: 503,
              statusText: 'Offline',
            })
          );
        }),
    );
    return;
  }

  // Demais: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});

/* ============================== WEB PUSH ==============================
 * Notificações do servidor (lembrete diário via cron + avisos do criador).
 * Payload JSON: {title, body, url?, tag?}
 */

self.addEventListener('push', (event) => {
  let data = { title: 'Diário da Riqueza', body: 'Toque para abrir o app.', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload não-JSON: usa o default */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'dr-push',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (new URL(client.url).pathname === url && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
