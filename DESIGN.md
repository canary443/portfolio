# DESIGN.md

Design reference for AimworkSpace. Based on the "Hyperstudio" style direction: editorial-tech, near-black canvas, everything carved out by hairlines and type.

## Page order
About (it opens the page) → partner logos → services (admin switch, off) → tech stack strip (admin switch, off) → work cards → the two closing links. No hero, no faq, no footer, no prices and no selling copy: the visitor reads who this is, looks at the work, and writes if they want to.

## Tokens
| Role | Value |
|---|---|
| Page canvas | `#101010` |
| Card / panel surface | `#151515` (admin inputs `#0c0c0c`) |
| Hairline border | `#212121` (the structural line — sections, cards, rows) |
| Secondary border / muted | `#474747` |
| Primary text | `#f3f3f3` |
| Muted text | `#9c9c9c` |
| Icon gold (service icons only) | `#6f6759` |
| Danger | `#ff6b6b` |
| Primary action | white pill: `#f3f3f3` bg (hover `#e2e2e2`), `#101010` text, radius 9999 |

## Type
- **Satoshi** 400/500, self-hosted (`app/fonts.css` + `public/fonts`) — everything. Weight 400 headlines, hierarchy through size and tracking, never bold shouting. Only the two Satoshi faces are preloaded in `app/layout.tsx`; no font is fetched from a CDN at runtime.
- **Onest** — Cyrillic fallback in the same stack: `'Satoshi','Onest',ui-sans-serif,...`. Self-hosted as well, split per subset (latin / latin-ext / cyrillic).
- RU locale can swap the Cyrillic companion via the admin `fontRu` setting: Onest (default), Carlito (humanist, neutral) or Jost (geometric, more character). Latin always stays Satoshi. Any single interface string can override it through `i18nFontRu`.
- Section h2: `clamp(30px,3.4vw,44px)` at -0.007em. The h1 that opens the page (the About heading) is quiet on purpose: 23px, weight 400. The two closing links are the loud type instead: `clamp(26px,4vw,48px)` at -0.02em. Body 14–16px. Labels: 13px, letter-spacing .12em, `// LABEL` style.
- Case is never forced in CSS. Service titles are 14px at .06em tracking and keep whatever case the admin typed (`Сайты` stays `Сайты`); the shouty look comes from the `// LABEL` rows, which are written in caps in the content.

## Components
- **Nav**: fixed, and it holds only the wordmark and the language picker (the section links were dropped with the hero). At the top it is a full-width bar (max-width 1256, height 64, fully transparent, no blur, transparent border). Past 40px of scroll it morphs into a centered glass pill (max-width 790, height 52, radius 9999, background `rgba(22,22,22,.6)`, `backdrop-filter: blur(22px) saturate(1.9)` + `-webkit-` prefix, border rgba(255,255,255,.12)). The language picker sits on the right, the wordmark on the left is a "back to top" button.
- **Buttons**: white pill (primary), ghost 8px-radius outline (secondary), `scale(.97)` press. Cards press to `scale(.99)`.
- **Cards**: `#151515`, 1px `#212121`, radius 8, media 16:10, hover: border `#474747` + translateY(-3px); striped placeholder with a label ("NO PIC", "TEAM PROJECT") when there is no media. The card itself is a flex column and the text block below the media takes the rest of the height, so the date sits on the bottom edge and lines up across a row of cards.
- **Modal**: radius 14, backdrop `rgba(0,0,0,.66)` + blur(10px), `zxmodal` rise/scale/blur entry ("materialize"), mirrored faster exit.
- **Closing links** (`.blink`): two full-width hairline rows, the word large on the left with its brand icon, the handle and a `↗` on the right. Hover wipes a white fill across the row with `clip-path: inset(0 100% 0 0)` → `inset(0)` in .45s while a second copy of the same row, clipped the same way, carries black text. Reduced motion fades the fill in instead.
- **Section dividers**: label row `// NAME` + 1px hairline. The partner logos under the About sit behind a bare hairline with no label at all.

