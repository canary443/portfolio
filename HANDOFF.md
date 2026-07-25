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

## Site audit (2026-07-25) - improvement backlog

Full review of `app/site.tsx`, `app/globals.css`, `lib/data.ts`, `lib/i18n.ts`, `app/layout.tsx`,
`components/MediaCarousel.tsx`. Motion and visual craft are already solid (reduced-motion handled
everywhere, Safari branches, stagger, `:active` press states, exit faster than entry, SSR content
with no flash). The real leverage is in the five areas below.

### 1. Content (highest leverage, not code)
Default work cards still show "NO PIC" placeholders and an unnamed team project with no links.
No real screenshots/video or client quotes will outweigh any code change below. Add real media per
work item, and consider a short client-quote field per card or in the modal.

### 2. Accessibility - keyboard nav is largely broken
Most interactive elements are `div`/`span` with `onClick`, unreachable by keyboard/screen reader:

| Location | Problem | Fix |
| --- | --- | --- |
| FAQ rows, `app/site.tsx:655` | `div onClick`, not focusable | `<button>` + `aria-expanded` |
| Project cards, `app/site.tsx:561` | `<a>` with no `href` when `link` is empty - never focusable | render as `<button>`, or keep `href` and guard the click handler |
| Language switcher, `app/site.tsx:436` | `div onClick`, no `aria-expanded`, no Escape handling | convert to `<button>` + keydown handler |
| Modal, `app/site.tsx:712` | no `role="dialog"`, `aria-modal`, focus trap, or focus return on close (Escape-to-close already works) | add the missing ARIA + focus management |
| Modal close / email-copy, `app/site.tsx:746` and `:687` | `span onClick` | `<button>` |
| Carousel arrows, `components/MediaCarousel.tsx:101` | `role="button"` but no `tabIndex`/Enter handling | use real `<button>` elements |
| Toast, `app/site.tsx:761` | screen readers never announce "copied" | add `aria-live="polite"` |

Roughly an evening of work; would also clear the Lighthouse Accessibility score.

### 3. External CDN dependency (relevant for the RU audience)
- Every stack/social icon, including the icon inside the primary CTA button, loads from
  `cdn.simpleicons.org` at runtime. Third-party CDNs are frequently slow or blocked from Russia -
  inline the SVGs or serve them from `public/`.
- Fonts: two blocking stylesheet requests (Fontshare + Google Fonts) in `app/layout.tsx:38-40`, and
  **all three** Cyrillic font families (Onest/Carlito/Jost) load even though only one (`fontRu`) is
  ever active. Google Fonts is also unreliable from Russia. Self-host via `next/font/local` to drop
  both the render-blocking request and the CDN dependency.

### 4. SEO - cheap wins currently missing
- No `robots.txt` / `sitemap.xml` (trivial to add as files under `app/`).
- No JSON-LD (`Person`/`ProfessionalService` with services + price range).
- No `hreflang` alternates between the `en`/`ru` versions.
- OG description in `app/layout.tsx:12` ("@aimwork portfolio") undersells the pitch - Telegram
  sharing is a primary channel for this site. Something like "Sites, bots and automation. 3-14
  days, reply within 24h" converts better on a link preview card.

### 5. Performance / infra
- No analytics at all - can't see scroll depth or CTA click-through. `@vercel/analytics` is a
  one-line add to `app/layout.tsx`.
- `app/page.tsx:8` is `force-dynamic`, so every visit round-trips to Blob storage. Switch to ISR
  (`revalidate`) or call `revalidateTag` from the `/api/content` PUT handler to cut TTFB.
- Hero art has no reserved aspect ratio, so it causes a layout shift while it loads - give the
  container a fixed `aspect-ratio`. The ascii-cat PNG fallback is 644KB; the AVIF (284KB) is fine.
- Media is still base64-inlined inside `site.json` (known 4MB PUT limit, see the media note in
  CLAUDE.md) - continue the move to `aimworkspace-media` Supabase storage already started.

### Minor motion polish (optional, taste call)
- Nav pill morph is `.6s` (`app/site.tsx:427`); canonical UI timing is 300-450ms. Current value
  reads as an intentional "cinematic" morph - fine to leave, but `.45s` would feel tighter if it
  ever feels slow in review.
- FAQ chevron (`▾`) is a text glyph and renders inconsistently across fonts; an inline SVG arrow
  would be more stable.
