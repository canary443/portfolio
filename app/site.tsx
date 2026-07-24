'use client';
// main site page, ported from the design prototype

import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { Bot } from '@/components/animate-ui/icons/bot';
import { Layers } from '@/components/animate-ui/icons/layers';
import { Cog } from '@/components/animate-ui/icons/cog';
import { Binary } from '@/components/animate-ui/icons/binary';
import { loadRemote, fetchRub, SiteData, LogEntry } from '@/lib/data';
import { T, Lang, type Dict } from '@/lib/i18n';
import { config } from '@/lib/config';
import { webglSupported } from '@/lib/fx';
import HeroFx from '@/components/fx/HeroFx';
import PixelTrailCursor from '@/components/fx/PixelTrailCursor';
import TargetCursorFx from '@/components/fx/TargetCursorFx';
import HeadlineReveal from '@/components/fx/HeadlineReveal';
import { Reveal } from '@/components/animate-ui/primitives/effects/reveal';
import GradualBlur from '@/components/GradualBlur';
import LogoLoop from '@/components/LogoLoop';

// one slide of a card carousel: video or photo
interface Media { kind: 'video' | 'img'; src: string }
interface Item {
  id: string; media: Media[];
  title: string; link: string; sub: string; cat: string;
  metaDim: string; metaMain: string; metaSub: string; place: string;
  // per string ru font, resolved from the i18n key that filled the field
  metaFont?: React.CSSProperties; placeFont?: React.CSSProperties;
  changelog: LogEntry[];
}

