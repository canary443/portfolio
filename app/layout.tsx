import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { pickLang } from '@/lib/lang';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import './fonts.css';

// short pitch for link previews and search. english only: this is static
// server metadata, it can not follow the ru toggle
const PREVIEW = 'Sites, Telegram bots and automation. Built in 3-14 days, reply in under 24h.';

export const metadata: Metadata = {
  // link previews (telegram, twitter, discord) show the square cat
  metadataBase: new URL('https://aimwork.space'),
  title: 'AimworkSpace',
  description: 'Full stack dev: sites, Telegram bots and automation. Built in 3-14 days, reply in under 24h. Fixed price per project.',
  // one page, one address. the admin preview opens /?preview=1 and this keeps
  // that from counting as a second page
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    // let google show the full text and a big picture, not a cut snippet
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 }
  },
  // codes from google search console and yandex webmaster. set them in the
  // vercel env vars, see README. with nothing set no tag is printed
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION
  },
  openGraph: {
    title: 'aimwork.space',
    description: PREVIEW,
    type: 'website',
    url: '/',
    siteName: 'AimworkSpace',
    // both languages live on one url, so ru is listed as the second one
    locale: 'en_US',
    alternateLocale: ['ru_RU'],
    images: [{ url: '/assets/og.jpg', width: 800, height: 800, alt: 'AimworkSpace' }]
  },
  twitter: {
    card: 'summary',
    title: 'aimwork.space',
    description: PREVIEW,
    images: ['/assets/og.jpg']
  }
};

// what the studio sells, for search engines. static on purpose: never build
// this from saved content, the layout must stay cheap and cacheable
const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'AimworkSpace',
  alternateName: 'aimwork',
  url: 'https://aimwork.space',
  image: 'https://aimwork.space/assets/og.jpg',
  description: PREVIEW,
  areaServed: 'Worldwide',
  priceRange: '$250-$800',
  currenciesAccepted: 'USD',
  knowsLanguage: ['en', 'ru'],
  sameAs: ['https://t.me/sickbuddy'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    url: 'https://t.me/sickbuddy',
    availableLanguage: ['en', 'ru']
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Services',
    itemListElement: ['Sites', 'Telegram bots', 'Automation', 'Custom code'].map((name) => ({
      '@type': 'Offer',
      priceCurrency: 'USD',
      itemOffered: { '@type': 'Service', name }
    }))
  }
};

export const viewport: Viewport = {
  themeColor: '#101010'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // same pick as the page: saved choice first, else what the browser asks for,
  // so <html lang> never disagrees with the text on screen
  const [jar, head] = await Promise.all([cookies(), headers()]);
  const lang = pickLang(jar.get('zx_lang')?.value, head.get('accept-language'));
  return (
    <html lang={lang}>
      <head>
        {/* a reload starts at the top: no flash of the hero then a jump down */}
        <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual'" }} />
        {/* fonts live in public/fonts, see fonts.css. only the two faces of the first paint are preloaded */}
        <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/satoshi-400.woff2" />
        <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/satoshi-500.woff2" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
