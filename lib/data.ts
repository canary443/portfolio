// shared data layer: types, defaults, storage

import type { Dict, Lang } from './i18n';

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
  link: string; date?: string;
  changelog?: LogEntry[];
}
export interface TeamProject {
  id: string; name: string; role: string; roleRu?: string;
  from: string; to: string; link: string; img?: string | null;
  changelog?: LogEntry[];
}
// the cursor only runs on a fine pointer with motion on, so 'native' is the
// safe fallback everywhere else
export type CursorStyle = 'dot' | 'pixel-trail' | 'target' | 'native';
// cyrillic companion font for the russian locale (latin stays satoshi)
export type RuFont = 'onest' | 'carlito' | 'jost';
export interface SiteData {
  about: string; aboutRu?: string;
  // about media: gif/photo in a frame under the about text.
  // width in px (capped by the viewport), aspect like '16/9' or 'auto'
  aboutImg?: string | null;
  aboutImgW?: number;
  aboutImgAspect?: string;
  // the location line under the about text, and its little flag
  aboutShowBased?: boolean; aboutShowFlag?: boolean;
  telegram: string; github: string; email: string;
  services: Service[]; works: Work[]; projects: TeamProject[];
  // whole blocks the admin can hide. the services nav link goes with its section
  showServices?: boolean;
  showStack?: boolean;
  // effects (flat fields so old saved data backfills from defaults)
  cursorStyle?: CursorStyle;
  fxGradualBlur?: boolean;
  fxCardTilt?: boolean;
  fontRu?: RuFont;
  // per string font override for russian ui text; missing key follows fontRu
  i18nFontRu?: Partial<Record<keyof Dict, RuFont>>;
  // interface text overrides per language; empty/missing falls back to lib/i18n defaults
  i18n?: Partial<Record<Lang, Partial<Dict>>>;
}

export const DEFAULTS: SiteData = {
  about: "AimworkSpace is a one-person studio. Full stack: front, back, bots, deploys.\nWorking remote since 2023. If it can be automated, it will be automated.\nPayment in USDT or RUB. Turnaround: 3-14 days depending on scope.\nResponse time under 24 hours.",
  aboutRu: "AimworkSpace - студия одного человека. Фулстек: фронт, бэк, боты, деплой.\nРаботаю удалённо с 2023. Всё, что можно автоматизировать, будет автоматизировано.\nОплата в USDT или рублях. Сроки: 3-14 дней в зависимости от объёма.\nОтвечаю быстрее чем за 24 часа.",
  aboutImg: '/assets/rigrig.jpg',
  aboutImgW: 252,
  aboutImgAspect: '16/9',
  aboutShowBased: true,
  aboutShowFlag: true,
  telegram: 'sickbuddy',
  github: 'canary443',
  email: 'contact@leet-cheats.xyz',
  showServices: true,
  showStack: true,
  cursorStyle: 'dot',
  fxGradualBlur: true,
  fxCardTilt: false,
  fontRu: 'onest',
  services: [
    { id: 's1', glyph: '▤', icon: null, title: 'Sites', titleRu: 'Сайты', desc: 'Landings, portfolios, shops. Fast and clean.', descRu: 'Лендинги, портфолио, магазины. Быстро и аккуратно.' },
    { id: 's2', glyph: '◉', icon: null, title: 'Bots', titleRu: 'Боты', desc: 'Telegram bots: shops, monitors, payments, alerts.', descRu: 'Телеграм-боты: магазины, мониторинги, оплата, уведомления.' },
    { id: 's3', glyph: '↻', icon: null, title: 'Automation', titleRu: 'Автоматизация', desc: 'Parsers, scripts, pipelines. Boring stuff on autopilot.', descRu: 'Парсеры, скрипты, пайплайны. Рутина работает сама.' },
    { id: 's4', glyph: '</>', icon: null, title: 'Custom code', titleRu: 'Свой код', desc: 'APIs, dashboards, weird ideas welcome.', descRu: 'API, дашборды, нестандартные идеи - welcome.' }
  ],
  works: [
    { id: 'w1', title: 'Telegram shop bot', desc: 'Storefront bot: catalog, cart, CryptoBot payments, admin notifications.', img: null, link: '', date: '2025.11' },
    { id: 'w2', title: 'VPN landing', desc: 'One-page landing for a small VPN service. Dark, fast, loads in under a second.', img: null, link: 'https://example.com', date: '2025.08' },
    { id: 'w3', title: 'Drops monitor', desc: 'Sneaker / restock monitor. Parses 12 shops, pushes to a Telegram channel in under 2s.', img: null, link: '', date: '2025.04' },
    { id: 'w4', title: 'CRM panel', desc: 'Custom CRM for a delivery crew: orders, courier map, daily CSV exports.', img: null, link: '', date: '2026.02' }
  ],
  projects: [
    { id: 'p1', name: 'darkstat', role: 'backend dev', from: '2024.02', to: '2024.11', link: '' },
    { id: 'p2', name: 'mailer svc', role: 'fullstack', from: '2023.06', to: '2024.01', link: '' },
    { id: 'p3', name: 'unnamed startup', role: 'frontend', from: '2025.03', to: 'now', link: '' }
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
