// server side read of the shared content file. used by the page (so the first
// paint already has real content) and by the content api.
//
// there is no data cache around this on purpose: the next data cache refuses
// anything over 2mb and the failure comes back as an unhandled rejection on
// every request, and site.json is ~3.8mb while old photos still sit in it as
// base64. move the media to storage first (admin settings, "move files to
// storage"), then wrapping this in unstable_cache with a tag the save clears
// is a three line change and a real ttfb win.
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

