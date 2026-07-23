// admin session api: post = login, get = check, delete = logout
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

export const runtime = 'nodejs';

const MAX_AGE = 60 * 60 * 12; // 12h

// per ip attempts, in memory (resets on redeploy, see SECURITY.md)
const attempts = new Map<string, { fails: number; until: number; n: number }>();

// session signing key: independent of the passphrase so the cookie can not be
// used to brute force it offline. set ADMIN_SESSION_SECRET in prod so all
// serverless instances share one key; otherwise a random per-process key is
// used (sessions drop on redeploy / across instances, still safe).
const SECRET = process.env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex');

// hash both sides so timingSafeEqual gets equal lengths
const digest = (s: string) => createHmac('sha256', SECRET).update(s).digest();
const same = (a: string, b: string) => {
  const da = digest(a), db = digest(b);
  return da.length === db.length && timingSafeEqual(da, db);
};

// token is `exp.sig(exp)`; expiry is checked server-side so a copied cookie dies
const sign = (exp: number) => createHmac('sha256', SECRET).update('zx|' + exp).digest('hex');
const makeToken = () => { const exp = Date.now() + MAX_AGE * 1000; return exp + '.' + sign(exp); };
const validToken = (tok: string | undefined) => {
  if (!tok) return false;
  const dot = tok.indexOf('.');
  if (dot < 0) return false;
  const exp = Number(tok.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return same(tok.slice(dot + 1), sign(exp));
};

// first x-forwarded-for hop. safe on vercel (platform sets it); behind another
// proxy prefer a trusted source, see SECURITY.md
const ipOf = (req: NextRequest) =>
  (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();

// drop stale lockout entries so the map does not grow forever
const sweep = (now: number) => {
  if (attempts.size < 500) return;
  attempts.forEach((v, k) => { if (v.until < now - 3600000 && v.fails === 0) attempts.delete(k); });
};

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: validToken(req.cookies.get('zx_admin')?.value) });
}

export async function POST(req: NextRequest) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return NextResponse.json({ ok: false }, { status: 500 });

  const key = ipOf(req);
  const now = Date.now();
  sweep(now);
  const a = attempts.get(key) || { fails: 0, until: 0, n: 0 };
  if (a.until > now) {
    return NextResponse.json({ ok: false, wait: Math.ceil((a.until - now) / 1000) }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const given = typeof body?.pass === 'string' ? body.pass : '';

  if (given && same(given, pass)) {
    attempts.delete(key);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('zx_admin', makeToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE
    });
    return res;
  }

  // 3 fails -> lockout 60s, doubles each time (capped so it can recover)
  a.fails += 1;
  if (a.fails >= 3) {
    a.until = now + 60000 * Math.pow(2, Math.min(a.n, 5));
    a.n += 1;
    a.fails = 0;
  }
  attempts.set(key, a);
  const wait = a.until > now ? Math.ceil((a.until - now) / 1000) : 0;
  return NextResponse.json({ ok: false, wait }, { status: wait ? 429 : 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('zx_admin', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
