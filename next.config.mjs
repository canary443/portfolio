import { withBotId } from 'botid/next/config';

// report-only csp: the site inlines styles and a few scripts. fonts and icons
// are local now, so these rules match what the page loads. before making it
// blocking, keep 'unsafe-inline' in script-src: botid ships an inline script.
const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https:",
  "connect-src 'self' https:"
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp }
];

// keep the admin panel out of search engines
const noIndex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/admin', headers: noIndex },
      { source: '/admin/:path*', headers: noIndex }
    ];
  }
};

// botid: adds same origin rewrites, so the bot check script is served from our
// own domain and no third party host is called from the browser
export default withBotId(nextConfig);
