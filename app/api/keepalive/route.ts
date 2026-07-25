// daily ping so a free supabase project is not paused for inactivity.
// run by a vercel cron (see vercel.json). one tiny rest read counts as activity.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // vercel cron sends this header when CRON_SECRET is set on the project.
  // no secret set yet: stay open so the cron keeps working.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, err: 'not allowed' }, { status: 401 });
  }
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
