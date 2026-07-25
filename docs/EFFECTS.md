# EFFECTS.md — visual effects system + codebase reference

This file is the reference for the ReactBits effects system and the site architecture facts
behind it. It exists so future work does not need to re-explore the codebase. Written in normal
English (the simple-English rule is for commits and code comments only).

## The effects system in one paragraph

Every effect is an on/off or selector option stored in the shared content (`SiteData` in
`lib/data.ts`) and edited from the admin settings page. The public site reads those fields and
mounts the matching effect. All WebGL effects are lazy-loaded (`next/dynamic`, `ssr:false`) inside
`components/fx/HeroFx.tsx` and gated in `app/site.tsx`, not by a hook: `webglSupported()` from
`lib/fx.ts` probes a real `webgl2`/`webgl` context once and caches the answer, and `fineOk` is
`(pointer:fine)` **and** not `prefers-reduced-motion`. `fxCapable = webglOk && fineOk`, so a phone,
a browser without WebGL, or a visitor who asked for less motion never mounts one and gets the plain
hero art picture instead (whatever `heroArt` points at, the ascii cat by default, and only while
`config.showMap` is on). That fallback picture waits for the probe to finish (`fxResolved`), so an
effect background never flashes the art on load. Safari is not excluded here - the only Safari
carve-out is the dot cursor.

Two options deliberately sit outside that gate: the `gif` hero background and the `media` hero art.
They are plain files, not WebGL, so they run on every device including phones and Safari. They
answer `prefers-reduced-motion` with a still frame instead of being dropped - see the reduced-motion
table further down.

## Effect fields on `SiteData`

Flat top-level fields (flat, not nested — see the merge note below):

| Field | Type | Default | What it controls |
|---|---|---|---|
| `heroBg` | `'image' \| 'gif' \| 'pixel-blast' \| 'dither' \| 'threads' \| 'liquid-chrome'` | `image` | Hero background layer. `image` mounts no layer at all, just the hero art picture (also the universal fallback). `gif` with no file uploaded silently falls back to `image`. |
| `heroPreset` | `string` | `mono` | Colour preset for the WebGL backgrounds, 12 ids in `HERO_PRESETS` (`lib/data.ts`). `mono` gives each effect its own neutral: PixelBlast takes the grey `#8f8f8f` straight, Dither and LiquidChrome get a hand-picked near-black, Threads a mid grey. Any other preset runs its hex through `hexToRgb01`. It does not touch the `gif` background. |
| `heroBgGif` | `string \| null` | `null` | The gif / photo / video behind the hero when `heroBg` is `gif`. A storage URL from `/api/upload`. It fades in on load/decode so a slow file never pops. |
| `heroBgGifPoster` | `string \| null` | `null` | Still frame for that background, used under reduced motion. The admin grabs a video's first frame by itself (`firstFrame` in `lib/img.ts`). |
| `heroBgGifOpacity` | `number` | `100` | Percent opacity of the gif background. Admin slider 10-100, clamped again to 10-100 in `HeroFx`. |
| `heroArt` | `'cat' \| 'hands' \| 'braille' \| 'custom' \| 'media'` | `cat` | The hero picture: ascii cat, dot-art hands, braille cat, `custom` (an upload auto-rendered to ascii, or pasted ascii/braille text with an upscale toggle), or `media` (a plain photo / gif / video shown as it is, no ascii pass). An option whose file is missing falls back to `cat`. |
| `heroArtCustom` | `string \| null` | `null` | The ascii picture URL for `custom`. The admin renders the upload with `lib/ascii.ts` before storing it via `/api/upload`. |
| `heroArtMedia` | `string \| null` | `null` | The photo / gif / video URL for `media`. This is the one art that is not zoomed to 1.06 - a real photo must not be cropped, so it stays at scale 1. |
| `heroArtMediaPoster` | `string \| null` | `null` | Still frame for `media`, used under reduced motion. |
| `heroArtMediaSound` | `boolean` | `true` | A video `media` art plays one pass with sound, then loops muted like a gif (`components/fx/HeroArtVideo.tsx`). `false` = silent loop from the first frame. There is no mute button, by the owner's decision. |
| `heroArtScale` | `number` | `100` | Percent multiplier on the hero art's base width. Admin slider 50-150, clamped 40-160 in `site.tsx`. |
| `cursorStyle` | `'dot' \| 'pixel-trail' \| 'target' \| 'native'` | `dot` | Cursor. `target` = ReactBits TargetCursor (4 corners lock onto links/buttons/cards). Reduced-motion / touch force the plain cursor, and `dot` is off on Safari too. |
| `fxGradualBlur` | `boolean` | `true` | Progressive blur strip fixed to the bottom edge of the viewport (`target="page"`, pure CSS backdrop-filter). |
| `fxHeadlineReveal` | `boolean` | `true` | Animated hero headline reveal (uses `motion`, not GSAP). |
| `fxCardTilt` | `boolean` | `false` | Subtle tilt on the project cards. The cursor spotlight next to it is the build-time `config.spotlight` flag, not this one. |

