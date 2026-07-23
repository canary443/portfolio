# aimworkspace

personal portfolio site. dark single page + a password gated admin panel. frontend only, content lives in localStorage.

## stack

- next.js 14 (app router) + typescript
- lenis for the smooth scroll
- satoshi (fontshare) and onest (google fonts) for type
- simple icons cdn for the brand icons

## run it

```bash
npm install
npm run dev
```

- site: http://localhost:3000
- admin: http://localhost:3000/admin

## env

copy `.env.example` to `.env.local` and set:

- `ADMIN_PASSWORD` - passphrase for /admin

## notes

the admin panel has no database, it writes content to the browser's localStorage. the login check and rate limit run server side.
