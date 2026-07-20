import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://piyak.jimiroi.com/',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
