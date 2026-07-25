// which language a visitor gets. their own pick wins for a year, and until
// they pick, the browser decides: accept-language is what every browser sends
// with the page request, so no fingerprinting is needed for this.
// only russian maps to the ru side of the site, everything else reads english.

import type { Lang } from './i18n';

// "ru-RU,ru;q=0.9,en-US;q=0.8" - the tag with the highest weight wins
function browserWantsRu(accept?: string | null): boolean {
  if (!accept) return false;
  const best = accept
    .split(',')
    .map(part => {
      const bits = part.trim().split(';');
      const tag = (bits[0] || '').trim().toLowerCase();
      const q = bits.slice(1).map(b => b.trim()).find(b => b.startsWith('q='));
      const weight = q ? parseFloat(q.slice(2)) : 1;
      return { tag, q: Number.isFinite(weight) ? weight : 0 };
    })
    .filter(x => x.tag && x.tag !== '*')
    .sort((a, b) => b.q - a.q)[0];
  return !!best && (best.tag === 'ru' || best.tag.startsWith('ru-'));
}

export function pickLang(cookie?: string, accept?: string | null): Lang {
  if (cookie === 'ru' || cookie === 'en') return cookie;
  return browserWantsRu(accept) ? 'ru' : 'en';
}
