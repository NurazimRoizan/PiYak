import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://piyak.jimiroi.com/',
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://piyak.jimiroi.com/privacy-policy',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
