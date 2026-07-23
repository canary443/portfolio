// server side wrapper: reads the shared content before rendering, so a first
// time visitor never sees the demo content flash by
import { DEFAULTS } from '@/lib/data';
import { readContent } from '@/lib/content';
import Site from './site';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await readContent();
  return <Site initial={data || DEFAULTS} />;
}
