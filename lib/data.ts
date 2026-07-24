// shared data layer: types, defaults, storage

const KEY = 'zx_data_v2';

export interface Service {
  id: string; glyph: string; icon: string | null;
  title: string; titleRu?: string; desc: string; descRu?: string;
}
export interface LogEntry {
  id: string; date: string; text: string; textRu?: string;
}
export interface Work {
  id: string; title: string; titleRu?: string;
  desc: string; descRu?: string;
  imgs?: string[]; img: string | null; video?: string | null;
  link: string; price: string; date?: string;
  changelog?: LogEntry[];
}
export interface TeamProject {
  id: string; name: string; role: string; roleRu?: string;
  from: string; to: string; link: string; img?: string | null;
  changelog?: LogEntry[];
}
export interface FaqItem {
  id: string; q: string; qRu?: string; a: string; aRu?: string;
}
// visual effects, all admin editable. webgl ones need three/ogl and only run
// on capable devices, so 'image' hero and 'dot' cursor stay the safe fallback.
export type HeroBg = 'image' | 'pixel-blast' | 'threads' | 'liquid-chrome';
export type CursorStyle = 'dot' | 'pixel-trail' | 'target' | 'native';
export interface SiteData {
  about: string; aboutRu?: string;
  telegram: string; github: string; email: string;
  services: Service[]; works: Work[]; projects: TeamProject[]; faq: FaqItem[];
  // effects (flat fields so old saved data backfills from defaults)
  heroBg?: HeroBg; cursorStyle?: CursorStyle;
  fxGradualBlur?: boolean; fxHeadlineReveal?: boolean;
  fxShapeBlur?: boolean; fxFluidGlass?: boolean; fxCardTilt?: boolean;
}

