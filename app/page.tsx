// server side wrapper: reads the shared content before rendering, so a first
// time visitor never sees the demo content flash by
import { cookies } from 'next/headers';
import { DEFAULTS } from '@/lib/data';
import { readContent } from '@/lib/content';
import Site from './site';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // read straight from blob. see lib/content.ts for why there is no cache yet
  const data = await readContent();
  // language comes from a cookie, so the first paint is already the saved one
  const lang = (await cookies()).get('zx_lang')?.value === 'ru' ? 'ru' as const : 'en' as const;
  return <Site initial={data || DEFAULTS} initialLang={lang} />;
}
