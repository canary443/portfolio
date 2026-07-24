# CLAUDE.md — project memory

This is the persistent memory file for AI agents working on this project. Read RULES.md before doing anything — its rules are mandatory. The docs (README.md, DESIGN.md, STRUCTURE.md, SECURITY.md, HANDOFF.md) are reference material and may be written in normal, detailed English — the simple-English rule applies to commits and code comments only.

## What this project is
Personal portfolio site **AimworkSpace** for a full stack developer (nickname: aimwork, tg @sickbuddy, email contact@leet-cheats.xyz). Next.js 14 (App Router) + TypeScript, app at the repo root:
- `app/page.tsx` — public site (dark, Hyperstudio-style, EN with RU toggle)
- `app/admin/page.tsx` — password-gated admin panel that edits all content
- `app/api/admin/session/route.ts` — login / session check / logout; passphrase comes from the `ADMIN_PASSWORD` env var, session is an httpOnly cookie, rate limiting is per-IP server-side
- `lib/data.ts` — shared data layer (types, defaults, localStorage cache under key `zx_data_v2`, plus `loadRemote` / `saveRemote`)
- `app/api/content/route.ts` — shared content on Vercel Blob (`site.json`); GET is public, PUT needs the admin cookie
- `lib/session.ts` — admin session token sign / check, shared by both API routes

## Required skills
Before any UI / design / motion / React work in this repo, load these skills first:
- `emil-design-eng` (Emil Kowalski design engineering)
- `apple-design` (fluid interfaces, springs, materials)
- motion skills: `find-animation-opportunities` / `improve-animations` (pick per task)
- `vercel:react-best-practices` (after editing TSX components)

## Hard rules (short form — full text in RULES.md)
- Git commit messages: simple English (A1 level), short, no AI/Claude mentions, no `Co-Authored-By` trailers — ever.
- Commits are made from the currently active `gh` CLI account. Never override git identity.
- Code comments: lowercase, simple English (A1). Example: `// load data from storage`
- No long dashes (—) in UI copy. Use `-` or `·`.
- Site copy: English default, Russian via the built-in RU toggle. All new user-facing strings need both languages (`*Ru` fields fall back to EN when empty).
- Prices stored in USD; the site shows `$450` plus the `≈ RUB` conversion in both locales (rate cached from the exchange API in `lib/data.ts`).

## Key implementation facts
- Content model lives in `lib/data.ts` DEFAULTS. The admin writes the whole object to localStorage (fast local cache) and PUTs it to `/api/content`, which stores `site.json` in the Vercel Blob store `portfolio-content` (private). The public page paints from the local cache, then replaces it with the server copy. First admin visit with an empty store uploads the local content, so nothing is lost. HANDOFF.md holds the Supabase plan if a real database is ever needed.
- Media (photos, video) is still base64 inside that JSON. A save over ~4mb is rejected by the API - move media to separate blob uploads when it gets tight.
- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are set in `.env.local` locally and in Vercel env vars. Do not write the literal passphrase into any committed file; ask the owner if you need it. The owner plans to rotate it before the real launch.
- Deploy: Vercel project `aimworkspace` (team `t3rmynals-projects`). The owner connects the custom domain manually.
- Motion: lenis smooth scroll (lerp .09); Safari gets cheaper compositing (no mix-blend-mode on cursor/grain, lighter blur); `prefers-reduced-motion` is respected everywhere (no lenis, no parallax, fades instead of slides, native cursor).
- The hero dot-art image is `public/assets/hero-hands.avif`; partner logos in `public/assets/`.
- Fonts: Satoshi (Fontshare); the Cyrillic companion for RU is admin-selectable (`fontRu`: Onest default, Carlito, Jost - all loaded from Google Fonts). Icons: simpleicons CDN.