## Motion (Emil Kowalski school: fast, eased, transform/opacity only)
- Easing: `cubic-bezier(.22,1,.36,1)` (the `--ease` CSS var), durations .15–.7s. Exits are faster than entries (modal: in .45s, out .24s).
- Page load: staggered `zxin` rise on the About block via `.in0–.in3` (.55s each, delays 0 / .08s / .16s; the logo row is .7s at .22s), so the page cascades from the heading down to the partner logos.
- Scroll: lenis smooth scroll (`lerp: .09`, fine pointers with full motion only). One flat canvas, no pinned block and no parallax; the scroll handler only decides whether the nav is a bar or a pill.
- Reveal on scroll (IntersectionObserver, `data-reveal`): project cards rise 26px with a fade, `scale(.98)` and a 6px blur on a spring (`Reveal` primitive, motion: duration .55, bounce .18), service cells rise 18px via CSS in .6s. Cards that enter the viewport in the same observer batch stagger left to right (65ms per card, capped at 260ms), so a row cascades at any column count.
- Nav morph: max-width, height, radius, background and border all cross-fade in .45s, and the outer padding follows on the same curve, so the bar folds into the pill as one move.
- Buttons: `scale(.97)` press feedback on pointer-down (CSS `:active` covers touch). No magnetic pull - it was removed on purpose and `npm run test:no-magnetic` keeps it out.
- Modal: enters with `zxmodal` in .45s - rises 18px, scales from .95 and clears a 7px blur (materialize), over a backdrop that fades in .3s. Exit mirrors the same path faster (.24s): fades, drops 16px, scales to .95 and blurs to 5px, then unmounts 250ms after the click. Reduced motion opens it with no animation and closes it on a .2s fade. Scroll is frozen underneath (lenis stop + body overflow).
- Media carousels (cards + modal): shadcn/embla with the fade plugin (`components/MediaCarousel.tsx`) - crossfading slides (embla `duration: 30`, dropped to 0 with motion off), drag/swipe on touch, 15px SVG chevron arrows in the glass chips, dot indicators (clickable in the modal). Card photos auto-advance every 5s, video slides advance when the video ends; a video only plays while its card is on screen, and never with motion off.
- Cursor: `cursorStyle` picks one of dot (default), pixel-trail, target or native. The dot is 9px, `mix-blend-mode:difference`, lerp .16, scales 2.6× over interactive elements, fades out when the pointer leaves the window; the rAF loop sleeps when settled. The native cursor is hidden only while the dot is live (fine pointer, full motion, not Safari).
- Always on (code flags in `lib/config.ts`): grain overlay (140px canvas noise, `mix-blend:overlay` at .5), spotlight radial glow following the cursor on cards and service cells (280px circle, resets on leave).
- Admin switches: the 2rem gradual blur along the bottom edge of the viewport (`fxGradualBlur`, on); 3d card tilt that follows the pointer (`fxCardTilt`, off, fine pointer only, up to 2.5° on X and 3.5° on Y, 900px perspective).

## Platform adaptations
- **Safari**: no blend modes (grain drops `overlay` for plain .16 opacity) and no cursor dot — the native one stays. Only the dot is Safari-gated: the pixel-trail and target cursor styles still run there, they only need a fine pointer with motion on. Blur radii are cut (nav 13px / saturate 1.5 instead of 22px / 1.9, modal backdrop 5px instead of 10px) — Safari composites these effects on the CPU-heavy path and the cursor/scroll stutter otherwise. `-webkit-backdrop-filter` is set alongside the unprefixed property.
- **`prefers-reduced-motion: reduce`**: native scroll (no lenis), the page entrance becomes a plain .4s fade, reveals just fade in (no rise, no blur), the closing links fade their fill instead of wiping it, the stack loop stops, native cursor back, no pixel-trail effect, card media never plays.
- **Touch / coarse pointers**: native scroll and native cursor; hover-only effects (spotlight, card tilt, custom cursors) are mouse-only by construction.

## Icons & imagery
- brand icons are inline SVG components in `components/BrandIcons.tsx` (Simple Icons paths, CC0) on the 24×24 grid, drawn at 12–18px, colored through `currentColor` or a `color` prop. Nothing is loaded from an icon CDN.
- Service icons: animated line icons (animate-ui: layers, bot, cog, binary) at 26px in the gold `--icon`, played once when the cell reveals and again on hover. An image uploaded in the admin replaces them; the text glyphs (▤ ◉ ↻ &lt;/&gt;) stay in the content as the last fallback.
- No photography except project screenshots and the one gif or photo under the About text (framed like the card media, width and aspect picked in the admin, `auto` keeps the natural ratio). There is no hero art and no background layer any more: the canvas is flat `#101010`, so the nav bar is fully transparent until it folds into the pill.

## Don'ts
- No shadows for elevation (hairlines + contrast only; the nav pill carries none, the only shadow left on the page is the small drop under the language menu).
- No bold display type, no colored fills behind text, no emoji in UI, no long dashes in copy.
