// server side wrapper: reads the shared content before rendering, so a first
// time visitor never sees the demo content flash by
import { cookies } from 'next/headers';
import { DEFAULTS } from '@/lib/data';
import { readContent } from '@/lib/content';
import { pickLang } from '@/lib/lang';
import Site from './site';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // read straight from blob. see lib/content.ts for why there is no cache yet
  const data = await readContent();
  // english for everyone until the visitor picks ru, so the first paint is
  // already right and there is no flash of the wrong language
  const jar = await cookies();
  const lang = pickLang(jar.get('zx_lang')?.value);
  return <Site initial={data || DEFAULTS} initialLang={lang} />;
}
