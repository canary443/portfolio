# aimworkspace

personal portfolio site. dark single page + a password gated admin panel. content lives in a vercel blob store, with localStorage as a local cache.

## stack

- next.js 14 (app router) + typescript
- lenis for the smooth scroll
- satoshi (fontshare) for type; the cyrillic companion for the RU locale is picked in the admin (onest by default, carlito or jost) and can differ per interface string
- simple icons cdn for the brand icons

## run it

```bash
npm install
npm run dev
```

- site: http://localhost:3000
- admin: http://localhost:3000/admin

## env

copy `.env.example` to `.env.local` and set:

- `ADMIN_PASSWORD` - passphrase for /admin

## notes

the admin panel writes content to the browser's localStorage and to `site.json` in the vercel blob store, so every browser sees the same site. the login check, rate limit and the content write run server side.

the language choice is mirrored into a cookie, so the server paints the saved language on reload with no english flash. a reload always starts at the top of the page (scroll restoration is off).
