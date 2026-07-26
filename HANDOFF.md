# HANDOFF.md

This file is only for AI agents. Where the content lives today, and how to move it to a real database when that day comes. The current app is the source of truth for design and behavior; this file maps it to the production data stack.

## Starting point (what is already built)
The old version of this file assumed the content still sat in localStorage. That has not been true for a while. As of 2026-07-25:

- **Content** — one `site.json` in a private Vercel Blob store. Read server-side by `readContent()` in `lib/content.ts` and passed into the page, so the first paint already has real content. Written whole by `PUT /api/content`: admin cookie, 4mb body cap, shape check before the write. `lib/data.ts` holds the types and `DEFAULTS` plus the client side of the same route (`loadRemote` / `saveRemote`).
- **Media** — Supabase Storage, bucket `media`, files at `uploads/<uuid>.<ext>`, served as public urls. Everything goes through `POST /api/upload` (admin cookie, 25mb cap, mime allowlist, extension taken from the mime). It accepts a data url from the browser *or* a foreign link, which it fetches and copies into our own bucket so a signed cdn link cannot expire under us. Client helpers: `uploadMedia`, `importUrl`, `inStorage`, `fileToDataUrl`, `firstFrame`, `isVideoSrc` in `lib/img.ts`. The live content json holds only urls - no base64 left.
- **Postgres** — the only table the app knows about in the same Supabase project is `keepalive`, poked daily by a Vercel cron (`vercel.json` → `/api/keepalive`) so a free project is not paused for inactivity. No content tables exist.
- **Admin** — `POST/GET/DELETE /api/admin/session` (env passphrase, signed httpOnly cookie, per-IP rate limit). localStorage (`zx_data_v2`) survives only as the admin's own cache; the public page does not read it any more.

So the remaining move is not "localStorage → backend". It is "one json blob → rows", and only when the blob stops being enough.

## When the move is worth doing
The json is ~12kb, one read per request, one write per save. Reasons to switch: two people editing at once (the whole-object PUT is last-write-wins and silently overwrites), per-item history or drafts, or a list growing big enough that sending all of it on every request costs something. None of those are true today.

## Database schema (sketch, mirrors `lib/data.ts`)
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
Two gaps to close before using this as written: the sketch predates several fields the model now has
(`works.imgs[]` + `works.video` are covered, but `changelog` on works and team projects is not, and
neither are the hero / effect / font settings and the per-string i18n overrides). Simplest split:
one `settings` row with a `jsonb` column for everything that is site-wide, and a `jsonb changelog`
column per item. All image and video columns hold Supabase Storage urls already, so nothing binary
ever goes into Postgres.

## API surface (admin routes, all behind the existing session cookie + rate limit)
- `POST/GET/DELETE /api/admin/session` — **built** (env passphrase, httpOnly cookie).
- `POST /api/upload` — **built**: data url or foreign link → Supabase Storage, returns the public url, size/type checked server-side.
- `GET/PUT /api/content` — **built**, but whole-object: it is what the per-entity routes below would replace.
- `PUT /api/settings`, `PUT /api/about`
- `POST/PUT/DELETE /api/{services|works|team-projects|faq}`
- `POST /api/{services|works|faq}/reorder` — array of ids in new order

## Migration path
Swap the three functions that touch the blob - `readContent` in `lib/content.ts` (server read) and
`loadRemote` / `saveRemote` in `lib/data.ts` (admin read/write) - for calls to the routes above. The
public page already reads on the server, so it keeps doing that. Media needs no migration at all: it
is in Supabase Storage already and the rows would only hold the same urls. Everything else -
components, i18n, motion - stays untouched.

## Behavior to preserve
- EN/RU toggle: all `*Ru` fields fall back to EN when empty; the pick is persisted in the `zx_lang` cookie so the server can read it.
- RU price shows bare value (`$450`), EN shows `made for $450`.
- Cards without an image show the striped "NO PIC" placeholder.
- FAQ order = admin drag order.
- About text formatting: `**bold**`, `*italic*`, `[text](url)`, blank line = spacer (tiny parser in `app/site.tsx`). A link renders as a link only for `http:`, `https:` and `mailto:` — keep that allowlist.
- Language pick: the `zx_lang` cookie wins, otherwise the server reads `Accept-Language` (`lib/lang.ts`), so `<html lang>` and the text always agree.
- All motion specifics are documented in DESIGN.md — keep the easings and the curtain/pin scroll exactly.

## Nice-to-have after launch
- Done: og image + description, `sitemap.xml` / `robots.txt`, `@vercel/analytics`.
- Still missing: any uptime ping for the site itself (the daily cron only keeps Supabase awake), and per-locale meta (one url serves both languages, see the backlog).

## Site audit (2026-07-25) - improvement backlog

The audit covered `app/site.tsx`, `app/globals.css`, `lib/data.ts`, `lib/i18n.ts`, `app/layout.tsx`,
`components/MediaCarousel.tsx`. Motion and visual craft were already solid (reduced-motion handled
everywhere, Safari branches, stagger, `:active` press states, exit faster than entry, SSR content
with no flash), and most of the rest was fixed the same day. Below is the state *after* those fixes,
re-checked against the code and against the live site on 2026-07-25.

