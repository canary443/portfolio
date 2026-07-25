// sitemap.xml: the site is one page
import type { MetadataRoute } from 'next';

const SITE = 'https://aimwork.space';

// one url, so it is built once and served static. the date is the build date,
// which for a site that ships on every content change is close enough
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    }
  ];
}
