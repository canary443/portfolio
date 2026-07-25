# STRUCTURE.md

```
/
├── app/
│   ├── layout.tsx                # fonts, metadata, viewport, global css
│   ├── globals.css               # keyframes, hover states, reduced-motion rules
│   ├── page.tsx                  # server wrapper: reads content + lang cookie, renders site.tsx
│   ├── site.tsx                  # main site markup (client component)
│   ├── admin/page.tsx            # admin panel (client component)
│   └── api/
│       ├── admin/session/route.ts # login (POST), session check (GET), logout (DELETE)
│       ├── content/route.ts      # site.json on vercel blob: GET public, PUT admin only
│       ├── upload/route.ts       # admin media upload to supabase storage -> public url
│       └── keepalive/route.ts    # daily cron ping so the free supabase project stays awake
├── components/                   # reactbits effects (Dither, PixelBlast, ...), ui/, animate-ui/
│   └── fx/                       # the wrappers site.tsx uses (HeroFx, cursors, headline reveal)
├── lib/
│   ├── data.ts                   # types, DEFAULTS, localStorage cache, remote load/save, rub rate fetch
│   ├── content.ts                # server side read of site.json from the blob store
│   ├── supabase.ts               # server only supabase client for uploads
│   ├── img.ts                    # client image encode + upload helpers (uploadMedia, importUrl)
│   ├── ascii.ts                  # renders pasted / uploaded art to ascii on a canvas
│   ├── i18n.ts                   # EN/RU dictionary
│   └── config.ts                 # feature flags (grain, spotlight, counters, admin link)
├── scripts/
│   ├── check-cursor.mjs          # regression: dot cursor stays scoped and off in safari
│   └── check-no-magnetic.mjs     # regression: the magnetic button behavior stays removed
├── public/assets/
│   ├── kitokat-ascii-fine.avif   # default hero art (ascii cat), braille + raw next to it
│   ├── hero-hands.avif           # hero dot-art graphic
│   ├── leet-cheats.svg           # partner logo -> https://leet-cheats.xyz
│   └── binware.svg               # partner logo -> https://binware.su
├── .env.example                  # env template (real values in .env.local)
├── CLAUDE.md                     # agent memory (read first)
├── AGENTS.md                     # the same memory for non-Claude agents
├── RULES.md                      # mandatory commit/code rules
├── README.md                     # project overview
├── DESIGN.md                     # design system reference
├── SECURITY.md                   # auth model + production checklist
├── HANDOFF.md                    # real-backend architecture (Supabase)
├── docs/EFFECTS.md               # the admin-toggleable effects system
└── STRUCTURE.md                  # this file
```

## Data shape (`site.json` on blob, cached in localStorage `zx_data_v2`)
Full type: `SiteData` in `lib/data.ts`.
```ts
{
  about, aboutRu,                       // multi-line, supports **b** *i* [t](url)
  aboutImg, aboutImgW, aboutImgAspect,  // media frame under the about text
  aboutShowBased, aboutShowFlag,        // the location line and its flag
  telegram, github, email,              // contacts
  services:  [{ id, glyph, icon, title, titleRu, desc, descRu }],
  works:     [{ id, title, titleRu, desc, descRu, imgs[], img, video, link, price, date, changelog[] }],
  projects:  [{ id, name, role, roleRu, from, to, link, img, changelog[] }],
  faq:       [{ id, q, qRu, a, aRu }],  // order = display order (drag in admin)
  // appearance, all admin-picked (docs/EFFECTS.md):
  heroBg, heroPreset, cursorStyle,      // background mode, webgl palette, cursor
  heroArt, heroArtCustom, heroArtScale, // hero art choice, ascii upload, size percent
  heroArtMedia, heroArtMediaPoster,     // 'media' art: plain photo / gif / video + still frame
  heroBgGif, heroBgGifPoster, heroBgGifOpacity, // 'gif' background + still poster
  fxGradualBlur, fxHeadlineReveal, fxCardTilt,
  fontRu, i18nFontRu, i18n              // RU font, per string font, text overrides
  // changelog entry: { id, date, text, textRu } - shown in the project modal
}
```
Other client keys: `zx_lang` (en|ru), `zx_rub` (cached usd->rub rate), `zx_preview` (admin live preview).
Server session: httpOnly cookie `zx_admin` set by `/api/admin/session`.
