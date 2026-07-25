// robots.txt: crawl the site, skip the admin panel and the api
import type { MetadataRoute } from 'next';

const SITE = 'https://aimwork.space';

// never crawl these: the admin panel, the api, and the preview url the admin
// opens in a tab. the preview is the same page, so it would be a copy
const OFF_LIMITS = ['/admin', '/api', '/*?preview='];

// ai crawlers are allowed on purpose: this is a shop window, being quoted by
// an assistant sends work here. list them so the choice is visible, not a
// side effect of the wildcard rule below
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot'
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: OFF_LIMITS },
      { userAgent: AI_BOTS, allow: '/', disallow: OFF_LIMITS }
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE
  };
}
