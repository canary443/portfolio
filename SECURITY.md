# SECURITY.md

## Current state
- Admin auth is server-side: `POST /api/admin/session` compares the passphrase against the `ADMIN_PASSWORD` env var (timing-safe compare over HMAC digests) and sets an httpOnly cookie (`sameSite: lax`, `secure` in production, 12h lifetime).
- The session cookie is `exp.HMAC(ADMIN_SESSION_SECRET, exp)` — signed with a secret that is independent of the passphrase, so a leaked cookie cannot be used to brute-force the password offline. Expiry is embedded and checked server-side, so a copied cookie stops working after 12h even if the browser keeps it. The client never sees the passphrase or the secret.
- Rate limiting: per-IP in the route handler — 3 failed tries → 60s lockout, doubling each time up to a cap. The gate shows only "too many attempts" and a countdown. State is in-memory, so it resets on redeploy and is per-instance on serverless — acceptable for now, see checklist. The map is swept of stale entries so it does not grow unbounded.
- Content itself still lives in the visitor's own localStorage. The admin panel edits only the browser it runs in; there is no server-held content to protect yet.
- The passphrase and session secret are set in `.env.local` (gitignored) and Vercel env vars. The literal passphrase is intentionally not written in any committed file; the owner plans to rotate it before the real launch.

## Production checklist (before the real launch)
1. **Rotate the passphrase** and consider storing an argon2/bcrypt hash in the env var instead of plaintext, comparing against the hash.
2. **Set `ADMIN_SESSION_SECRET`** in Vercel (a random 32-byte hex). Without it each instance signs with its own random key, so sessions drop across instances/redeploys.
3. **Move rate limiting to shared storage** (Upstash Redis / Vercel KV) or the edge (Vercel WAF rules), so it survives restarts and covers all serverless instances. For true per-session revocation, store session ids server-side. Return 429 without detail.
4. **`x-forwarded-for` trust**: the limiter keys on the first XFF hop. This is safe on Vercel (the platform sets the header). Behind another proxy the first hop is client-controlled — key on a trusted source there.
5. **Never commit secrets.** `.env*` is gitignored (except `.env.example`). If a secret ever lands in a commit, rotate it.
6. When the Supabase backend lands (HANDOFF.md): RLS — public tables readable by anon, writable only by the admin role; Storage bucket public-read admin-write with size/mime limits enforced in the upload route; validate upload size/type server-side.
7. **Headers**: CSP (self + fontshare + google fonts + simpleicons CDN + exchange API), `X-Frame-Options: DENY` on admin, HSTS.
8. Optionally put `/admin` behind Vercel password protection or its own subdomain as a second layer.
