// server side read of the shared content file. used by the page (so the first
// paint already has real content) and by the content api.
//
// no data cache around this read yet. the next data cache refuses anything
// over 2mb and throws an unhandled rejection on every request when it does,
// and site.json used to be ~3.8mb of base64 media. the media moved to storage
// on 2026-07-25 and the file is ~13kb now, so that blocker is gone: wrapping
// this in unstable_cache with a tag the /api/content put clears is a three
// line change and a real ttfb win whenever someone wants it.
import { get } from '@vercel/blob';
import { DEFAULTS, SiteData } from './data';

// override only for local testing, so a test run can not touch real content
export const FILE = process.env.CONTENT_FILE || 'site.json';

// null when there is no file yet or the store is not set up
export async function readContent(): Promise<SiteData | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    // useCache off so an edit shows up right after saving
    const res = await get(FILE, { access: 'private', useCache: false });
    if (!res) return null;
    const d = JSON.parse(await new Response(res.stream).text());
    if (!d || typeof d !== 'object') return null;
    return { ...structuredClone(DEFAULTS), ...d };
  } catch {
    return null;
  }
}

