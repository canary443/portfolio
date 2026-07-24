import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  // link previews (telegram, twitter, discord) show the square cat
  metadataBase: new URL('https://aimwork.space'),
  title: 'AimworkSpace',
  description: 'Full stack development. Sites, bots and automation.',
  openGraph: {
    title: 'aimwork.space',
    description: '@aimwork portfolio',
    type: 'website',
    images: [{ url: '/assets/og.jpg', width: 800, height: 800 }]
  },
  twitter: {
    card: 'summary',
    title: 'aimwork.space',
    description: '@aimwork portfolio',
    images: ['/assets/og.jpg']
  }
};

export const viewport: Viewport = {
  themeColor: '#101010'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // saved language, so the server paints the right one (no flash of english)
  const lang = (await cookies()).get('zx_lang')?.value === 'ru' ? 'ru' : 'en';
  return (
    <html lang={lang}>
      <head>
        {/* a reload starts at the top: no flash of the hero then a jump down */}
        <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual'" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500&display=swap" rel="stylesheet" />
        {/* onest is the default cyrillic companion; carlito and jost are admin options */}
        <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500&family=Carlito:wght@400;700&family=Jost:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
