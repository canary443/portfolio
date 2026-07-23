// site content api: one json file in vercel blob, shared by every browser.
// get is public (the site reads it), put needs the admin cookie.
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { validToken } from '@/lib/session';
import { readContent, FILE } from '@/lib/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// vercel caps a function request body at ~4.5mb
const MAX_BYTES = 4_000_000;

const noStore = { 'cache-control': 'no-store' };

export async function GET() {
  // null when there is no file yet: the site falls back to defaults
  return NextResponse.json({ data: await readContent() }, { headers: noStore });
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
