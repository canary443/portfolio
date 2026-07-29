// which language a visitor gets. english is the default for everyone, whatever
// their browser asks for. only their own pick in the language switcher changes
// it, and that is kept for a year in the zx_lang cookie.

import type { Lang } from './i18n';

export function pickLang(cookie?: string): Lang {
  return cookie === 'ru' ? 'ru' : 'en';
}
