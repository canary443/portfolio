# AGENTS.md — project memory

This is the persistent memory file for AI agents working on this project (CLAUDE.md is the same file for Claude - keep the two in sync). Read RULES.md before doing anything — its rules are mandatory. The docs (README.md, DESIGN.md, STRUCTURE.md, SECURITY.md, HANDOFF.md, docs/EFFECTS.md for the effects system) are reference material and may be written in normal, detailed English — the simple-English rule applies to commits and code comments only.

## What this project is
Personal portfolio site **AimworkSpace** for a full stack developer (nickname: aimwork, tg @sickbuddy, email contact@leet-cheats.xyz). Next.js 15 (App Router) + React 19 + TypeScript, app at the repo root:
- `app/page.tsx` — tiny server wrapper: reads the shared content and the `zx_lang` cookie, then renders `app/site.tsx`
- `app/site.tsx` — the public site itself, a client component (dark, Hyperstudio-style, EN with RU toggle). All page markup lives here
- `app/admin/page.tsx` — password-gated admin panel that edits all content
- `app/api/admin/session/route.ts` — login / session check / logout; passphrase comes from the `ADMIN_PASSWORD` env var, session is an httpOnly cookie, rate limiting is per-IP server-side
- `app/api/content/route.ts` — shared content on Vercel Blob (`site.json`); GET is public, PUT needs the admin cookie
- `app/api/upload/route.ts` — admin-only media upload to Supabase storage; takes a data url or a link to copy, returns a public url
- `lib/data.ts` — shared data layer (types, defaults, localStorage cache under key `zx_data_v2`, plus `loadRemote` / `saveRemote`)

## Required skills
Before any UI / design / motion / React work in this repo, load these skills first:
- `emil-design-eng` (Emil Kowalski design engineering)
- `apple-design` (fluid interfaces, springs, materials)
- motion skills: `find-animation-opportunities` / `improve-animations` (pick per task)
- `vercel:react-best-practices` (after editing TSX components)

## Hard rules (short form — full text in RULES.md)
- Git commit messages: simple English (A1 level), short, no AI/Codex mentions, no `Co-Authored-By` trailers — ever.
- Commits are made from the currently active `gh` CLI account. Never override git identity.
- Code comments: lowercase, simple English (A1). Example: `// load data from storage`
- No long dashes (—) in UI copy. Use `-` or `·`.
- Site copy: English default, Russian via the built-in RU toggle. All new user-facing strings need both languages (`*Ru` fields fall back to EN when empty).
- Prices stored in USD; the site shows `$450` plus the `≈ RUB` conversion in both locales (rate cached from the exchange API in `lib/data.ts`).

## Key implementation facts
- Content model lives in `lib/data.ts` DEFAULTS. The admin PUTs the whole object to `/api/content`, which stores `site.json` in the Vercel Blob store `portfolio-content` (private), and mirrors it into localStorage as a cache. `app/page.tsx` reads the content server side (`lib/content.ts`) and passes it in as props, so the first paint is already real; `app/site.tsx` re-pulls with `loadRemote()` on window focus. HANDOFF.md holds the Supabase plan if a real database is ever needed.
- Media: new uploads (photos, gifs, video) go through `/api/upload` to Supabase storage and are stored in the content JSON as public urls (admin only, 25mb cap, jpeg/png/webp/svg/gif/mp4/webm). Older media is still base64 inside `site.json`, and without Supabase config the upload keeps the base64. `/api/content` rejects a save over ~4mb.
- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are set in `.env.local` locally and in Vercel env vars. Do not write the literal passphrase into any committed file; ask the owner if you need it. The owner plans to rotate it before the real launch.
- Deploy: Vercel project `aimworkspace` (team `t3rmynals-projects`). The owner connects the custom domain manually.
- Motion: lenis smooth scroll (lerp .09); Safari gets cheaper compositing (no mix-blend-mode on cursor/grain, lighter blur); `prefers-reduced-motion` is respected everywhere (no lenis, no parallax, fades instead of slides, native cursor).
- The hero art is admin-switchable (`heroArt`): ascii cat `public/assets/kitokat-ascii-fine.avif` (default, rendered from `kitokat-raw.jpg`), braille cat `public/assets/kitokat-braille.avif`, dot-art hands `public/assets/hero-hands.*`, or an upload. an upload comes in two flavours: `custom` runs the picture through the ascii renderer (`lib/ascii.ts`) so it keeps the glyphs-on-black look and is stored in `heroArtCustom` (pasted ascii / braille art goes down the same path), while `media` keeps a photo, gif or video exactly as it is in `heroArtMedia`, with `heroArtMediaPoster` as the still frame for reduced motion. `media` is the only art that is not zoomed to 1.06, so a photo is never cropped. partner logos in `public/assets/`.
- The hero background is `heroBg`: `image` (plain hero art), one of the webgl presets (`pixel-blast`, `dither`, `threads`, `liquid-chrome`, fine pointer + webgl only), or `gif` - an uploaded gif or video (`heroBgGif`) with a still poster (`heroBgGifPoster`) used when the visitor asks for less motion, plus its own opacity (`heroBgGifOpacity`, 10-100). With no file uploaded `gif` falls back to `image`.
- Fonts are self-hosted: `app/fonts.css` + the woff2 files in `public/fonts` (Satoshi 400/500 and the Cyrillic companions Onest / Carlito / Jost, ~217kb). Keep the family names `'Satoshi'`, `'Onest'`, `'Carlito'`, `'Jost'` - the runtime font stacks are built from those strings. The RU companion is admin-selectable (`fontRu`), and every interface string can override it per key via `i18nFontRu`.
- Brand icons are inline SVG in `components/BrandIcons.tsx`. No third-party CDN is used at runtime (Fontshare, Google Fonts and cdn.simpleicons.org are all gone - they are slow or blocked for the Russian audience).
