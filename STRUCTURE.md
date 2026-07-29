# STRUCTURE.md

```
/
├── app/
│   ├── layout.tsx                # metadata + og/twitter, canonical, search console codes, Person JSON-LD, <html lang> from the cookie, analytics
│   ├── globals.css               # keyframes, hover states, reduced-motion rules
│   ├── fonts.css                 # @font-face for the self hosted woff2 files (no cdn)
│   ├── icon.svg                  # favicon
│   ├── page.tsx                  # server wrapper: reads content, picks the language, renders site.tsx
│   ├── site.tsx                  # main site markup (client component)
│   ├── robots.ts                 # robots.txt: allow all (ai crawlers too), disallow /admin, /api and ?preview=
│   ├── sitemap.ts                # sitemap.xml: the site is one url
│   ├── llms.txt/route.ts         # the site as plain text for assistants, built from the live content
│   ├── admin/layout.tsx          # admin-only: page title, noindex, botid client script
│   ├── admin/page.tsx            # admin panel (client component)
│   └── api/
│       ├── admin/session/route.ts # login (POST), session check (GET), logout (DELETE)
│       ├── content/route.ts      # site.json on vercel blob: GET public, PUT admin only
│       ├── upload/route.ts       # admin media upload to supabase storage -> public url
│       └── keepalive/route.ts    # daily cron ping so the free supabase project stays awake
├── components/
│   ├── PixelTrail.tsx            # webgl cursor trail (r3f + drei)
│   ├── TargetCursor.tsx          # 4-corner cursor that locks onto targets (gsap)
│   ├── GradualBlur.tsx           # progressive blur strip, pure css
│   ├── LogoLoop.tsx              # stack marquee
│   ├── MediaCarousel.tsx         # photo / video carousel in the cards and the modal
│   ├── BrandIcons.tsx            # brand logos as inline svg (simple icons paths, cc0)
│   ├── fx/                       # the wrappers site.tsx uses
│   │   ├── PixelTrailCursor.tsx  # lazy wrapper around PixelTrail
│   │   └── TargetCursorFx.tsx    # lazy wrapper around TargetCursor
│   ├── ui/carousel.tsx           # shadcn carousel (embla), used by MediaCarousel
│   └── animate-ui/               # 4 animated service icons + AnimateIcon controller, slot, reveal
├── hooks/use-is-in-view.tsx      # motion useInView wrapper, used by the animate-ui icon controller
├── lib/
│   ├── data.ts                   # types, DEFAULTS, localStorage cache, remote load / save
│   ├── content.ts                # server side read of site.json from the blob store
│   ├── supabase.ts               # server only supabase client for uploads
│   ├── session.ts                # admin session token sign / check, shared by the session, content and upload routes
│   ├── img.ts                    # client media helpers (uploadMedia, importUrl, shrinkImage)
│   ├── fx.ts                     # webgl support probe (the pixel-trail cursor)
│   ├── lang.ts                   # pickLang(cookie): en unless the cookie says ru
│   ├── i18n.ts                   # EN/RU dictionary
│   ├── config.ts                 # feature flags (spotlight, grain)
│   └── utils.ts                  # cn() for the shadcn / animate-ui components
├── scripts/
│   ├── check-cursor.mjs          # regression: dot cursor stays scoped and off in safari
│   └── check-no-magnetic.mjs     # regression: the magnetic button behavior stays removed
├── public/
│   ├── assets/
│   │   ├── rigrig.jpg            # default about picture
│   │   ├── og.jpg                # square link preview image
│   │   ├── leet-cheats.svg       # partner logo -> https://leet-cheats.xyz
│   │   └── binware.svg           # partner logo -> https://binware.su
│   ├── fonts/                    # self hosted woff2: satoshi, onest, carlito, jost
│   └── images/flags/             # usa.svg + russia.svg for the language picker
├── next.config.mjs               # security headers, report-only csp, noindex for /admin
├── vercel.json                   # daily cron for /api/keepalive
├── components.json               # shadcn config: registries @animate-ui and @react-bits
├── .env.example                  # env template (real values in .env.local)
├── PRODUCT.md                    # durable product truth (users, purpose, constraints)
├── CLAUDE.md                     # agent memory (read first)
├── AGENTS.md                     # the same memory for non-Claude agents
├── RULES.md                      # mandatory commit/code rules
├── README.md                     # project overview
├── DESIGN.md                     # design system reference
├── SECURITY.md                   # auth model + production checklist
├── HANDOFF.md                    # real-backend architecture (Supabase)
├── codereview.md                 # review notes (Russian)
├── docs/
│   ├── EFFECTS.md                # the admin-toggleable effects system
│   └── superpowers/specs/        # design specs kept from planning sessions
└── STRUCTURE.md                  # this file
```

## Data shape (`site.json` on blob, cached in localStorage `zx_data_v2`)
Full type: `SiteData` in `lib/data.ts`.
```ts
{
  about, aboutRu,                       // multi-line, supports **b** *i* [t](url)
  aboutImg, aboutImgW, aboutImgAspect,  // media frame under the about text (px width, '16/9' or 'auto')
  aboutShowBased, aboutShowFlag,        // the location line and its flag
  telegram, github, email,              // contacts
  services:  [{ id, glyph, icon, title, titleRu, desc, descRu }],
  works:     [{ id, title, titleRu, desc, descRu, imgs[], img, video, link, date, changelog[] }],
  projects:  [{ id, name, role, roleRu, from, to, link, img, changelog[] }],
  // appearance, all admin-picked (docs/EFFECTS.md):
  showServices, showStack,              // whole blocks the admin can hide
  cursorStyle,                          // dot / pixel-trail / target / native
  fxGradualBlur, fxCardTilt,
  fontRu, i18nFontRu, i18n              // RU font, per string font, text overrides
  // changelog entry: { id, date, text, textRu } - shown in the project modal
}
```
Unions: `cursorStyle` dot|pixel-trail|target|native · `fontRu` onest|carlito|jost. Only `about`, `telegram`,
`github`, `email`, `services`, `works` and `projects` are required - every other field is optional and backfills
from `DEFAULTS` on a shallow merge. Keys the 2026-07-29 cleanup dropped (`faq`, a work's `price`, every `hero*`
field, `fxHeadlineReveal`) may still sit in the stored json; they are ignored.

Other client keys: `zx_lang` (en|ru, mirrored into a same-name cookie the server reads),
`zx_preview` (admin live preview).
Server session: httpOnly cookie `zx_admin` set by `/api/admin/session`.
