// robots.txt: crawl the site, skip the admin panel and the api
import type { MetadataRoute } from 'next';

const SITE = 'https://aimwork.space';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api']
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE
  };
}
