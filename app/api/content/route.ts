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

// fields the page renders as text, and lists of items it maps over
const TEXT_KEYS = ['about', 'telegram', 'github', 'email'] as const;
const LIST_KEYS = ['services', 'works', 'projects', 'faq'] as const;

// light shape check: only what the page would crash on. extra keys are fine,
// the content model keeps growing. returns an error text or null when ok.
function shapeError(body: Record<string, unknown>): string | null {
  for (const k of TEXT_KEYS) {
    if (body[k] !== undefined && typeof body[k] !== 'string') return `${k} must be text`;
  }
  for (const k of LIST_KEYS) {
    const list = body[k];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return `${k} must be a list`;
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return `${k} needs objects`;
      if (typeof (item as { id?: unknown }).id !== 'string') return `every ${k} item needs a text id`;
    }
  }
  return null;
}

export async function GET() {
  // uncached read so the admin always sees the copy it just saved.
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
  const bad = shapeError(body as Record<string, unknown>);
  if (bad) {
    return NextResponse.json({ ok: false, err: `bad content: ${bad}` }, { status: 400 });
  }

  try {
    await put(FILE, JSON.stringify(body), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60
    });
  } catch {
    return NextResponse.json({ ok: false, err: 'blob write failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
