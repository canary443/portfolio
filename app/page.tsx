// server side wrapper: reads the shared content before rendering, so a first
// time visitor never sees the demo content flash by
import { cookies, headers } from 'next/headers';
import { DEFAULTS } from '@/lib/data';
import { readContent } from '@/lib/content';
import { pickLang } from '@/lib/lang';
import Site from './site';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // read straight from blob. see lib/content.ts for why there is no cache yet
  const data = await readContent();
  // saved pick first, else the language the browser asks for. either way the
  // first paint is already right, there is no flash of the wrong language
  const [jar, head] = await Promise.all([cookies(), headers()]);
  const lang = pickLang(jar.get('zx_lang')?.value, head.get('accept-language'));
  return <Site initial={data || DEFAULTS} initialLang={lang} />;
}