export const DEFAULTS: SiteData = {
  about: "AimworkSpace is a one-person studio. Full stack: front, back, bots, deploys.\nWorking remote since 2023. If it can be automated, it will be automated.\nPayment in USDT or RUB. Turnaround: 3-14 days depending on scope.\nResponse time under 24 hours.",
  aboutRu: "AimworkSpace - студия одного человека. Фулстек: фронт, бэк, боты, деплой.\nРаботаю удалённо с 2023. Всё, что можно автоматизировать, будет автоматизировано.\nОплата в USDT или рублях. Сроки: 3-14 дней в зависимости от объёма.\nОтвечаю быстрее чем за 24 часа.",
  telegram: 'sickbuddy',
  github: 'canary443',
  email: 'contact@leet-cheats.xyz',
  heroBg: 'image',
  cursorStyle: 'dot',
  fxGradualBlur: true,
  fxHeadlineReveal: true,
  fxShapeBlur: false,
  fxFluidGlass: false,
  fxCardTilt: false,
  services: [
    { id: 's1', glyph: '▤', icon: null, title: 'Sites', titleRu: 'Сайты', desc: 'Landings, portfolios, shops. Fast and clean.', descRu: 'Лендинги, портфолио, магазины. Быстро и аккуратно.' },
    { id: 's2', glyph: '◉', icon: null, title: 'Bots', titleRu: 'Боты', desc: 'Telegram bots: shops, monitors, payments, alerts.', descRu: 'Телеграм-боты: магазины, мониторинги, оплата, уведомления.' },
    { id: 's3', glyph: '↻', icon: null, title: 'Automation', titleRu: 'Автоматизация', desc: 'Parsers, scripts, pipelines. Boring stuff on autopilot.', descRu: 'Парсеры, скрипты, пайплайны. Рутина работает сама.' },
    { id: 's4', glyph: '</>', icon: null, title: 'Custom code', titleRu: 'Свой код', desc: 'APIs, dashboards, weird ideas welcome.', descRu: 'API, дашборды, нестандартные идеи - welcome.' }
  ],
  works: [
    { id: 'w1', title: 'Telegram shop bot', desc: 'Storefront bot: catalog, cart, CryptoBot payments, admin notifications.', img: null, link: '', price: '$450', date: '2025.11' },
    { id: 'w2', title: 'VPN landing', desc: 'One-page landing for a small VPN service. Dark, fast, loads in under a second.', img: null, link: 'https://example.com', price: '$300', date: '2025.08' },
    { id: 'w3', title: 'Drops monitor', desc: 'Sneaker / restock monitor. Parses 12 shops, pushes to a Telegram channel in under 2s.', img: null, link: '', price: '$250', date: '2025.04' },
    { id: 'w4', title: 'CRM panel', desc: 'Custom CRM for a delivery crew: orders, courier map, daily CSV exports.', img: null, link: '', price: '$800', date: '2026.02' }
  ],
  projects: [
    { id: 'p1', name: 'darkstat', role: 'backend dev', from: '2024.02', to: '2024.11', link: '' },
    { id: 'p2', name: 'mailer svc', role: 'fullstack', from: '2023.06', to: '2024.01', link: '' },
    { id: 'p3', name: 'unnamed startup', role: 'frontend', from: '2025.03', to: 'now', link: '' }
  ],
  faq: [
    { id: 'f1', q: 'How do we start?', qRu: 'С чего начинаем?', a: 'DM me on Telegram with a short description of the idea. I reply within a day with questions and a quote.', aRu: 'Напиши мне в телеграм пару слов об идее. В течение дня отвечу с вопросами и ценой.' },
    { id: 'f2', q: 'How do you price?', qRu: 'Как считается цена?', a: 'Fixed price per project after we agree on scope. Half upfront, half on delivery - or we can go through a middleman (escrow) you trust. USDT or RUB.', aRu: 'Фикс за проект после того, как договоримся об объёме. Половина вперёд, половина по готовности - или через гаранта, которому ты доверяешь. USDT или рубли.' },
    { id: 'f3', q: 'How long does a project take?', qRu: 'Сколько делается проект?', a: 'Small bots and landings: 3-7 days. Bigger things: 1-3 weeks. You get progress updates along the way.', aRu: 'Небольшие боты и лендинги: 3-7 дней. Что-то посерьёзнее: 1-3 недели. По ходу показываю прогресс.' },
    { id: 'f4', q: 'Do you support projects after launch?', qRu: 'Поддерживаешь после запуска?', a: 'Yes. First two weeks of fixes are free, then a small monthly rate if you want ongoing support.', aRu: 'Да. Первые две недели правок бесплатно, дальше небольшая месячная плата, если нужна поддержка.' },
    { id: 'f5', q: 'What about hosting?', qRu: 'А хостинг?', a: 'The first month (or the first two weeks of the project) runs on my VPS completely free: I host everything, set it up and help with whatever comes up. Then we move it wherever you want.', aRu: 'Первый месяц (или первые две недели проекта) всё крутится на моём VPS бесплатно: хощу всё сам, настраиваю и помогаю. Потом переносим куда захочешь.' }
  ]
};

export function loadData(): SiteData {
  if (typeof window === 'undefined') return structuredClone(DEFAULTS);
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && typeof d === 'object') return { ...structuredClone(DEFAULTS), ...d };
  } catch {}
  return structuredClone(DEFAULTS);
}
// returns false when the browser rejects the write (usually quota)
export function saveData(d: SiteData): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
  catch { return false; }
}
export function resetData() { localStorage.setItem(KEY, JSON.stringify(DEFAULTS)); }

// shared content on the server (vercel blob). localStorage stays as a local
// cache so the first paint is instant, but the server copy wins.
export async function loadRemote(): Promise<SiteData | null> {
  try {
    const r = await fetch('/api/content', { cache: 'no-store' });
    const j = await r.json();
    if (j?.data && typeof j.data === 'object') return { ...structuredClone(DEFAULTS), ...j.data };
  } catch {}
  return null;
}

export async function saveRemote(d: SiteData): Promise<{ ok: boolean; err: string }> {
  try {
    const r = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(d)
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && !!j.ok, err: j.err || ('http ' + r.status) };
  } catch {
    return { ok: false, err: 'network error' };
  }
}

// usd -> rub rate, cached 12h
export async function fetchRub(): Promise<number> {
  try {
    const c = JSON.parse(localStorage.getItem('zx_rub') || 'null');
    if (c && Date.now() - c.ts < 43200000) return c.v;
  } catch {}
  try {
    const j = await (await fetch('https://open.er-api.com/v6/latest/USD')).json();
    const v = j?.rates?.RUB;
    if (v) { localStorage.setItem('zx_rub', JSON.stringify({ v, ts: Date.now() })); return v; }
  } catch {}
  return 95;
}