All of these must also be listed in `SECTION_KEYS.settings` in `app/admin/page.tsx` so the JSON
export/import includes them. `fontRu` rides in the same list; `i18n` and `i18nFontRu` belong to the
`i18n` section instead.

### The hero art sound pass — `components/fx/HeroArtVideo.tsx`

A video `media` art is meant to be heard once, whole. Browsers refuse to start a video with sound
before the visitor has interacted with the page, and that is a browser rule, not a setting we own.
So the component starts unmuted, and if the start is refused it drops straight to a silent loop and
waits for the first real gesture (`pointerdown`, `touchend`, `keydown`, `click`, all bound in the
capture phase, so the very first interaction counts). That gesture rewinds to frame one and replays
with sound, so the pass is never heard from the middle. Scrolling (`wheel`, `touchmove`, `scroll`)
is not permission by spec, but Chrome often lets it through, so it gets up to 4 tries throttled to
one per ~900ms burst. The time is only rewound once the browser has really accepted the sound, so a
refused try never makes the picture jump or stall. When the loud pass ends, `onEnded` swaps to a
muted loop. There is no mute button, by the owner's decision.

## What reduced motion does to each of them

`prefers-reduced-motion: reduce` is read once after mount into `reduced.current`, and mirrored into
`motionOk` (state) and `fineOk` (`(pointer:fine)` and full motion).

| Effect | Under reduced motion |
|---|---|
| WebGL hero backgrounds | never mounted (`fineOk` is false), the hero art picture shows instead |
| `gif` hero background | still mounted. With a poster it renders the poster as a plain `<img>`; a video with no poster gets `autoPlay`/`loop` off, so it holds its first frame; an animated gif with no poster keeps animating, because a gif cannot be paused |
| `media` hero art | same rule: the poster if there is one; otherwise a video sits on frame one (`HeroArtVideo` gets `motionOk:false`, so it never autoplays and the whole sound pass is skipped), and a gif again keeps animating |
| hero art parallax | the scroll handler returns before touching the art or the hero text |
| headline reveal | off, the plain headline renders |
| cursors | dot / pixel-trail / target all off, native cursor |
| card tilt | off (`fineOk`) |
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
| `Threads` | woven thread-line background | ogl | light |
| `LiquidChrome` | slow liquid-metal background | ogl | light |
| `PixelTrail` | pixelated cursor trail | @react-three/fiber + drei + three | medium |
| `Dither` | dithered noise background | three + @react-three/fiber + @react-three/postprocessing + postprocessing | medium |
| `PixelBlast` | exploding pixel bursts | three + postprocessing (no r3f, it drives THREE directly) | heavy |

ShapeBlur and FluidGlass were considered and never installed - there is no component and no
`fxShapeBlur` / `fxFluidGlass` field. Other dark backgrounds available if wanted later: DarkVeil,
Silk, Plasma, Aurora, Beams, LightRays, Particles, Iridescence, LiquidEther, Prism, Orb,
LetterGlitch, FaultyTerminal.

### Local changes to the vendored components (do not lose these on a re-install)

- `PixelBlast` — `disposeThree` (a `useCallback` with empty deps) cancels the rAF, disconnects the
  ResizeObserver, removes the `pointerdown`/`pointermove` listeners, disposes the quad geometry,
  material, touch texture, composer and renderer, calls `forceContextLoss()` and removes the canvas
  from the DOM. A separate `useEffect(() => disposeThree, [disposeThree])` means only a real unmount
  tears the context down; prop changes keep it alive and only `antialias`, `liquid` and
  `noiseAmount` force a rebuild.
