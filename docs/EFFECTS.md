# EFFECTS.md — visual effects system + codebase reference

This file is the reference for the ReactBits effects system and the site architecture facts
behind it. It exists so future work does not need to re-explore the codebase. Written in normal
English (the simple-English rule is for commits and code comments only).

The hero block (its WebGL backgrounds, the ascii art, the headline reveal, the video sound pass)
was removed on 2026-07-29 together with the FAQ, the prices and the footer. The page opens with the
About block now. What follows describes what is left; `git log` has the old hero if it is ever
wanted back.

## The effects system in one paragraph

Every effect is an on/off or selector option stored in the shared content (`SiteData` in
`lib/data.ts`) and edited from the admin settings page. The public site reads those fields and
mounts the matching effect. The one WebGL effect left is the pixel-trail cursor, lazy-loaded
(`next/dynamic`, `ssr:false`) inside `components/fx/PixelTrailCursor.tsx` and gated in
`app/site.tsx`, not by a hook: `webglSupported()` from `lib/fx.ts` probes a real `webgl2`/`webgl`
context once and caches the answer, and `fineOk` is `(pointer:fine)` **and** not
`prefers-reduced-motion`. So a phone, a browser without WebGL, or a visitor who asked for less
motion gets the native cursor instead. Safari is not excluded there - the only Safari carve-out is
the dot cursor.

## Effect fields on `SiteData`

Flat top-level fields (flat, not nested — see the merge note below):

| Field | Type | Default | What it controls |
|---|---|---|---|
| `cursorStyle` | `'dot' \| 'pixel-trail' \| 'target' \| 'native'` | `dot` | Cursor. `target` = ReactBits TargetCursor (4 corners lock onto links/buttons/cards). Reduced-motion / touch force the plain cursor, `pixel-trail` also needs real WebGL, and `dot` is off on Safari too. |
| `fxGradualBlur` | `boolean` | `true` | Progressive blur strip fixed to the bottom edge of the viewport (`target="page"`, pure CSS backdrop-filter). |
| `fxCardTilt` | `boolean` | `false` | Subtle tilt on the project cards. The cursor spotlight next to it is the build-time `config.spotlight` flag, not this one. |
| `showServices` | `boolean` | `true` | The "what I do" cards. Off also drops the Services link from the nav. |
| `showStack` | `boolean` | `true` | The moving tech-stack strip (`LogoLoop`). |

All of these must also be listed in `SECTION_KEYS.settings` in `app/admin/page.tsx` so the JSON
export/import includes them. `fontRu` rides in the same list; `i18n` and `i18nFontRu` belong to the
`i18n` section instead.

## What reduced motion does to each of them

`prefers-reduced-motion: reduce` is read once after mount into `reduced.current`, and mirrored into
`motionOk` (state) and `fineOk` (`(pointer:fine)` and full motion).

| Effect | Under reduced motion |
|---|---|
| cursors | dot / pixel-trail / target all off, native cursor |
| card tilt | off (`fineOk`) |
| page entrance (`.in0`-`.in3`) | plain .4s fade instead of the rise |
| card reveal on scroll | fade only, no rise, no blur |
| gradual blur | stays on - it is a static blur, nothing moves |
| stack marquee (`LogoLoop`) | the track is parked and no rAF loop is ever started |
| card media carousel | no playback and no auto advance |
| lenis smooth scroll | not created at all |

## ReactBits catalog + dependency weight (registry `@react-bits`, use `-TS-TW` variants)

Install with `npx shadcn@latest add @react-bits/<Name>-TS-TW`. It vendors the component and
auto-installs the npm deps below.

Vendored today, in `components/` (the `fx/` wrappers import them):

| Component | Purpose | npm deps it really imports | Weight |
|---|---|---|---|
| `GradualBlur` | progressive blur strip | none (pure CSS/React) | free |
| `LogoLoop` | the stack marquee, styles in `globals.css` | none (CSS + rAF) | free |
| `TargetCursor` | 4-corner cursor that locks onto targets | gsap | light |
| `PixelTrail` | pixelated cursor trail | @react-three/fiber + drei + three | medium |

`Threads`, `LiquidChrome`, `Dither` and `PixelBlast` were the hero backgrounds and are gone with it,
so `ogl`, `postprocessing` and `@react-three/postprocessing` left `package.json` too. Dark
backgrounds available if a background is ever wanted again: DarkVeil, Silk, Plasma, Aurora, Beams,
LightRays, Particles, Iridescence, LiquidEther, Prism, Orb, LetterGlitch, FaultyTerminal.

### Local changes to the vendored components (do not lose these on a re-install)

- `GradualBlur` — `useStableProps` holds one props identity while the scalar values match (they are
  joined into a signature string; `children` and `style` stay compared by reference), so the
  `config`, `blurDivs` and `containerStyle` memos below it really cache.
- `LogoLoop` — watches `prefers-reduced-motion` through a `matchMedia` listener. When it is on, the
  track is parked at its current offset and the rAF loop is never started.

## Codebase facts

### Stack
- Next.js 15 App Router, React 19, TypeScript, Tailwind v3 with **preflight OFF** (Tailwind only
  serves the vendored components - the animate-ui icons, the shadcn carousel and every ReactBits one
  below, they all ship with utility classes; the site itself is hand-styled with inline styles +
  CSS vars).
