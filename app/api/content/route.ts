// site content api: one json file in vercel blob, shared by every browser.
// get is public (the site reads it), put needs the admin cookie.
import { NextRequest, NextResponse } from 'next/server';
import { get, put } from '@vercel/blob';
import { validToken } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILE = 'site.json';
// vercel caps a function request body at ~4.5mb
const MAX_BYTES = 4_000_000;

const noStore = { 'cache-control': 'no-store' };

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ data: null, err: 'no blob store' }, { headers: noStore });
  }
  try {
    // useCache off so an edit shows up right after saving
    const res = await get(FILE, { access: 'private', useCache: false });
    if (!res) return NextResponse.json({ data: null }, { headers: noStore });
    const text = await new Response(res.stream).text();
    return NextResponse.json({ data: JSON.parse(text) }, { headers: noStore });
  } catch {
    // no file yet, or bad json: the site falls back to defaults
    return NextResponse.json({ data: null }, { headers: noStore });
  }
}

export async function PUT(req: NextRequest) {
  if (!validToken(req.cookies.get('zx_admin')?.value)) {
    return NextResponse.json({ ok: false, err: 'not logged in' }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, err: 'no blob store' }, { status: 500 });
  }

  const raw = await req.text().catch(() => '');
  if (raw.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, err: 'content too big, remove some media' }, { status: 413 });
  }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { body = null; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, err: 'bad body' }, { status: 400 });
  }

  try {
    await put(FILE, JSON.stringify(body), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, err: 'blob write failed' }, { status: 500 });
  }
}