### Done on 2026-07-25

| Was | Now |
| --- | --- |
| FAQ rows were `div onClick` | real `<button>` with `aria-expanded` / `aria-controls`; the closed answer is `inert` + `aria-hidden` and its panel is `role="group"` |
| Project cards were an `<a>` with no `href` | a `.card-hit` `<button aria-haspopup="dialog">` inside the card, so a card without a link is still focusable |
| Language switcher was `div onClick` | `<button aria-haspopup="menu" aria-expanded>`; the menu is `role="menu"` and `inert` while closed, Escape closes it and hands focus back to the trigger |
| Modal had no dialog semantics | `role="dialog"` + `aria-modal` + `aria-labelledby`, focus jumps to Close on open, Tab is trapped inside, focus returns to the card that opened it |
| Modal close and the email-copy chip were `span onClick` | real buttons, styling stripped by the `.bare` reset in `globals.css` |
| Carousel arrows were `role="button"` with no key handling | real `<button aria-label>` elements, and the modal dots too |
| Toast was invisible to screen readers | an always-mounted `role="status" aria-live="polite"` region |
| Icons came from `cdn.simpleicons.org` | inline SVG in `components/BrandIcons.tsx` (Simple Icons paths, CC0). No runtime CDN left anywhere |
| Fonts came from Fontshare + Google Fonts | self-hosted: `app/fonts.css` + `public/fonts`, 12 woff2 / 217kb total, `unicode-range` split so a Cyrillic face is fetched only when it is actually used, and only the two first-paint Satoshi faces are preloaded |
| No `robots.txt` / `sitemap.xml` | `app/robots.ts` (disallow `/admin`, `/api`) and `app/sitemap.ts`, both live |
| No JSON-LD | a static `ProfessionalService` block in `app/layout.tsx` with the service catalog and price range |
| OG description was "@aimwork portfolio" | "Sites, Telegram bots and automation. Built in 3-14 days, reply in under 24h." on both og and twitter, with the square cat image |
| No analytics | `@vercel/analytics` mounted in the layout |
| Media was base64 inside `site.json` (~3.8mb, per the note in `lib/content.ts`) | moved. The live json is ~12kb with 31 Supabase storage files and zero `data:` urls (checked over `GET /api/content`). The admin keeps the "Move N files to storage" button in Settings for anything inline that shows up later |
| Hero art caused a layout shift | the built-in arts carry a known ratio, so `aspect-ratio` holds the box from the first paint |
| Default demo content on the cards | real work: 8 cards with real screenshots and one video, and two real team projects (Leet Cheats, Binware) with links and pictures. The "unnamed startup" placeholder now only lives in `DEFAULTS`, as the demo content for an empty store |
| Nav pill morph was `.6s` | `.45s`, matching the rest of the nav transitions |
| FAQ chevron was the text glyph `▾` | an inline SVG, so it renders the same in every font |

### Still open - content
- **No client quotes.** There is no field for one on `Work` or `TeamProject` and nowhere in the
  modal to show it. This is still the highest-leverage change on the page, and it is not code.
- **5 of the 8 work cards have `-` as the price.** That renders as "made for -" in EN and a bare
  "-" in RU. Either fill in the number or give the model a real "on request" state instead of a dash.

### Still open - infra
- **No cache on the content read.** `app/page.tsx` is `force-dynamic` and `readContent()` runs
  uncached, so every visit round-trips to Blob storage. The reason for that (the Next data cache
  refuses anything over 2mb and `site.json` was ~3.8mb) is gone now that the media has moved, so
  `unstable_cache` with a tag that the `/api/content` PUT clears is unblocked - the comment at the
  top of `lib/content.ts` still describes the old situation.
- **The CSP is report-only and reports nowhere.** Flipping it to enforcing needs a nonce for the two
  inline scripts in `app/layout.tsx`. Full detail in SECURITY.md, checklist item 7.
- **Uploads are never deleted.** `/api/upload` only ever writes; replacing a card's picture leaves
  the old file in the `media` bucket forever. Nothing breaks, but the bucket grows in one direction.
- **A custom hero art still has no reserved ratio.** `heroArt: 'custom'` / `'media'` is an admin
  upload of unknown size, so `aspect-ratio` is left undefined and the hero can shift while it loads.
  Storing the uploaded file's width/height alongside the url would close it. (The live site uses
  `media` today, so this one is real, not theoretical.)
- **No `hreflang`, on purpose.** Both languages live on the same url and the switch is client-side,
  so there is no second url to point at. If the RU version ever needs to rank on its own it has to
  become a real route (`/ru`) first - that is the whole task, not a meta tag.
- The ascii-cat PNG fallback is 642kb, but it only loads when the browser cannot decode the AVIF
  (283kb) - iOS lockdown mode, basically. Not worth optimising unless that path gets common.
