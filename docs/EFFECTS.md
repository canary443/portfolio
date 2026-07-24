# EFFECTS.md — visual effects system + codebase reference

This file is the reference for the ReactBits effects system and the site architecture facts
behind it. It exists so future work does not need to re-explore the codebase. Written in normal
English (the simple-English rule is for commits and code comments only).

## The effects system in one paragraph

Every effect is an on/off or selector option stored in the shared content (`SiteData` in
`lib/data.ts`) and edited from the admin "Effects" panel. The public site reads those fields and
mounts the matching effect. All WebGL effects are lazy-loaded (`next/dynamic`, `ssr:false`) and
gated by one capability hook (`lib/fx.ts` -> `useFxCapable`). If the device cannot run an effect
(no WebGL, mobile, Safari/iOS lockdown, or `prefers-reduced-motion`), the effect returns nothing
and the site falls back to the plain UI (for the hero, the AVIF hands image).

## Effect fields on `SiteData`

Flat top-level fields (flat, not nested — see the merge note below):

| Field | Type | Default | What it controls |
|---|---|---|---|
| `heroBg` | `'image' \| 'pixel-blast' \| 'dither' \| 'threads'` | `image` | Hero background. `image` = the hero art picture (also the universal fallback). |
| `heroArt` | `'cat' \| 'hands' \| 'braille' \| 'custom'` | `cat` | Which picture the `image` mode shows: ascii cat, dot-art hands, braille cat, or the custom one. Custom comes from an upload (auto-ascii) or from pasted ascii/braille text (`renderTextArt`, with an upscale toggle). |
| `heroArtCustom` | `string \| null` | `null` | Custom hero picture URL. The admin upload auto-renders it into ascii art (`lib/ascii.ts`) before storing via `/api/upload`. |
| `heroArtScale` | `number` | `100` | Percent multiplier on the hero art's base width (50-150, slider in the admin). |
| `cursorStyle` | `'dot' \| 'pixel-trail' \| 'target' \| 'native'` | `dot` | Cursor. `target` = ReactBits TargetCursor (4 corners lock onto links/buttons/cards). Reduced-motion / touch force the plain cursor. |
| `fxGradualBlur` | `boolean` | `true` | Cinematic progressive blur at the hero->sheet seam and section edges (pure CSS). |
| `fxHeadlineReveal` | `boolean` | `true` | Animated hero headline reveal (uses `motion`, not GSAP). |
| `fxShapeBlur` | `boolean` | `false` | Soft morphing blurred glow behind the About/Contact heading. |
| `fxFluidGlass` | `boolean` | `false` | Glassmorphism liquid-distortion lens (heaviest; CSS fallback if it can't render). |
| `fxCardTilt` | `boolean` | `false` | Subtle tilt/spotlight on the project cards. |

All of these must also be listed in `SECTION_KEYS.settings` in `app/admin/page.tsx` so the JSON
export/import includes them.

## ReactBits catalog + dependency weight (registry `@react-bits`, use `-TS-TW` variants)

Install with `npx shadcn@latest add @react-bits/<Name>-TS-TW`. It vendors the component and
auto-installs the npm deps below.

| Component | Purpose | npm deps it pulls | Weight |
|---|---|---|---|
| `GradualBlur-TS-TW` | progressive blur reveal | none (pure CSS/React) | free |
| `TargetCursor-TS-TW` | 4-corner cursor that locks onto targets | gsap | light |
| `PixelTrail-TS-TW` | pixelated cursor trail (NOT used - needs r3f/React19; hand-rolled instead) | n/a | - |
| `Dither-TS-TW` | dithered noise background | ogl | light |
| `Threads-TS-TW` | woven thread-line background | ogl | light |
| `ShapeBlur-TS-TW` | morph blur on hover | three | medium |
| `PixelBlast-TS-TW` | exploding pixel bursts | three + postprocessing | heavy |
| `FluidGlass-TS-TW` | glass liquid distortion | @react-three/fiber + drei + three | heaviest |

Other dark backgrounds available if wanted later: DarkVeil, Silk, Plasma, LiquidChrome, Aurora,
Beams, LightRays, Particles, Iridescence, LiquidEther, Prism, Orb, LetterGlitch, FaultyTerminal.

## Codebase facts (as of the merge that introduced this system)

### Stack
- Next.js 14 App Router, React 18, TypeScript, Tailwind v3 with **preflight OFF** (Tailwind is
  only used by the animate-ui icons; the site is hand-styled with inline styles + CSS vars).
- Deps: `lenis` (smooth scroll), `motion` v12 (framer-motion successor, import from `motion/react`),
  `@vercel/blob`, `clsx`, `tailwind-merge`. `cn()` in `lib/utils.ts`.
- `next.config.mjs` is minimal. Add `transpilePackages`/webpack only if a WebGL lib demands it.

### Where things live
- `app/page.tsx` — server, `force-dynamic`; reads content, renders `<Site initial={...}/>`.
- `app/site.tsx` — `'use client'`, the **entire site inline** (nav, hero, services, stack marquee,
  projects + carousels + modal, about, faq, contact, footer, grain, toast, custom cursor). No
  per-section files.
- `components/animate-ui/` — 4 animated SVG icons + `AnimateIcon` controller + `slot.tsx`. Only
  users of `motion` besides new effects. `hooks/use-is-in-view.tsx` wraps `useInView`.
- `app/globals.css` — single dark `:root` palette (`--bg:#101010`, `--hero-bg:#000`,
  `--text:#f3f3f3`, `--muted:#9c9c9c`, `--line:#212121`, ...). No light theme. Keyframes
  `zxin/zxmarq/zxfade/zxmodal/zximg`. Admin classes `.ainput/.abtn/.aghost/.anav`.
- `lib/config.ts` — build-time flags (`showMap` gates the hero AVIF today, `showAbout`, `spotlight`,
  `grain`, `adminLink`). Not admin-editable; the new effect toggles live in `SiteData` instead.

### Hero (the swap target) — `app/site.tsx` around lines 411-427
- Sticky container, `overflow:hidden`. Text in `heroRef` (parallax), CTAs, then the image gated by
  `config.showMap`: `<img ref={handsRef} src="/assets/hero-hands.avif" onError->hero-hands.png />`,
  styled `width:114%; marginLeft:-7%; scale(1.06)`.
- An imperative scroll effect (~lines 135-150) mutates `handsRef` (parallax translate) and `heroRef`
  (curtain fade). **Guard `if (handsRef.current)`** — when a WebGL bg is active the img is absent.
- A rounded "sheet" slides up over the sticky hero (radius `26px 26px 0 0`).

### Motion system (respect it)
- Lenis `{ lerp:0.09, autoRaf:true }`, only when `(pointer:fine)` and not reduced-motion.
- `reduced.current` / `motionOk` and `safari` detected near lines 74-83. Custom cursor off on Safari.
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
  localStorage. Whole object round-trips each save.
- i18n `*Ru` fallback at render: `ru && x.Ru ? x.Ru : x`. Static chrome strings in `lib/i18n.ts`
  (`T.en`/`T.ru`, both required for any new public-facing string).

### Admin — `app/admin/page.tsx`
- Sections: about|services|works|projects|faq|**settings**|preview.
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
