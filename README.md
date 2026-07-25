# aimworkspace

personal portfolio site. dark single page + a password gated admin panel. content lives in a vercel blob store, with localStorage as a local cache; uploaded media goes to supabase storage.

## stack

- next.js 15 (app router) + react 19 + typescript
- lenis for the smooth scroll
- satoshi for type, self-hosted from `public/fonts`; the cyrillic companion for the RU locale is picked in the admin (onest by default, carlito or jost) and can differ per interface string
- brand icons are inline svg in `components/BrandIcons.tsx`, no cdn at runtime

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
- `ADMIN_SESSION_SECRET` - signs the admin session cookie (optional locally, required in prod)
- `BLOB_READ_WRITE_TOKEN` - vercel blob store that holds `site.json`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` - media uploads; without them media stays inline as base64

## notes

the admin panel writes content to the browser's localStorage and to `site.json` in the vercel blob store, so every browser sees the same site. the login check, rate limit and the content write run server side. media picked in the admin is posted to `/api/upload` first and lands in the content json as a public supabase url.

the language choice is mirrored into a cookie, so the server paints the saved language on reload with no english flash. a reload always starts at the top of the page (scroll restoration is off).
