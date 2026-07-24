// upload media (image / video) to supabase storage and return a public url.
// new media becomes a url in the content json, so the file stays small.
// only the admin can upload; without supabase the caller keeps its base64.
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { validToken } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// map a data url mime to a file extension
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/svg+xml': 'svg', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm'
};

export async function POST(req: NextRequest) {
  if (!validToken(req.cookies.get('zx_admin')?.value)) {
    return NextResponse.json({ ok: false, err: 'not logged in' }, { status: 401 });
  }

  const supabase = supabaseServer();
  if (!supabase) return NextResponse.json({ ok: false, err: 'no supabase' });

  let body: { dataUrl?: string; ext?: string } = {};
  try { body = await req.json(); } catch {}
  const dataUrl = body?.dataUrl;
  const comma = typeof dataUrl === 'string' ? dataUrl.indexOf(',') : -1;
  if (!dataUrl || !dataUrl.startsWith('data:') || comma < 0) {
    return NextResponse.json({ ok: false, err: 'bad data url' }, { status: 400 });
  }

  // split "data:<mime>;base64,<payload>"
  const head = dataUrl.slice(5, comma);
  const mime = head.split(';')[0] || 'application/octet-stream';
  const isB64 = head.includes('base64');
  const payload = dataUrl.slice(comma + 1);
  const buffer = isB64
    ? Buffer.from(payload, 'base64')
    : Buffer.from(decodeURIComponent(payload), 'utf8');

  // safe extension: caller hint (letters/digits only), else mime map, else bin
  const hint = body.ext ? String(body.ext).replace(/[^a-z0-9]/gi, '').toLowerCase() : '';
  const ext = hint || EXT_BY_MIME[mime] || 'bin';
  const path = `uploads/${randomUUID()}.${ext}`;

  const up = await supabase.storage.from('media').upload(path, buffer, {
    contentType: mime,
    upsert: false
  });
  if (up.error) return NextResponse.json({ ok: false, err: up.error.message });

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
