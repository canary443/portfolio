// admin session api: post = login, get = check, delete = logout
import { NextRequest, NextResponse } from 'next/server';
import { MAX_AGE, makeToken, same, validToken } from '@/lib/session';

export const runtime = 'nodejs';

// per ip attempts, in memory (resets on redeploy, see SECURITY.md)
const attempts = new Map<string, { fails: number; until: number; n: number }>();

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
