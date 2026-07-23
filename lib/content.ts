// server side read of the shared content file. used by the page (so the first
// paint already has real content) and by the content api.
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
