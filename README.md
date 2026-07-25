# aimworkspace

personal portfolio site. dark single page + a password gated admin panel. content lives in one `site.json` in a vercel blob store and is read on the server, so the first paint already has the real text; uploaded media goes to supabase storage.

## stack

- next.js 15 (app router) + react 19 + typescript
- `app/page.tsx` is a small server wrapper (reads the content and the language), all public markup lives in `app/site.tsx`
- vercel blob for the content file, supabase storage for uploaded media
- lenis for the smooth scroll, motion for the reveals, embla for the media carousels
- three + ogl for the optional webgl hero backgrounds (fine pointer and real webgl only)
- satoshi for type, self-hosted from `public/fonts`; the cyrillic companion for the RU locale is picked in the admin (onest by default, carlito or jost) and can differ per interface string
- brand icons are inline svg in `components/BrandIcons.tsx`, no cdn at runtime

## run it

```bash
npm install
npm run dev
```

- site: http://localhost:3000
- admin: http://localhost:3000/admin

other scripts: `npm run build`, `npm run start`, and two static checks that read `app/site.tsx` - `npm run test:cursor` and `npm run test:no-magnetic`.

## env

copy `.env.example` to `.env.local` and set:

- `ADMIN_PASSWORD` - passphrase for /admin
- `ADMIN_SESSION_SECRET` - signs the admin session cookie (optional locally, required in prod)
- `BLOB_READ_WRITE_TOKEN` - vercel blob store that holds `site.json`
- `CRON_SECRET` - locks `/api/keepalive`; the vercel cron sends it as `Authorization: Bearer <value>`, and an empty value leaves the route open

- `GOOGLE_SITE_VERIFICATION` / `YANDEX_VERIFICATION` - the `content` value of the meta tag google search console and yandex webmaster hand out. optional: with nothing set no tag is printed

media uploads also need supabase, and those keys are not in `.env.example` yet - copy them from the supabase project into `.env.local`:

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (the upload api falls back to `SUPABASE_ANON_KEY`, and the daily keepalive cron in `vercel.json` uses the anon key). without them the upload api answers "no supabase" and the media stays inline as base64

## search engines

what the site serves crawlers:

- `/robots.txt` (`app/robots.ts`) - allow everything except `/admin`, `/api` and `/*?preview=`. ai crawlers (GPTBot, ClaudeBot, PerplexityBot and friends) are listed and allowed on purpose: a portfolio wants to be quotable
- `/sitemap.xml` (`app/sitemap.ts`) - the one url
- `/llms.txt` (`app/llms.txt/route.ts`) - about, services, work and faq as plain text, built from the live content so it cannot drift. cached for an hour
- `app/layout.tsx` - canonical `/`, `index, follow` plus the googlebot preview limits, og/twitter, ProfessionalService json-ld, and the two verification meta tags when the env vars are set

both languages share one url, so there is no hreflang on purpose - `og:locale` is `en_US` with `ru_RU` as the alternate.

registering the site is a one-time manual job: add the property in [search console](https://search.google.com/search-console) and [yandex webmaster](https://webmaster.yandex.ru/), pick the html-tag method, put the code in the vercel env var, redeploy, then hit verify and submit `https://aimwork.space/sitemap.xml` in both.

## notes

every admin save goes to `site.json` in the vercel blob store first, then into the browser's localStorage as a best effort cache, so every browser sees the same site and a full cache never blocks a save. the login check, rate limit and the content write run server side. media picked in the admin is posted to `/api/upload` first and lands in the content json as a public supabase url; old media that still sits inline can be moved to storage from the admin settings page.

the language pick is kept in a cookie, and until a visitor picks one the server reads `Accept-Language` (only `ru` maps to russian), so the first paint is already in the right language. a reload always starts at the top of the page (scroll restoration is off).
