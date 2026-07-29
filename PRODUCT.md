# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Russian-speaking clients who already talk to the owner in Telegram. They get the link
mid-conversation and open it to check that the person on the other side is real and can build the
thing. They are not browsing a market; they are confirming a decision they have half made.

Secondary (observed, not confirmed by the owner): developers and peers who get the link passed
around in chats, and anyone who lands from search on the English side.

## Product Purpose

One personal page that answers "who is this and what has he built" in under a minute, so the
Telegram conversation can continue with proof behind it. Success is the visitor writing in Telegram
(or coming back to the chat convinced). Nothing on the page tries to close a deal: the owner does
that himself in DM.

## Positioning

A 17 year old full stack developer in Germany (coding since 2025) who ships across web, Telegram
bots, automation and game-adjacent internals - the same person does the frontend, the backend and
the deploy. The page leans on the actual body of work (leet-cheats.xyz, binware.su, shop bots,
internal tooling) and a personal, non-agency voice. A neighbouring freelancer page could copy the
layout but not the project list or the voice.

## Operating Context

- The visitor almost always arrives from a Telegram DM, on a phone as often as a desktop.
- The owner edits every word and every picture himself from a password-gated admin at `/admin`; there
  is no CMS, no team and no review step. Content lives in one `site.json` on Vercel Blob, media in
  Supabase storage.
- The page is one URL. Both languages live on it, English by default.

## Capabilities and Constraints

- Bilingual EN / RU. Every user-facing string needs both; RU falls back to EN when empty.
- **English is the default for everyone**, whatever the browser asks for. Only the visitor's own pick
  in the switcher changes it (owner's call, 2026-07-29). Before that date the server followed
  `Accept-Language`.
- All content is admin-editable and lives in the content JSON. Nothing user-facing gets hardcoded
  into the markup.
- Nothing loads from a third-party CDN at runtime (fonts, icons, scripts are all self-hosted): CDNs
  are slow or blocked for the Russian audience.
- No prices, no service pitch, no FAQ, no footer on the public page (owner's call, 2026-07-29). The
  page is About → partner logos → work → Telegram + GitHub. The services block and the tech-stack
  strip still exist behind admin switches and are currently off.
- Free-tier infrastructure: Vercel (hobby) + Supabase. A daily cron keeps the Supabase project
  awake. Content saves are capped at ~4mb, so media goes to storage, never inline.
- Only the owner writes: the admin session is a signed httpOnly cookie, the login is rate limited
  per IP and guarded by Vercel BotID.

## Brand Commitments

- Name: **AimworkSpace**, handle **aimwork** (Telegram `@aimwork`, GitHub `canary443`).
- Identity is the nickname only: no real name, no face photo anywhere on the page (observed in the
  live content, not stated as a rule by the owner).
- Voice: lowercase, short, dev-culture, a bit meme-y ("i use gentoo linux btw", the cat gif). Never
  agency-speak, never "we".
- No long dashes in copy. No emoji in the interface chrome (the owner's own body copy may use them).
- Dark, near-black canvas with hairlines and Satoshi type: the look is documented in DESIGN.md and is
  the incumbent authority for visual work.

## Evidence on Hand

- The live `site.json` is real content, confirmed by the owner 2026-07-29: 8 work items with
  screenshots and links (Leet Cheats menu recode and web frontend, CS2 internal cheat, Kinetica TG
  shopbot, cheat checker, Spotify UI, hosting company landing, URL shortener) and 2 team projects
  (Leet Cheats, frontend dev, 2026.01-2026.05; Binware, fullstack + devops, 2026.05-present).
- Partner logos: `public/assets/leet-cheats.svg`, `public/assets/binware.svg`.
- The demo content in `lib/data.ts` DEFAULTS is **not** evidence; it is placeholder text.
- There are no testimonials, no client names beyond the two partners, no metrics, no press and no
  case studies. Do not invent any.

## Product Principles

1. The work is the argument. Show projects and let the visitor judge; never sell in copy.
2. The owner closes in Telegram, the page does not. Every element earns its place by informing, not
   by converting.
3. Nothing on the page is hardcoded: if it is content, it is editable from the admin.
4. The Russian audience is first-class, not a translation afterthought - and nothing on the page may
   depend on a service that is slow or blocked for them.
5. Personal over professional. The page should read like one person, not like a studio.

## Accessibility & Inclusion

No formal standard was set, but the current level is a baseline to keep: every hit target is a real
button, keyboard focus is visible, the project modal traps focus and returns it, and
`prefers-reduced-motion` is honoured everywhere (no smooth scroll, fades instead of slides, native
cursor, no autoplay).