- `LiquidChrome` — the props are copied into a ref by a tiny effect, and the ogl setup effect has an
  **empty dependency array**, so changing the colour or speed never rebuilds the renderer.
- `Dither` — `wrapEffect(RetroEffectImpl)` is called once at module scope (`WrappedRetroEffect`).
  Calling it inside the component would mint a new effect class on every render.
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
  `gsap` (TargetCursor only), `three` + `postprocessing` + `@react-three/fiber` + `-postprocessing`
  + `drei` (PixelBlast, Dither, PixelTrail), `ogl` (Threads, LiquidChrome), `embla-carousel-react` +
  `-fade` (MediaCarousel), `@vercel/blob` (content), `@supabase/supabase-js` (media uploads),
  `@vercel/analytics`, `clsx`, `tailwind-merge`. `cn()` in `lib/utils.ts`. `maath` and
  `@phosphor-icons/react` are in `package.json` but nothing in `app/`, `components/` or `lib/`
  imports them.
- `next.config.mjs` carries the security headers (HSTS, nosniff, `X-Frame-Options: SAMEORIGIN`,
  Referrer-Policy, Permissions-Policy, a **report-only** CSP, `X-Robots-Tag: noindex` for `/admin`)
  and `reactStrictMode`. No `transpilePackages`/webpack tweaks so far - no WebGL lib has needed one.

### Where things live
- `app/page.tsx` — server, `force-dynamic`; reads content with `readContent()`, picks the language
  with `pickLang(cookie, accept-language)`, renders `<Site initial={...} initialLang={...}/>`.
- `app/site.tsx` — `'use client'`, the **entire site inline** (nav, language picker, hero, services,
  stack marquee, projects + carousels + modal, about, faq, contact, footer, grain, toast, custom
  cursor). No per-section files.
- `components/fx/` — the wrappers `site.tsx` mounts: `HeroFx` (background layer + readability
  scrim), `HeroArtVideo` (the sound pass), `HeadlineReveal`, `PixelTrailCursor`, `TargetCursorFx`.
  The lazy `next/dynamic` imports live in these files, not in `site.tsx`.
- `components/animate-ui/` — 4 animated SVG icons + `AnimateIcon` controller + `slot.tsx` + a
  `reveal` primitive used for the card scroll reveal. `hooks/use-is-in-view.tsx` wraps `useInView`.
  Together with `HeadlineReveal` these are the only users of `motion`.
- `app/globals.css` — single dark `:root` palette (`--bg:#101010`, `--hero-bg:#000`,
  `--text:#f3f3f3`, `--muted:#9c9c9c`, `--line:#212121`, ...). No light theme. Keyframes
  `zxin/zxmarq/zxfade/zxmodal` plus the exit pair `zxmodalout/zxfadeout` (exits are their own
  keyframes: swapping inline styles while the entry animation unmounts makes browsers skip the
  transition). Admin classes `.ainput/.abtn/.aghost/.anav`, the `.bare` button reset and the
  `.logoloop` block for the marquee.
- `app/fonts.css` — self-hosted `@font-face` for Satoshi / Onest / Carlito / Jost out of
  `public/fonts`. No font CDN at runtime; the family names are load-bearing, `site.tsx` and the
  admin build font stacks from those strings.
- `lib/config.ts` — build-time flags (`showMap` gates the hero art picture, `showAbout`,
  `spotlight`, `grain`, `adminLink`). Not admin-editable; the effect toggles live in `SiteData`.

### Hero (the swap target) — `app/site.tsx` around lines 536-614
- Sticky container, `overflow:hidden`. `HeroFx` sits behind at `zIndex:0` when a gif or WebGL
  background is on, text in `heroRef` (parallax) and the CTAs at `zIndex:1`, then the art block.
