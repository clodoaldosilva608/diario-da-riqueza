import type { MetadataRoute } from 'next';

/** Manifest PWA — instalável, standalone, tema preto+dourado */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Diário da Riqueza',
    short_name: 'D. Riqueza',
    description:
      'Treine sua mente para a riqueza todos os dias. Offline-first, seus dados ficam no seu dispositivo.',
    id: '/',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#09090b',
    lang: 'pt-BR',
    categories: ['finance', 'productivity', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
