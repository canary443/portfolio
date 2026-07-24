// daily ping so a free supabase project is not paused for inactivity.
// run by a vercel cron (see vercel.json). one tiny rest read counts as activity.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, err: 'no supabase' });
  try {
    // the keepalive table may not exist, a 404 still counts as a request
    await fetch(`${url}/rest/v1/keepalive?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store'
    });
  } catch {}
  return NextResponse.json({ ok: true });
}