- The art block is one inline IIFE. It resolves `heroArt` to a file (an option with no file falls
  back to the cat), picks a base width per art (`hands` 114%, `custom`/`media` 86% capped, `braille`
  32%, cat 80%) times `heroArtScale`, holds the height from `ART_RATIO` for the built-in arts, and
  applies `scale(1.06)` to everything except `media`, which stays at 1. Built-in AVIFs fall back to
  their PNG `onError` (iOS lockdown mode cannot decode AVIF). It is gated by `config.showMap` and
  hidden while a gif or WebGL background is on; otherwise a `clamp(300px,48vh,560px)` spacer keeps
  the hero tall.
- `handsRef` holds that element and can be an `<img>` **or** a `<video>`, so it is typed
  `HTMLElement`. The element carries `data-zoom` and the parallax reads the zoom back off it.
- An imperative scroll effect (~lines 234-253) mutates `handsRef` (parallax translate) and `heroRef`
  (curtain fade). **Guard `if (handsRef.current)`** — when a WebGL bg is active the element is absent.
- A rounded "sheet" slides up over the sticky hero (radius `26px 26px 0 0`).

### Motion system (respect it)
- Lenis `{ lerp:0.09, autoRaf:true }`, only when `(pointer:fine)` and not reduced-motion.
- `reduced.current` / `motionOk` / `fineOk` / `webglOk` and `safari` are all detected in one effect
  near lines 152-166. Custom cursor off on Safari.
- Reduced-motion: no lenis, no parallax, reveal-all, no autoplay, fades not slides, native cursor.
- Safari branches: lighter nav blur, grain without mix-blend, lighter modal blur.

### Data model — `lib/data.ts`
- `SiteData` = flat keys (`about, aboutRu?, telegram, github, email, services[], works[],
  projects[], faq[]`) + the new effect fields. `DEFAULTS` holds shipped values. Cache key
  `zx_data_v2`.
- Merge is **shallow**: `{ ...DEFAULTS, ...stored }` in `loadData`/`loadRemote` and
  `lib/content.ts readContent`. So new flat fields auto-backfill for old stored blobs — that is why
  effect settings are flat fields, not a nested object.
- Save path: `saveRemote` PUT `/api/content` (server = source of truth), then `saveData` to
  localStorage. Whole object round-trips each save. The admin's `persist()` queues saves and merges
  only the keys that really changed onto the current data, so a stale full object can not push old
  values over a newer save.
- i18n `*Ru` fallback at render: `ru && x.Ru ? x.Ru : x`. Static chrome strings in `lib/i18n.ts`
  (`T.en`/`T.ru`, both required for any new public-facing string), overridable per key from the
  admin through `data.i18n[lang]`, with a per-key RU font override in `data.i18nFontRu`.

### Admin — `app/admin/page.tsx`
- Sections: about|services|works|projects|faq|**settings**|i18n|preview. The effect controls live
  on the settings page (`HERO_BG_OPTS`, `HERO_ART_OPTS`, `CURSOR_OPTS`, `FX_TOGGLES`, `ART_HINT`,
  and `WEBGL_BGS` for "which backgrounds the colour presets apply to").
- `SECTION_KEYS` maps sections to owned `SiteData` keys for export/import — add new fields here.
- No checkbox/switch/select control existed before the Effects panel; the segmented-pill pattern
  is copied from the preview device toggle (`aghost` spans with active border/color).
- Write path: `persist({ ...data, field: value })`. Live preview iframe mirrors `data` to
  `localStorage['zx_preview']`; the public page listens for the `storage` event.

## About copy (site voice, formatted for the `**bold**` renderer)

EN:
```
**AimworkSpace** is a one-person studio. One developer, start to finish.

Full stack: front, back, bots, deploys. I take an idea and ship it as a working product. If it can be automated, it will be automated.

Remote since 2023, based in Germany. I build for founders, small teams and other devs who need real, working code.

Payment in **USDT** or **RUB**. Turnaround **3-14 days** by scope. I reply in under 24 hours.
```

RU:
```
**AimworkSpace** - студия одного человека. Один разработчик, от начала до конца.

Фулстек: фронт, бэк, боты, деплой. Беру идею и довожу её до рабочего продукта. Всё, что можно автоматизировать, будет автоматизировано.

Удалённо с 2023, живу в Германии. Делаю для фаундеров, небольших команд и других разработчиков, которым нужен рабочий код.

Оплата в **USDT** или **рублях**. Сроки **3-14 дней** по объёму. Отвечаю быстрее чем за 24 часа.
```
