# HANDOFF.md

How to move this site from localStorage content to a real backend, when that day comes. The current app is the source of truth for design and behavior; this file maps it to the production data stack.

## Stack
- **Next.js (App Router) on Vercel** — already in place; add SSG/ISR for the public page and API routes for admin actions.
- **Supabase** — Postgres + Storage (images), anon key with RLS for the public read path.
- Fonts and icons stay as they are (Satoshi from Fontshare, Onest from Google, simpleicons CDN) or get inlined at build.

## Database schema (mirrors `lib/data.ts`)
```sql
create table settings (
  id int primary key default 1,
  telegram text, github text, email text,
  about text, about_ru text
);
create table services (
  id uuid primary key default gen_random_uuid(),
  sort int, glyph text, icon_url text,
  title text, title_ru text, descr text, descr_ru text
);
create table works (            -- "projects for sale" cards
  id uuid primary key default gen_random_uuid(),
  sort int, title text, title_ru text,
  descr text, descr_ru text,
  img_urls text[], video_url text, link text, price text, made_date text
);
create table team_projects (
  id uuid primary key default gen_random_uuid(),
  sort int, name text, role text, role_ru text,
  date_from text, date_to text, link text, img_url text
);
create table faq (
  id uuid primary key default gen_random_uuid(),
  sort int, q text, q_ru text, a text, a_ru text
);
```
`sort` columns replace array order (the admin drag-reorder writes new sort values).

## API surface (admin routes, all behind the existing session cookie + rate limit)
- `POST/GET/DELETE /api/admin/session` — already implemented (env passphrase, httpOnly cookie).
- `PUT /api/settings`, `PUT /api/about`
- `POST/PUT/DELETE /api/{services|works|team-projects|faq}`
- `POST /api/{services|works|faq}/reorder` — array of ids in new order
- `POST /api/upload` — image → Supabase Storage, returns public URL (validate size/type server-side)

## Migration path
Replace `loadData`/`saveData` in `lib/data.ts` with API calls (public read can stay client-side or move to server components). Everything else — components, i18n, motion — stays untouched.

## Behavior to preserve
- EN/RU toggle: all `*Ru` fields fall back to EN when empty; locale persisted client-side.
- RU price shows bare value (`$450`), EN shows `made for $450`.
- Cards without an image show the striped "NO PIC" placeholder.
- FAQ order = admin drag order.
- About text formatting: `**bold**`, `*italic*`, `[text](url)`, blank line = spacer (tiny parser in `app/page.tsx`).
- All motion specifics are documented in DESIGN.md — keep the easings and the curtain/pin scroll exactly.

## Nice-to-have after launch
- OG image + meta per locale; sitemap; analytics (Plausible or Vercel Analytics); uptime ping for the admin.