const EASE = 'cubic-bezier(.22,1,.36,1)';
// sites, bots, automation, custom code
const SERVICE_ICONS = { s1: Layers, s2: Bot, s3: Cog, s4: Binary } as const;
// [simpleicons slug, label, official link]
const STACK: [string, string, string][] = [
  ['python', 'Python', 'https://www.python.org'], ['rust', 'Rust', 'https://www.rust-lang.org'],
  ['cplusplus', 'C++', 'https://isocpp.org'], ['typescript', 'TypeScript', 'https://www.typescriptlang.org'],
  ['javascript', 'JavaScript', 'https://developer.mozilla.org/docs/Web/JavaScript'], ['react', 'React', 'https://react.dev'],
  ['vite', 'Vite', 'https://vite.dev'], ['nextdotjs', 'Next.js', 'https://nextjs.org'],
  ['git', 'Git', 'https://git-scm.com'], ['claude', 'Agents / Claude', 'https://www.anthropic.com/claude'],
  ['postgresql', 'SQL', 'https://www.postgresql.org'], ['redis', 'Redis', 'https://redis.io']
];
// logo-loop items: icon + label, each linking to the tech's site
const STACK_LOGOS = STACK.map(([slug, label, href]) => ({
  node: (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img src={`https://cdn.simpleicons.org/${slug}/9c9c9c`} loading="lazy" alt="" style={{ width: 18, height: 18, display: 'block', opacity: .75 }} />
      <span style={{ fontSize: 14, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  ),
  title: label,
  ariaLabel: label,
  href
}));

// language dropdown chevron (path inherits the svg fill)
const CHEV = (<path d="M10.0878 4.83761C10.3157 4.6098 10.6849 4.6098 10.9127 4.83761C11.1405 5.06542 11.1405 5.43469 10.9127 5.66248L7.41272 9.16248C7.18493 9.39027 6.81566 9.39024 6.58785 9.16248L3.08785 5.66248C2.86004 5.43467 2.86004 5.06542 3.08785 4.83761C3.31565 4.6098 3.68491 4.6098 3.91272 4.83761L7.00028 7.92518L10.0878 4.83761Z" />);

// which cyrillic font backs satoshi in the russian locale
const RU_FONT_STACK: Record<string, string> = {
  onest: "'Satoshi', 'Onest', ui-sans-serif, system-ui, sans-serif",
  carlito: "'Satoshi', 'Carlito', ui-sans-serif, system-ui, sans-serif",
  jost: "'Satoshi', 'Jost', ui-sans-serif, system-ui, sans-serif"
};

export default function Site({ initial, initialLang = 'en' }: { initial: SiteData; initialLang?: Lang }) {
  // the server already read the shared content, so the first paint is real.
  // the client only re-pulls it when the tab gets focus again
  const [data, setData] = useState<SiteData>(initial);
  // language arrives from the cookie, so there is no flash of english
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [scrolled, setScrolled] = useState(false);
  // id -> stagger delay in ms, assigned by batch position when it enters
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const [revealAll, setRevealAll] = useState(false);
  const [modal, setModal] = useState<Item | null>(null);
  const [pic, setPic] = useState(0);
  const [cardPic, setCardPic] = useState<Record<string, number>>({});
  const [faqOpen, setFaqOpen] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [noise, setNoise] = useState('');
  const [rub, setRub] = useState(95);
  const [closing, setClosing] = useState(false);
  const [safari, setSafari] = useState(false);
  const [customCursor, setCustomCursor] = useState(false);
  const [motionOk, setMotionOk] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  // effect gates set after mount: fine pointer + motion on, and real webgl support
  const [fineOk, setFineOk] = useState(false);
  const [webglOk, setWebglOk] = useState(false);
  const [fxResolved, setFxResolved] = useState(false); // capability check has run

  const cursorRef = useRef<HTMLDivElement>(null);
  const handsRef = useRef<HTMLImageElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const modalOpen = useRef(false);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fine = useRef(false);
  const reduced = useRef(false);
  // mirrors for the auto-advance timer, so it reads fresh values without resetting
  const cardPicRef = useRef(cardPic);
  const itemsRef = useRef<Item[]>([]);
  cardPicRef.current = cardPic;

  // which effects are on. webgl and the pixel trail need a fine pointer with
  // motion allowed, so touch, reduced-motion and no-webgl fall back to plain ui
  const cursorStyle = data.cursorStyle || 'dot';
  const dotOn = cursorStyle === 'dot' && customCursor;
  const trailOn = cursorStyle === 'pixel-trail' && fineOk;
  const targetOn = cursorStyle === 'target' && fineOk;
  const fxCapable = webglOk && fineOk;
  const heroBg = data.heroBg || 'image';
  const heroFxOn = fxCapable && heroBg !== 'image';
  // show the hands only for the image mode, or as a fallback once we know webgl
  // is not available - never during the brief window before that is resolved,
  // so effect backgrounds do not flash the hands on load
  const showImage = config.showMap && (heroBg === 'image' || (fxResolved && !fxCapable));
  const gradualOn = data.fxGradualBlur !== false;
  const headlineOn = data.fxHeadlineReveal !== false && motionOk;
  const tiltOn = !!data.fxCardTilt && fineOk;

  // detect input and browser once
  useEffect(() => {
    fine.current = window.matchMedia('(pointer:fine)').matches;
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ua = navigator.userAgent;
    // webkit (safari + all ios browsers) needs cheaper compositing: no blend modes
    const iOS = /iphone|ipad|ipod/i.test(ua) || (/mac/i.test(ua) && navigator.maxTouchPoints > 1);
    const desktopSafari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg|android/i.test(ua);
    const isSafari = iOS || desktopSafari;
    setSafari(isSafari);
    setCustomCursor(!isSafari && fine.current && !reduced.current);
    setMotionOk(!reduced.current);
    setFineOk(fine.current && !reduced.current);
    setWebglOk(webglSupported());
    setFxResolved(true);
  }, []);

  // close the language menu on an outside click
  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => { if (!langRef.current?.contains(e.target as Node)) setLangOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [langOpen]);

  // modal open: freeze scroll under it
  useEffect(() => {
    modalOpen.current = !!modal;
    if (modal) { lenisRef.current?.stop(); document.body.style.overflow = 'hidden'; }
    else { lenisRef.current?.start(); document.body.style.overflow = ''; }
  }, [modal]);

  // language + rate, and re-pull content on focus to pick up admin edits
  useEffect(() => {
    // old visitors only have localStorage: honor it once and set the cookie
    const saved = localStorage.getItem('zx_lang') as Lang | null;
    if (saved && saved !== initialLang) {
      setLangState(saved);
      document.cookie = 'zx_lang=' + saved + ';path=/;max-age=31536000;samesite=lax';
    }
    fetchRub().then(setRub);
    // preview mode (admin iframe): paint from the draft the admin writes to
    // localStorage and live-update on storage events, do not pull the server
    const preview = new URLSearchParams(window.location.search).get('preview') === '1';
    if (preview) {
      try { const d = JSON.parse(localStorage.getItem('zx_preview') || 'null'); if (d) setData(d); } catch {}
      const onStorage = (e: StorageEvent) => { if (e.key === 'zx_preview' && e.newValue) { try { setData(JSON.parse(e.newValue)); } catch {} } };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    const onFocus = () => loadRemote().then(d => { if (d) setData(d); });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // grain texture
  useEffect(() => {
    if (!config.grain) return;
    const c = document.createElement('canvas');
    c.width = 140; c.height = 140;
    const ctx = c.getContext('2d')!;
    const im = ctx.createImageData(140, 140);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.random() * 255;
      im.data[i] = v; im.data[i + 1] = v; im.data[i + 2] = v; im.data[i + 3] = 22;
    }
    ctx.putImageData(im, 0, 0);
    setNoise(c.toDataURL());
  }, []);

  // scroll: nav morph + hero curtain + hands parallax
  useEffect(() => {
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (!motionOk) return;
      if (handsRef.current) handsRef.current.style.transform = 'translate3d(0,' + Math.min(y * .1, 130) + 'px,0) scale(1.06)';
      if (heroRef.current) {
        const hp = Math.min(y / (window.innerHeight * .9 || 1), 1);
        heroRef.current.style.opacity = String(1 - hp * .55);
        heroRef.current.style.transform = 'scale(' + (1 - hp * .05) + ') translate3d(0,' + hp * 26 + 'px,0)';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // lenis smooth scroll + anchor scroll (fine pointers, full motion only)
  useEffect(() => {
    if (!window.matchMedia('(pointer:fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.09, autoRaf: true });
    lenisRef.current = lenis;
    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!a) return;
      const el = document.getElementById(a.getAttribute('href')!.slice(1));
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -84 });
    };
    document.addEventListener('click', onAnchor);
    return () => {
      document.removeEventListener('click', onAnchor);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // cursor dot: lerped follow, loop sleeps when settled
  useEffect(() => {
    if (!dotOn) return;
    let mx = -100, my = -100, tx = -100, ty = -100, cs = 1, ts = 1, raf = 0, on = false, last = 0;
    // time-based lerp so the trail feels the same at 60hz (safari) and 120hz
    const loop = (now: number) => {
      const dt = last ? Math.min(now - last, 50) : 16.67; last = now;
      const kp = 1 - Math.pow(1 - .16, dt / 16.67), ks = 1 - Math.pow(1 - .18, dt / 16.67);
      mx += (tx - mx) * kp; my += (ty - my) * kp; cs += (ts - cs) * ks;
      if (cursorRef.current) cursorRef.current.style.transform = 'translate3d(' + (mx - 4.5) + 'px,' + (my - 4.5) + 'px,0) scale(' + cs + ')';
      if (Math.abs(tx - mx) < .1 && Math.abs(ty - my) < .1 && Math.abs(ts - cs) < .01) { on = false; return; }
      raf = requestAnimationFrame(loop);
    };
    const wake = () => { if (!on) { on = true; last = 0; raf = requestAnimationFrame(loop); } };
    const onMove = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY;
      const t = (e.target as HTMLElement | null)?.closest?.('a,button,input,textarea,[data-card]');
      ts = t ? 2.6 : 1;
      if (cursorRef.current) cursorRef.current.style.opacity = '1';
      wake();
    };
    const onLeave = () => { if (cursorRef.current) cursorRef.current.style.opacity = '0'; };
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [dotOn]);

  // reveal cards on scroll; re-observes when data changes so items added
  // via the focus reload also animate in
  useEffect(() => {
    if (reduced.current || !('IntersectionObserver' in window)) { setRevealAll(true); return; }
    const io = new IntersectionObserver(es => {
      // cards that enter together (one row) cascade left to right
      es.filter(en => en.isIntersecting).forEach((en, bi) => {
        const id = en.target.getAttribute('data-reveal')!;
        const d = Math.min(bi * 65, 260);
        setRevealed(r => (r[id] !== undefined ? r : { ...r, [id]: d }));
        io.unobserve(en.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    const t = setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach(c => {
        if (revealed[c.getAttribute('data-reveal')!] === undefined) io.observe(c);
      });
    }, 60);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // close with a short exit animation, then unmount
  const closeModal = useCallback(() => {
    if (!modalOpen.current) return;
    setClosing(true);
    clearTimeout(closeT.current);
    closeT.current = setTimeout(() => { setModal(null); setClosing(false); }, 180);
  }, []);

  const openModal = useCallback((w: Item, ci: number) => {
    clearTimeout(closeT.current);
    setClosing(false);
    setModal(w);
    setPic(ci);
  }, []);

  // esc closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  const setLang = (l: Lang) => {
    localStorage.setItem('zx_lang', l);
    // cookie so the server paints the right language on the next visit
    document.cookie = 'zx_lang=' + l + ';path=/;max-age=31536000;samesite=lax';
    setLangState(l);
    setLangOpen(false);
  };
  // admin can override any interface string per language; empty falls back to the default
  const t = { ...T[lang], ...(data.i18n?.[lang] ?? {}) } as (typeof T)[Lang];
  const ru = lang === 'ru';
  // per string font override for ru, picked in the admin interface-text page
  const rf = (k: keyof Dict): React.CSSProperties | undefined => {
    const f = ru ? data.i18nFontRu?.[k] : undefined;
    return f ? { fontFamily: RU_FONT_STACK[f] } : undefined;
  };

  // step one card carousel to its next slide
  const advanceCard = useCallback((id: string) => {
    const it = itemsRef.current.find(x => x.id === id);
    if (!it || it.media.length < 2) return;
    setCardPic(c => ({ ...c, [id]: ((c[id] || 0) + 1) % it.media.length }));
  }, []);

  // auto-advance photo slides every 5s. video slides wait for onEnded instead
  useEffect(() => {
    if (!motionOk) return;
    const iv = setInterval(() => {
      itemsRef.current.forEach(it => {
        if (it.media.length < 2) return;
        const ci = (cardPicRef.current[it.id] || 0) % it.media.length;
        if (it.media[ci]?.kind === 'img') advanceCard(it.id);
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [motionOk, advanceCard]);

  // in card carousels only the visible slide's video plays, the rest are paused
  useEffect(() => {
    document.querySelectorAll('video[data-cv]').forEach(el => {
      const v = el as HTMLVideoElement;
      const cur = cardPic[v.dataset.cv || ''] || 0;
      if (Number(v.dataset.slide) === cur) { v.muted = true; v.play().catch(() => {}); }
      else { v.pause(); }
    });
  }, [cardPic, data]);

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(''), 1700);
  }, []);

  const spotMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px');
    el.style.setProperty('--my', e.clientY - r.top + 'px');
  };
  const spotLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--mx', '-300px');
    e.currentTarget.style.setProperty('--my', '-300px');
  };
  // subtle 3d tilt that follows the pointer. .card already eases transform,
  // so the tilt trails smoothly. reset on leave springs it back flat.
  const tiltMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-3px)`;
  };
  const tiltLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = ''; };
  // project cards can run spotlight and tilt at the same time
  const cardMove = (e: React.MouseEvent<HTMLElement>) => { if (config.spotlight) spotMove(e); if (tiltOn) tiltMove(e); };
  const cardLeave = (e: React.MouseEvent<HTMLElement>) => { if (config.spotlight) spotLeave(e); if (tiltOn) tiltLeave(e); };
  const goTop = () => {
    if (lenisRef.current) lenisRef.current.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: reduced.current ? 'auto' : 'smooth' });
  };
  // stable ref so react does not detach/replay on every render; play once per element
  const vidStart = useCallback((el: HTMLVideoElement | null) => {
    if (!el || el.dataset.started) return;
    el.dataset.started = '1';
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  const tgHref = 'https://t.me/' + data.telegram;
  const ghHref = 'https://github.com/' + data.github;

  const services = data.services.map(sv => ({
    ...sv,
    title: ru && sv.titleRu ? sv.titleRu : sv.title,
    desc: ru && sv.descRu ? sv.descRu : sv.desc
  }));

  const items: Item[] = [
    ...data.works.map(w => {
      const amt = parseFloat(String(w.price).replace(/[^0-9.]/g, ''));
      const usd = /^\d/.test(String(w.price).trim()) ? '$' + w.price : w.price;
      const rubP = amt > 0 ? '≈' + (Math.round(amt * rub / 100) * 100).toLocaleString('ru-RU') + ' ₽' : '';
      const pics = w.imgs?.length ? w.imgs : w.img ? [w.img] : [];
      // video goes first, photos after it - all in one carousel
      const media: Media[] = [
        ...(w.video ? [{ kind: 'video' as const, src: w.video }] : []),
        ...pics.map(src => ({ kind: 'img' as const, src }))
      ];
      return {
        id: w.id, media,
        title: ru && w.titleRu ? w.titleRu : w.title, link: w.link,
        sub: ru && w.descRu ? w.descRu : w.desc, cat: w.date || '',
        metaDim: t.madeFor, metaMain: usd, metaSub: rubP, place: t.photoSoon,
        metaFont: rf('madeFor'), placeFont: rf('photoSoon'),
        changelog: w.changelog || []
      };
    }),
    ...data.projects.map(p => ({
      id: p.id, media: p.img ? [{ kind: 'img' as const, src: p.img }] : [],
      title: p.name, link: p.link, sub: '',
      cat: ru && p.roleRu ? p.roleRu : p.role,
      metaDim: '', metaMain: p.from + ' - ' + p.to, metaSub: '', place: t.team,
      placeFont: rf('team'),
      changelog: p.changelog || []
    }))
  ];
  itemsRef.current = items;

  const aboutText = ru && data.aboutRu ? data.aboutRu : data.about;
  const email = data.email || 'contact@leet-cheats.xyz';

  // tiny markdown: **bold** *italic* [text](url)
  const renderAbout = (src: string) => src.split('\n').map((ln, i) => {
    const out: React.ReactNode[] = [];
    let rest = ln, k = 0;
    const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/;
    while (rest) {
      const m = rest.match(re);
      if (!m || m.index === undefined) { out.push(rest); break; }
      if (m.index > 0) out.push(rest.slice(0, m.index));
      if (m[2]) out.push(<strong key={k++} style={{ color: 'var(--text)', fontWeight: 500 }}>{m[2]}</strong>);
      else if (m[4]) out.push(<em key={k++}>{m[4]}</em>);
      else out.push(<a key={k++} href={m[7]} target="_blank" className="ulink">{m[6]}</a>);
      rest = rest.slice(m.index + m[0].length);
    }
    return <div key={i} style={ln.trim() ? undefined : { height: '0.8em' }}>{out}</div>;
  });

  const sc = scrolled;
  // dark liquid glass once the pill is up; lighter blur on webkit (re-rasterizes per frame)
  const navBlur = sc ? (safari ? 'blur(13px) saturate(1.5)' : 'blur(22px) saturate(1.9)') : 'none';

  return (
    <div className="site-page" data-custom-cursor={dotOn ? 'true' : undefined} style={{ minHeight: '100vh', overflowX: 'clip', fontFamily: ru ? RU_FONT_STACK[data.fontRu || 'onest'] : undefined }}>
      {/* nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: sc ? '12px 16px 0' : '0px', transition: 'padding .6s ' + EASE, pointerEvents: 'none' }}>
        <div style={{
          pointerEvents: 'auto', position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          maxWidth: sc ? 790 : 1256, height: sc ? 52 : 64, padding: '0 20px',
          border: '1px solid ' + (sc ? 'var(--nav-border)' : 'transparent'),
          borderRadius: sc ? 9999 : 0, background: sc ? 'var(--nav-bg)' : 'var(--nav-bg-top)',
          backdropFilter: navBlur, WebkitBackdropFilter: navBlur,
          boxShadow: 'none',
          transition: `max-width .6s ${EASE}, height .6s ${EASE}, border-radius .6s ${EASE}, background .45s ease, border-color .45s ease, box-shadow .45s ease`
        }}>
          <div onClick={goTop} style={{ fontSize: 16, letterSpacing: '-0.01em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>AimworkSpace</div>
          <div className="nav-center" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 22, fontSize: 14 }}>
            <a href="#services" className="navlnk" style={rf('navS')}>{t.navS}</a>
            <a href="#projects" className="navlnk" style={rf('navP')}>{t.navP}</a>
            <a href="#contact" className="navlnk" style={rf('navC')}>{t.navC}</a>
          </div>
          {/* language picker, 1:1 from binware.su */}
          <div className="header_lang_item" ref={langRef} style={{ marginLeft: 'auto' }} onClick={() => setLangOpen(o => !o)}>
            <div className="header_lang_main">
              <img src={ru ? '/images/flags/russia.svg' : '/images/flags/usa.svg'} alt="" />
              <span>{ru ? 'Russian' : 'English'}</span>
            </div>
            <div className={'header_lang_button' + (langOpen ? ' active' : '')}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>{CHEV}</svg>
            </div>
            <div className={'lang_dropdown' + (langOpen ? ' active' : '')}>
              <div className={'lang_option' + (ru ? ' active' : '')} onClick={e => { e.stopPropagation(); setLang('ru'); }}>
                <img src="/images/flags/russia.svg" alt="" /><span>Russian</span>
              </div>
              <div className={'lang_option' + (!ru ? ' active' : '')} onClick={e => { e.stopPropagation(); setLang('en'); }}>
                <img src="/images/flags/usa.svg" alt="" /><span>English</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* hero (pinned, content slides over it) */}
      <div style={{ background: 'var(--hero-bg)', position: 'sticky', top: 0, zIndex: 1, overflow: 'hidden' }}>
        {/* webgl background, only on capable devices. plain image is the fallback */}
        {heroFxOn && <HeroFx bg={heroBg} preset={data.heroPreset} />}
        <div ref={heroRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '104px 28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transformOrigin: '50% 30%', willChange: reduced.current ? 'auto' : 'transform,opacity' }}>
          <h1 className="in0" style={{ margin: 0, fontSize: 'clamp(38px,5.2vw,60px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.011em', maxWidth: '17ch', textWrap: 'balance', ...rf('heroT') }}>{headlineOn ? <HeadlineReveal text={t.heroT} /> : t.heroT}</h1>
          <div className="in1" style={{ marginTop: 14, fontSize: 18, lineHeight: 1.4, color: 'var(--muted)', maxWidth: '46ch', textWrap: 'balance', ...rf('heroSub') }}>{t.heroSub}</div>
          <div className="in2" style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <a href={tgHref} target="_blank" className="pill" style={rf('start')}>{t.start} ↗</a>
            <a href="#projects" className="ghost" style={rf('view')}>{t.view} ↓</a>
          </div>
        </div>
        {showImage ? (
          <div className="in3" style={{ position: 'relative', zIndex: 1, overflow: 'hidden', marginTop: 8 }}>
            {/* avif is tiny but ios lockdown mode can not decode it. fall back to png on error */}
            <img ref={handsRef} src="/assets/hero-hands.avif" alt="" fetchPriority="high" onError={e => { const im = e.currentTarget; if (!im.dataset.fb) { im.dataset.fb = '1'; im.src = '/assets/hero-hands.png'; } }} style={{ width: '114%', marginLeft: '-7%', display: 'block', transform: 'scale(1.06)', willChange: reduced.current ? 'auto' : 'transform' }} />
          </div>
        ) : (
          // effect background (or still resolving): keep the hero tall, stay dark
          <div style={{ height: 'clamp(300px,48vh,560px)' }} />
        )}
      </div>

      {/* sheet that covers the hero */}
      <div style={{ position: 'relative', zIndex: 2, background: 'var(--bg)', borderRadius: '26px 26px 0 0', borderTop: '1px solid var(--line)', boxShadow: '0 -40px 80px rgba(0,0,0,.6)' }}>

        {/* services */}
        <div id="services" style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: 'var(--muted)' }}>{'// SERVICES'}</span>
            <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
          </div>
          <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em', ...rf('svcH') }}>{t.svcH}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid var(--line)', background: 'var(--line)' }}>
            {services.map(s => {
              const on = revealAll || revealed['svc-' + s.id] !== undefined;
              const sd = revealAll ? 0 : revealed['svc-' + s.id] ?? 0;
              const Icon = SERVICE_ICONS[s.id as keyof typeof SERVICE_ICONS] as (typeof SERVICE_ICONS)[keyof typeof SERVICE_ICONS] | undefined;
              const svc = (
              <div key={s.id} data-reveal={'svc-' + s.id} className="svc"
                onMouseMove={config.spotlight ? spotMove : undefined}
                onMouseLeave={config.spotlight ? spotLeave : undefined}
                style={{ opacity: on ? 1 : 0, transform: on ? undefined : 'translate3d(0,18px,0)', transitionDelay: on ? `0s, ${sd}ms, ${sd}ms` : '0s' }}>
                {config.spotlight && <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(280px circle at var(--mx,-300px) var(--my,-300px),var(--spot),transparent 65%)' }} />}
                {s.icon
                  ? <img src={s.icon} loading="lazy" alt="" style={{ width: 26, height: 26, objectFit: 'contain', display: 'block' }} />
                  : Icon
                    ? <span style={{ display: 'inline-flex', color: 'var(--icon)' }}><Icon size={26} aria-hidden /></span>
                    : <div style={{ fontSize: 22, lineHeight: 1.2, color: 'var(--icon)' }}>{s.glyph}</div>}
                <div style={{ marginTop: 20, fontSize: 14, letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.title}</div>
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', maxWidth: '36ch' }}>{s.desc}</div>
              </div>
              );
              // wrap the whole card so hovering it plays the icon once (no loop),
              // and it also plays once when the card first scrolls into view
              return Icon
                ? <AnimateIcon key={s.id} asChild animate={on && motionOk} animateOnHover={motionOk}>{svc}</AnimateIcon>
                : svc;
            })}
          </div>
        </div>

        {/* stack loop: smooth velocity, links, hover scale + pause, edge fade */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px 0' }}>
          <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '18px 0', overflow: 'hidden' }}>
            <LogoLoop logos={STACK_LOGOS} speed={38} direction="left" gap={44} logoHeight={20} hoverSpeed={0} scaleOnHover fadeOut fadeOutColor="#101010" ariaLabel="Tech stack" />
          </div>
        </div>

        {/* projects */}
        <div id="projects" style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: 'var(--muted)' }}>{'// PROJECTS'}</span>
            <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
            <span style={{ fontSize: 13, color: 'var(--faint)' }}>({items.length})</span>
          </div>
          <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em', ...rf('projH') }}>{t.projH}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 22 }}>
            {items.map(w => {
              const on = revealAll || revealed[w.id] !== undefined;
              const ci = (cardPic[w.id] || 0) % Math.max(w.media.length, 1);
              const hasCar = w.media.length > 1;
              const cur = w.media[ci];
              // the wrapper owns the reveal, so hover lift and tilt on the card never fight it
              return (
                <Reveal key={w.id} data-reveal={w.id} on={on} delay={revealAll ? 0 : revealed[w.id] ?? 0} soft={revealAll}>
                <a data-card={w.id} className="card"
                  onClick={() => openModal(w, ci)}
                  onMouseMove={config.spotlight || tiltOn ? cardMove : undefined}
                  onMouseLeave={config.spotlight || tiltOn ? cardLeave : undefined}
                  style={{ transformStyle: tiltOn ? 'preserve-3d' : undefined }}>
                  {config.spotlight && <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'radial-gradient(280px circle at var(--mx,-300px) var(--my,-300px),var(--spot),transparent 65%)' }} />}
                  {cur ? (
                    <span style={{ position: 'relative', display: 'block', aspectRatio: '16/10', borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
                      {/* all slides stacked, only the current is opaque, so changes crossfade smoothly */}
                      {w.media.map((m, mi) => (
                        <span key={mi} style={{ position: 'absolute', inset: 0, opacity: mi === ci ? 1 : 0, transition: motionOk ? 'opacity .7s var(--ease)' : 'none', pointerEvents: mi === ci ? 'auto' : 'none' }}>
                          {m.kind === 'video' ? (
                            <video data-cv={w.id} data-slide={mi} src={m.src} loop={!hasCar} onEnded={hasCar ? () => advanceCard(w.id) : undefined} muted playsInline preload="none" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }} />
                          ) : (
                            <img src={m.src} loading="lazy" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          )}
                        </span>
                      ))}
                      {hasCar && <>
                        <span className="carr" style={{ left: 8, zIndex: 3 }} onClick={e => { e.stopPropagation(); e.preventDefault(); setCardPic(c => ({ ...c, [w.id]: (ci - 1 + w.media.length) % w.media.length })); }}>‹</span>
                        <span className="carr" style={{ right: 8, zIndex: 3 }} onClick={e => { e.stopPropagation(); e.preventDefault(); setCardPic(c => ({ ...c, [w.id]: (ci + 1) % w.media.length })); }}>›</span>
                        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 3 }}>
                          {w.media.map((_, di) => <span key={di} style={{ width: 6, height: 6, borderRadius: 99, background: di === ci ? '#f3f3f3' : 'rgba(255,255,255,.35)', transform: di === ci ? 'scale(1.25)' : 'scale(1)', transition: 'background .25s ease, transform .25s var(--ease)' }} />)}
                        </span>
                      </>}
                    </span>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(45deg,var(--bg) 0px,var(--bg) 9px,var(--card-2) 9px,var(--card-2) 18px)', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 12, letterSpacing: '.14em', color: 'var(--faint)', ...w.placeFont }}>{w.place}</span>
                    </div>
                  )}
                  <div style={{ padding: '16px 18px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 17, letterSpacing: '-0.005em', minWidth: 0 }}>{w.title}</span>
                      {!!w.link && <span style={{ fontSize: 12, color: 'var(--muted)' }}>↗</span>}
                      <span style={{ marginLeft: 'auto', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 13 }}><span style={{ color: 'var(--muted)', ...w.metaFont }}>{w.metaDim}</span><span>{w.metaMain}</span></span>
                        {!!w.metaSub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{w.metaSub}</span>}
                      </span>
                    </div>
                    {!!w.sub && <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)' }}>{w.sub}</div>}
                    {!!w.cat && <div style={{ marginTop: 6, fontSize: 12, letterSpacing: '.04em', color: 'var(--muted)' }}>{w.cat}</div>}
                  </div>
                </a>
                </Reveal>
              );
            })}
          </div>

          {/* featured in */}
          <div style={{ marginTop: 70, borderTop: '1px solid var(--line)', paddingTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: 'var(--muted)', textAlign: 'center', ...rf('feat') }}>{t.feat}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="https://leet-cheats.xyz" target="_blank" className="partner" style={{ display: 'block' }}>
                <img src="/assets/leet-cheats.svg" alt="leet-cheats.xyz" style={{ height: 42, display: 'block' }} />
              </a>
              <a href="https://binware.su" target="_blank" className="partner" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <img src="/assets/binware.svg" alt="" style={{ width: 44, height: 44, display: 'block' }} />
                <span style={{ fontSize: 21, fontWeight: 500, letterSpacing: '-0.01em' }}>binware.su</span>
              </a>
            </div>
          </div>
        </div>

        {/* about */}
        {config.showAbout && (
          <div style={{ maxWidth: 620, margin: '0 auto', padding: '120px 28px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 23, ...rf('aboutH') }}>{t.aboutH}</div>
            <div style={{ marginTop: 16, fontSize: 16, lineHeight: 1.65, color: 'var(--muted)' }}>{renderAbout(aboutText)}</div>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--muted)', fontSize: 14, ...rf('based') }}>
                <span style={{ display: 'inline-block', width: 21, height: 15, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--line-2)' }}>
                  <span style={{ display: 'block', height: 5, background: '#000' }} />
                  <span style={{ display: 'block', height: 5, background: '#dd0000' }} />
                  <span style={{ display: 'block', height: 5, background: '#ffcc00' }} />
                </span>
                {t.based}
              </span>
            </div>
          </div>
        )}

        {/* faq */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '120px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: 'var(--muted)' }}>{'// FAQ'}</span>
            <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
          </div>
          <h2 style={{ margin: '0 0 26px', fontSize: 'clamp(28px,3vw,38px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em', ...rf('faqH') }}>{t.faqH}</h2>
          {data.faq.map(q => {
            const open = faqOpen === q.id;
            return (
              <div key={q.id} style={{ borderTop: '1px solid var(--line)' }}>
                <div className="faqrow" style={{ cursor: 'pointer' }} onClick={() => setFaqOpen(open ? null : q.id)}>
                  <span style={{ fontSize: 16, flex: 1 }}>{ru && q.qRu ? q.qRu : q.q}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .35s ' + EASE }}>▾</span>
                </div>
                <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows .45s ' + EASE }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 4px 22px', fontSize: 14.5, lineHeight: 1.65, color: 'var(--muted)', maxWidth: '60ch' }}>{ru && q.aRu ? q.aRu : q.a}</div>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid var(--line)' }} />
        </div>

        {/* contact */}
        <div id="contact" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 28px 110px' }}>
          <div style={{ position: 'relative', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '80px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {(['left', 'right'] as const).map(sx => (['top', 'bottom'] as const).map(sy => (
              <span key={sx + sy} style={{ position: 'absolute', [sx]: -3, [sy]: sy === 'top' ? -9 : -8, color: 'var(--faint)', fontSize: 13, lineHeight: 1 }}>+</span>
            )))}
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em', maxWidth: '22ch', textWrap: 'balance', ...rf('ctH') }}>{t.ctH}</h2>
            <div style={{ marginTop: 10, fontSize: 16, color: 'var(--muted)', ...rf('ctSub') }}>{t.ctSub}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <a href={tgHref} target="_blank" className="pill">
                <img src="https://cdn.simpleicons.org/telegram/000000" alt="" style={{ width: 15, height: 15, display: 'block' }} />Telegram
              </a>
              <a href={ghHref} target="_blank" className="ghost">
                <img src="https://cdn.simpleicons.org/github/f3f3f3" alt="" style={{ width: 15, height: 15, display: 'block' }} />GitHub
              </a>
            </div>
            <div style={{ marginTop: 22, fontSize: 14, color: 'var(--muted)', ...rf('dm') }}>
              {t.dm} -&gt; <a href={tgHref} target="_blank" className="ulink">@{data.telegram}</a> · <span className="ulink" title="click to copy" style={{ textDecorationStyle: 'dotted', cursor: 'pointer' }} onClick={() => { navigator.clipboard?.writeText(email).catch(() => {}); showToast(t.copied); }}>{email}</span>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ borderTop: '1px solid var(--line)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14 }}>AimworkSpace</span>
            <span style={{ fontSize: 12, color: 'var(--faint)' }}>© 2026</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontSize: 13, alignItems: 'center' }}>
              <a href={tgHref} target="_blank" className="ftr"><img src="https://cdn.simpleicons.org/telegram/9c9c9c" alt="" style={{ width: 12, height: 12 }} />telegram</a>
              <a href={ghHref} target="_blank" className="ftr"><img src="https://cdn.simpleicons.org/github/9c9c9c" alt="" style={{ width: 12, height: 12 }} />github</a>
              <a href={'mailto:' + email} className="ftr">email</a>
              {config.adminLink && <a href="/admin" className="ftr" style={{ color: 'var(--faint)' }}>admin</a>}
            </span>
          </div>
        </div>
      </div>

      {/* modal */}
      {modal && (() => {
        const rm = reduced.current;
        const ovBlur = safari ? 'blur(5px)' : 'blur(10px)';
        return (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.66)', backdropFilter: ovBlur, WebkitBackdropFilter: ovBlur, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, opacity: closing ? 0 : undefined, transition: 'opacity .18s ease', animation: closing || rm ? 'none' : 'zxfade .3s ease both' }}>
          <div onClick={e => e.stopPropagation()} data-lenis-prevent style={{ width: 'min(660px,94vw)', maxHeight: '86vh', overflow: 'auto', background: 'var(--card)', border: '1px solid var(--line-2)', borderRadius: 14, opacity: closing ? 0 : undefined, transform: closing && !rm ? 'translateY(8px) scale(.98)' : undefined, transition: `opacity .18s ease, transform .18s ${EASE}`, animation: closing || rm ? 'none' : `zxmodal .45s ${EASE} both` }}>
            {modal.media.length > 0 && (() => {
              const mi = Math.min(pic, modal.media.length - 1);
              const cur = modal.media[mi];
              const round = '13px 13px 0 0';
              return (
              <div style={{ position: 'relative', borderBottom: '1px solid var(--line)' }}>
                {cur.kind === 'video' ? (
                  <video key={mi} ref={vidStart} className="imgfade" src={cur.src} loop muted playsInline preload="none" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', borderRadius: round, background: '#000' }} />
                ) : (
                  <img key={mi} className="imgfade" src={cur.src} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', borderRadius: round }} />
                )}
                {modal.media.length > 1 && <>
                  <span className="marr" style={{ left: 10, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setPic((mi - 1 + modal.media.length) % modal.media.length); }}>‹</span>
                  <span className="marr" style={{ right: 10, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setPic((mi + 1) % modal.media.length); }}>›</span>
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {modal.media.map((_, i) => (
                      <span key={i} onClick={e => { e.stopPropagation(); setPic(i); }} style={{ width: 7, height: 7, borderRadius: 99, cursor: 'pointer', background: i === mi ? '#f3f3f3' : 'rgba(255,255,255,.35)', transform: i === mi ? 'scale(1.25)' : 'scale(1)', transition: 'background .2s ease, transform .2s ease' }} />
                    ))}
                  </span>
                </>}
              </div>
              );
            })()}
            <div style={{ padding: '26px 28px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span style={{ fontSize: 24, letterSpacing: '-0.01em' }}>{modal.title}</span>
                <span style={{ marginLeft: 'auto', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 14 }}><span style={{ color: 'var(--muted)', ...modal.metaFont }}>{modal.metaDim}</span><span>{modal.metaMain}</span></span>
                  {!!modal.metaSub && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{modal.metaSub}</span>}
                </span>
              </div>
              {!!modal.cat && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>{modal.cat}</div>}
              {!!modal.sub && <div style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', whiteSpace: 'pre-line' }}>{modal.sub}</div>}
              {modal.changelog.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 12, letterSpacing: '.12em', color: 'var(--muted)', ...rf('chlog') }}>{'// ' + t.chlog}</span>
                    <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
                  </div>
                  {modal.changelog.map(en => (
                    <div key={en.id} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--line-3)' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', flex: 'none', letterSpacing: '.04em' }}>{en.date}</span>
                      <span style={{ fontSize: 14, lineHeight: 1.55 }}>{ru && en.textRu ? en.textRu : en.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                {!!modal.link && <a href={modal.link} target="_blank" className="pill" style={{ padding: '11px 22px', ...rf('open') }}>{t.open} ↗</a>}
                <span className="ghost" style={{ padding: '11px 22px', cursor: 'pointer', userSelect: 'none', ...rf('close') }} onClick={closeModal}>{t.close}</span>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* grain: blend mode is heavy in safari, plain low opacity there */}
      {config.grain && noise && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 400, backgroundImage: `url(${noise})`, backgroundRepeat: 'repeat', transform: 'translateZ(0)', ...(safari ? { opacity: .16 } : { opacity: .5, mixBlendMode: 'overlay' as const }) }} />
      )}

      {/* toast: sits above the page-bottom gradual blur (~1100) so it stays crisp */}
      <div style={{ position: 'fixed', left: 0, bottom: 34, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 2000 }}>
        <span style={{ background: 'var(--inv-bg)', color: 'var(--inv-text)', borderRadius: 9999, padding: '9px 18px', fontSize: 13, opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(14px)', transition: `opacity .35s ease, transform .4s ${EASE}`, ...rf('copied') }}>{toast || ' '}</span>
      </div>

      {/* cursor dot: safari uses the native cursor to avoid frame lag */}
      {dotOn && <div ref={cursorRef} style={{ position: 'fixed', left: 0, top: 0, width: 9, height: 9, borderRadius: 99, background: '#f3f3f3', pointerEvents: 'none', zIndex: 9999, opacity: 0, transform: 'translate3d(-100px,-100px,0)', willChange: 'transform', transition: 'opacity .25s ease', mixBlendMode: 'difference' }} />}
      {/* pixel trail cursor (real reactbits component, opt in via admin) */}
      {trailOn && <PixelTrailCursor />}
      {/* target cursor: 4 corners lock onto links, buttons and cards */}
      {targetOn && <TargetCursorFx />}

      {/* cinematic gradual blur at the bottom edge of the viewport */}
      {gradualOn && <GradualBlur target="page" position="bottom" height="2rem" strength={0.7} divCount={4} curve="bezier" />}
    </div>
  );
}