- Deps: `lenis` (smooth scroll), `motion` v12 (framer-motion successor, import from `motion/react`),
  `gsap` (TargetCursor only), `three` + `@react-three/fiber` + `drei` (PixelTrail),
  `embla-carousel-react` + `-fade` (MediaCarousel), `@vercel/blob` (content),
  `@supabase/supabase-js` (media uploads), `@vercel/analytics`, `clsx`, `tailwind-merge`. `cn()` in
  `lib/utils.ts`. `maath` and `@phosphor-icons/react` are in `package.json` but nothing in `app/`,
  `components/` or `lib/` imports them.
- `next.config.mjs` carries the security headers (HSTS, nosniff, `X-Frame-Options: SAMEORIGIN`,
  Referrer-Policy, Permissions-Policy, a **report-only** CSP, `X-Robots-Tag: noindex` for `/admin`)
  and `reactStrictMode`. No `transpilePackages`/webpack tweaks so far.

### Where things live
- `app/page.tsx` — server, `force-dynamic`; reads content with `readContent()`, picks the language
  with `pickLang(cookie, accept-language)`, renders `<Site initial={...} initialLang={...}/>`.
- `app/site.tsx` — `'use client'`, the **entire site inline** (nav, language picker, about, services,
  stack marquee, work cards + carousels + modal, the two contact links, grain, custom cursor). No
  per-section files. Page order: about → partner logos → services (off) → stack (off) → work →
  Telegram/GitHub. No hero, no faq, no footer.
- `components/fx/` — the wrappers `site.tsx` mounts: `PixelTrailCursor`, `TargetCursorFx`. The lazy
  `next/dynamic` imports live in these files, not in `site.tsx`.
- `components/animate-ui/` — 4 animated SVG icons + `AnimateIcon` controller + `slot.tsx` + a
  `reveal` primitive used for the card scroll reveal. `hooks/use-is-in-view.tsx` wraps `useInView`.
  These are the only users of `motion`.
- `app/globals.css` — single dark `:root` palette (`--bg:#101010`, `--text:#f3f3f3`,
  `--muted:#9c9c9c`, `--line:#212121`, ...). No light theme. Keyframes `zxin/zxmarq/zxfade/zxmodal`
  plus the exit pair `zxmodalout/zxfadeout` (exits are their own keyframes: swapping inline styles
  while the entry animation unmounts makes browsers skip the transition). Admin classes
  `.ainput/.abtn/.aghost/.anav`, the `.bare` button reset and the `.logoloop` block for the marquee.
- `app/fonts.css` — self-hosted `@font-face` for Satoshi / Onest / Carlito / Jost out of
  `public/fonts`. No font CDN at runtime; the family names are load-bearing, `site.tsx` and the
  admin build font stacks from those strings.
- `lib/config.ts` — build-time flags (`spotlight`, `grain`). Not admin-editable; the effect toggles
  live in `SiteData`.

### Page opening — `app/site.tsx`
- The About block opens the page: `<h1>` with the `aboutH` string, the about text through the tiny
  markdown renderer (`**bold**`, `*italic*`, `[text](url)`, an empty line is a spacer), the admin
  gif/photo, then the location line. It carries the staggered entrance (`.in0`-`.in3`).
- The partner logos (leet-cheats, binware) sit right under it behind a hairline, with no label.
- There is no sticky hero and no curtain sheet any more, so the scroll handler only flips the nav
  between the top bar and the glass pill.

### Motion system (respect it)
- Lenis `{ lerp:0.09, autoRaf:true }`, only when `(pointer:fine)` and not reduced-motion.
- `reduced.current` / `motionOk` / `fineOk` / `webglOk` and `safari` are all detected in one effect
  right after the flags. Custom cursor off on Safari.
- Reduced-motion: no lenis, reveal-all, no autoplay, fades not slides, native cursor.
- Safari branches: lighter nav blur, grain without mix-blend, lighter modal blur.

### Data model — `lib/data.ts`
- `SiteData` = flat keys (`about, aboutRu?, telegram, github, email, services[], works[],
  projects[]`) + the effect fields. `DEFAULTS` holds shipped values. Cache key `zx_data_v2`.
- Merge is **shallow**: `{ ...DEFAULTS, ...stored }` in `loadData`/`loadRemote` and
  `lib/content.ts readContent`. So new flat fields auto-backfill for old stored blobs — that is why
  effect settings are flat fields, not a nested object. Keys that were dropped (the `hero*` fields,
  `faq`, a work's `price`) stay in the stored json and are simply ignored.
- Save path: `saveRemote` PUT `/api/content` (server = source of truth), then `saveData` to
  localStorage. Whole object round-trips each save. The admin's `persist()` queues saves and merges
  only the keys that really changed onto the current data, so a stale full object can not push old
  values over a newer save.
- i18n `*Ru` fallback at render: `ru && x.Ru ? x.Ru : x`. Static chrome strings in `lib/i18n.ts`
  (`T.en`/`T.ru`, both required for any new public-facing string), overridable per key from the
  admin through `data.i18n[lang]`, with a per-key RU font override in `data.i18nFontRu`.

### Admin — `app/admin/page.tsx`
- Sections: about|services|works|projects|**settings**|i18n|preview. The effect controls live on the
  settings page (`CURSOR_OPTS`, `FX_TOGGLES`, `SECTION_TOGGLES`).
- `SECTION_KEYS` maps sections to owned `SiteData` keys for export/import — add new fields here.
- The segmented-pill pattern (`aghost` spans with active border/color) is the switch style here.
- Write path: `persist({ ...data, field: value })`. Live preview iframe mirrors `data` to
  `localStorage['zx_preview']`; the public page listens for the `storage` event.
