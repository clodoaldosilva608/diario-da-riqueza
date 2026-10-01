import type { MetadataRoute } from 'next';

const BASE = 'https://diariodariqueza.vercel.app';

/** Sitemap para indexação — o app é uma SPA em "/", com páginas legais estáticas. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: BASE,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/privacidade`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE}/termos`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
