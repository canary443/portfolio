# DESIGN.md

Design reference for AimworkSpace. Based on the "Hyperstudio" style direction: editorial-tech, near-black canvas, everything carved out by hairlines and type.

## Tokens
| Role | Value |
|---|---|
| Hero canvas (top block) | `#000000` |
| Page canvas | `#101010` |
| Card / panel surface | `#151515` (admin inputs `#0c0c0c`) |
| Hairline border | `#212121` (the structural line — sections, cards, rows) |
| Secondary border / muted | `#474747` |
| Primary text | `#f3f3f3` |
| Muted text | `#9c9c9c` |
| Icon gold (service glyphs only) | `#6f6759` |
| Danger | `#ff6b6b` |
| Primary action | white pill: `#ffffff` bg, `#101010` text, radius 9999 |

## Type
- **Satoshi** (Fontshare) 400/500 — everything. Weight 400 headlines, hierarchy through size and tracking, never bold shouting.
- **Onest** (Google) — Cyrillic fallback in the same stack: `'Satoshi','Onest',ui-sans-serif,...`
- RU locale can swap the Cyrillic companion via the admin `fontRu` setting: Onest (default), Carlito (humanist, neutral) or Jost (geometric, more character). Latin always stays Satoshi.
- Display: clamp(38–60px), letter-spacing -0.011em. Section h2: 30–44px. Body 14–16px. Labels: 13px, letter-spacing .12em, `// LABEL` style.

## Components
- **Nav**: fixed, transparent over content; on scroll morphs into a centered glass pill (max-width ~790px, radius 9999, `backdrop-filter: blur(16px) saturate(1.6)` + `-webkit-` prefix, border rgba(255,255,255,.12)); links stay centered, chat button stays visible.
- **Buttons**: white pill (primary), ghost 8px-radius outline (secondary), magnetic hover (translate toward cursor), `scale(.97)` press. Cards press to `scale(.99)`.
- **Cards**: `#151515`, 1px `#212121`, radius 8, image 16:10, hover: border `#474747` + translateY(-3px); "NO PIC" striped placeholder when no image.
- **Modal**: radius 14, backdrop blur, `zxmodal` rise/scale/blur entry ("materialize"), mirrored faster exit.
- **Section dividers**: label row `// NAME` + 1px hairline; contact block framed with `+` corner marks.

## Motion (Emil Kowalski school: fast, eased, transform/opacity only)
- Easing: `cubic-bezier(.22,1,.36,1)` (the `--ease` CSS var), durations .15–.7s. Exits are faster than entries (modal: in .45s, out ~.24s).
- Page load: staggered `zxin` rise on hero via `.in0–.in3` classes (0 / .08s / .16s / .22s).
- Scroll: lenis smooth scroll (`lerp: .09`, fine pointers with full motion only); hero pinned (`position:sticky`) while content slides over it as a rounded "sheet" (curtain effect), hero text scales to .95 and fades as it is covered; hands image gets slow parallax, size stays constant.
- Reveal on scroll (IntersectionObserver, `data-reveal`): project cards rise 26px with a fade + 6px blur on a spring (`Reveal` primitive, motion), service cells rise 18px via CSS. Cards that enter the viewport in the same observer batch stagger left to right (65ms per card, capped at 260ms), so a row cascades at any column count.
- Buttons: magnetic pull toward the cursor (transform composed in JS) + `scale(.97)` press feedback on pointer-down (CSS `:active` covers touch).
- Modal: enters with `zxmodal` in .45s - rises 18px, scales from .95 and clears a 7px blur (materialize). Exit mirrors the same path faster (~240ms): fades, drops 16px, scales to .95 and blurs to 5px, then unmounts. Reduced motion gets plain fades. Scroll is frozen underneath (lenis stop + body overflow).
- Cursor: 9px dot, `mix-blend-mode:difference`, lerp .16, scales 2.6× over interactive elements, fades out when the pointer leaves the window; the rAF loop sleeps when settled. Native cursor hidden on fine pointers with full motion only.
- Optional (tweaks): grain overlay (canvas noise, `mix-blend:overlay`), spotlight radial glow following the cursor on cards (resets on leave), animated stat counters (default off).

## Platform adaptations
- **Safari**: no blend modes (grain drops `overlay` for plain low opacity, cursor dot drops `difference`), blur radii kept moderate (nav 16px, modal 10px) — Safari composites these effects on the CPU-heavy path and the cursor/scroll stutter otherwise. `-webkit-backdrop-filter` is set alongside the unprefixed property.
- **`prefers-reduced-motion: reduce`**: native scroll (no lenis), no parallax/curtain transforms, hero entrance becomes a plain fade, reveals show instantly, marquee stops, magnetic buttons off, native cursor back.
- **Touch / coarse pointers**: native scroll and native cursor; hover-only effects (spotlight, magnetic) are mouse-only by construction.

## Icons & imagery
- simpleicons CDN for brand icons (`https://cdn.simpleicons.org/<slug>/<hex>`), 12–18px.
- Service icons: gold text glyphs (▤ ◉ ↻ &lt;/&gt;) or user-uploaded images from the admin.
- No photography except project screenshots; the only hero art is the ascii cat (`public/assets/kitokat-ascii-fine.avif`, real monospace glyphs rendered from `kitokat-raw.jpg`) on pure black, centered at 80% width. The old dot-matrix hands remain in `public/assets/hero-hands.*`.

## Don'ts
- No shadows for elevation (hairlines + contrast only; the only shadows are the nav pill and the curtain edge).
- No bold display type, no colored fills behind text, no emoji in UI, no long dashes in copy.
