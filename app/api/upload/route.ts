// upload media (image / video) to supabase storage and return a public url.
// new media becomes a url in the content json, so the file stays small.
// takes either a data url from the browser, or a link to copy: a pasted cdn
// link can expire, ours does not.
// only the admin can upload; without supabase the caller keeps its base64.
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { validToken } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// mime -> file extension. this is also the allowlist: nothing else is stored
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/svg+xml': 'svg', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm'
};

const MAX_BYTES = 25_000_000;

// public http links only, so a copy can not reach our own network
function publicUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h === '::1') return null;
  if (/^(10|127)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
  return u;
}

const bad = (err: string, status = 400) => NextResponse.json({ ok: false, err }, { status });

export async function POST(req: NextRequest) {
  if (!validToken(req.cookies.get('zx_admin')?.value)) {
    return NextResponse.json({ ok: false, err: 'not logged in' }, { status: 401 });
  }

  const supabase = supabaseServer();
  if (!supabase) return NextResponse.json({ ok: false, err: 'no supabase' });

  let body: { dataUrl?: string; ext?: string; url?: string } = {};
  try { body = await req.json(); } catch {}

  let buffer: Buffer;
  let mime: string;

  if (typeof body.url === 'string' && body.url.trim()) {
    // copy someone else's link into our storage
    const src = publicUrl(body.url.trim());
    if (!src) return bad('that is not a public http link');
    const res = await fetch(src, { redirect: 'follow' }).catch(() => null);
    if (!res || !res.ok) return bad('the link is dead (' + (res ? 'http ' + res.status : 'no answer') + ')');
    mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    const dataUrl = body?.dataUrl;
    const comma = typeof dataUrl === 'string' ? dataUrl.indexOf(',') : -1;
    if (!dataUrl || !dataUrl.startsWith('data:') || comma < 0) return bad('bad data url');

    // split "data:<mime>;base64,<payload>"
    const head = dataUrl.slice(5, comma);
    mime = (head.split(';')[0] || '').toLowerCase();
    const isB64 = head.includes('base64');
    const payload = dataUrl.slice(comma + 1);
    buffer = isB64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');
  }

  // extension comes from the mime, so a caller can not name the file
  const ext = EXT_BY_MIME[mime];
  if (!ext) return bad('not an image or a video (' + (mime || 'unknown type') + ')', 415);
  if (!buffer.length) return bad('the file is empty');
  if (buffer.length > MAX_BYTES) return bad('the file is over 25mb', 413);

  const path = `uploads/${randomUUID()}.${ext}`;
  const up = await supabase.storage.from('media').upload(path, buffer, {
    contentType: mime,
    upsert: false
  });
  if (up.error) return NextResponse.json({ ok: false, err: up.error.message });

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
