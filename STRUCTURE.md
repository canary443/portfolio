# STRUCTURE.md

```
/
├── app/
│   ├── layout.tsx                # fonts, metadata, viewport, global css
│   ├── globals.css               # keyframes, hover states, reduced-motion rules
│   ├── page.tsx                  # main site (client component)
│   ├── admin/page.tsx            # admin panel (client component)
│   └── api/admin/session/
│       └── route.ts              # login (POST), session check (GET), logout (DELETE)
├── lib/
│   ├── data.ts                   # types, DEFAULTS, localStorage layer, rub rate fetch
│   ├── i18n.ts                   # EN/RU dictionary
│   └── config.ts                 # feature flags (grain, spotlight, counters, admin link)
├── public/assets/
│   ├── hero-hands.avif           # hero dot-art graphic
│   ├── leet-cheats.svg           # partner logo -> https://leet-cheats.xyz
│   └── binware.svg               # partner logo -> https://binware.su
├── .env.example                  # ADMIN_PASSWORD template (real value in .env.local)
├── CLAUDE.md                     # agent memory (read first)
├── RULES.md                      # mandatory commit/code rules
├── README.md                     # project overview
├── DESIGN.md                     # design system reference
├── SECURITY.md                   # auth model + production checklist
├── HANDOFF.md                    # real-backend architecture (Supabase)
└── STRUCTURE.md                  # this file
```

## Data shape (localStorage `zx_data_v2`)
```ts
{
  about, aboutRu,                       // multi-line, supports **b** *i* [t](url)
  telegram, github, email,              // contacts
  services:  [{ id, glyph, icon, title, titleRu, desc, descRu }],
  works:     [{ id, title, titleRu, desc, descRu, imgs[], img, video, link, price, date, changelog[] }],
  projects:  [{ id, name, role, roleRu, from, to, link, img, changelog[] }],
  faq:       [{ id, q, qRu, a, aRu }]   // order = display order (drag in admin)
  // changelog entry: { id, date, text, textRu } - shown in the project modal
}
```
Other client keys: `zx_lang` (en|ru), `zx_rub` (cached usd->rub rate).
Server session: httpOnly cookie `zx_admin` set by `/api/admin/session`.
