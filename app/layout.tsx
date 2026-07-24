import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AimworkSpace',
  description: 'Full stack development. Sites, bots and automation.',
  openGraph: {
    title: 'AimworkSpace',
    description: 'Full stack development. Sites, bots and automation.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  themeColor: '#101010'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* set the theme before paint so there is no flash. admin stays dark. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var p=location.pathname,t=localStorage.getItem('zx_theme');document.documentElement.dataset.theme=p.indexOf('/admin')===0?'dark':(t==='light'||t==='dark'?t:'dark')}catch(e){document.documentElement.dataset.theme='dark'}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
