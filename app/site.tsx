'use client';
// main site page, ported from the design prototype

import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { Bot } from '@/components/animate-ui/icons/bot';
import { Layers } from '@/components/animate-ui/icons/layers';
import { Cog } from '@/components/animate-ui/icons/cog';
import { Binary } from '@/components/animate-ui/icons/binary';
import { loadRemote, SiteData, LogEntry } from '@/lib/data';
import { T, Lang, type Dict } from '@/lib/i18n';
import { config } from '@/lib/config';
import { webglSupported } from '@/lib/fx';
import PixelTrailCursor from '@/components/fx/PixelTrailCursor';
import TargetCursorFx from '@/components/fx/TargetCursorFx';
import { Reveal } from '@/components/animate-ui/primitives/effects/reveal';
import GradualBlur from '@/components/GradualBlur';
import LogoLoop from '@/components/LogoLoop';
import MediaCarousel, { type Media } from '@/components/MediaCarousel';
import {
  PythonIcon, RustIcon, CppIcon, TypeScriptIcon, JavaScriptIcon, ReactIcon, ViteIcon, NextIcon,
  GitIcon, ClaudeIcon, PostgresIcon, RedisIcon, TelegramIcon, GithubIcon, type BrandIconProps
} from '@/components/BrandIcons';
interface Item {
  id: string; media: Media[];
  title: string; link: string; sub: string; cat: string;
  // dates for a team project, empty for own work
  meta: string; place: string;
  // per string ru font, resolved from the i18n key that filled the field
  placeFont?: React.CSSProperties;
  changelog: LogEntry[];
}

const EASE = 'cubic-bezier(.22,1,.36,1)';
// sites, bots, automation, custom code
const SERVICE_ICONS = { s1: Layers, s2: Bot, s3: Cog, s4: Binary } as const;
// [brand icon, label, official link]
const STACK: [React.ComponentType<BrandIconProps>, string, string][] = [
  [PythonIcon, 'Python', 'https://www.python.org'], [RustIcon, 'Rust', 'https://www.rust-lang.org'],
  [CppIcon, 'C++', 'https://isocpp.org'], [TypeScriptIcon, 'TypeScript', 'https://www.typescriptlang.org'],
  [JavaScriptIcon, 'JavaScript', 'https://developer.mozilla.org/docs/Web/JavaScript'], [ReactIcon, 'React', 'https://react.dev'],
  [ViteIcon, 'Vite', 'https://vite.dev'], [NextIcon, 'Next.js', 'https://nextjs.org'],
  [GitIcon, 'Git', 'https://git-scm.com'], [ClaudeIcon, 'Agents / Claude', 'https://www.anthropic.com/claude'],
  [PostgresIcon, 'SQL', 'https://www.postgresql.org'], [RedisIcon, 'Redis', 'https://redis.io']
];
// logo-loop items: icon + label, each linking to the tech's site
const STACK_LOGOS = STACK.map(([Icon, label, href]) => ({
  node: (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <Icon size={18} color="#9c9c9c" style={{ opacity: .75 }} />
      <span style={{ fontSize: 14, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  ),
  title: label,
  ariaLabel: label,
  href
}));

// chevron for the language dropdown (inherits the svg fill)
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
  // media that failed to load (a dead link, an expired cdn url). the slide is
  // dropped so the card falls back to the next photo instead of a black box
  const [badMedia, setBadMedia] = useState<Record<string, true>>({});
  const [noise, setNoise] = useState('');
  const [closing, setClosing] = useState(false);
  const [safari, setSafari] = useState(false);
  const [customCursor, setCustomCursor] = useState(false);
  const [motionOk, setMotionOk] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  // effect gates set after mount: fine pointer + motion on, and real webgl support
  const [fineOk, setFineOk] = useState(false);
  const [webglOk, setWebglOk] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // element that opened the modal, focus goes back to it on close
  const lastFocus = useRef<HTMLElement | null>(null);
  const modalOpen = useRef(false);
  const closeT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fine = useRef(false);
  const reduced = useRef(false);

  // which effects are on. the pixel trail is webgl, so it needs a fine pointer
  // with motion allowed and real webgl support
  const cursorStyle = data.cursorStyle || 'dot';
  const dotOn = cursorStyle === 'dot' && customCursor;
  const trailOn = cursorStyle === 'pixel-trail' && fineOk && webglOk;
  const targetOn = cursorStyle === 'target' && fineOk;
  // whole blocks the admin can hide. the nav link goes with its section
  const servicesOn = data.showServices !== false;
  const stackOn = data.showStack !== false;
  const gradualOn = data.fxGradualBlur !== false;
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
  }, []);

  // the switch is client side, so keep <html lang> in step for screen readers
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // close the language menu on an outside click, or on escape with focus back
  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => { if (!langRef.current?.contains(e.target as Node)) setLangOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setLangOpen(false);
      langBtnRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  // modal open: freeze scroll under it and move focus into the dialog.
  // preventScroll keeps the panel at the top, where it opened
  useEffect(() => {
    modalOpen.current = !!modal;
    if (modal) { lenisRef.current?.stop(); document.body.style.overflow = 'hidden'; closeBtnRef.current?.focus({ preventScroll: true }); }
    else { lenisRef.current?.start(); document.body.style.overflow = ''; }
  }, [modal]);

  // language, and re-pull content on focus to pick up admin edits
  useEffect(() => {
    // old visitors only have localStorage: honor it once and set the cookie
    const saved = localStorage.getItem('zx_lang') as Lang | null;
    if (saved && saved !== initialLang) {
      setLangState(saved);
      document.cookie = 'zx_lang=' + saved + ';path=/;max-age=31536000;samesite=lax';
    }
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

  // scroll: nav bar folds into the pill
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // lenis smooth scroll (fine pointers, full motion only)
  useEffect(() => {
    if (!window.matchMedia('(pointer:fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.09, autoRaf: true });
    lenisRef.current = lenis;
    return () => {
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

  // close with a short exit animation, then unmount and give focus back
  const closeModal = useCallback(() => {
    if (!modalOpen.current) return;
    setClosing(true);
    clearTimeout(closeT.current);
    closeT.current = setTimeout(() => {
      setModal(null);
      setClosing(false);
      const back = lastFocus.current;
      if (back?.isConnected) back.focus({ preventScroll: true });
    }, 250);
  }, []);

  const openModal = useCallback((w: Item, ci: number) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    clearTimeout(closeT.current);
    setClosing(false);
    setModal(w);
    setPic(ci);
  }, []);

  // esc closes the modal, and tab stays inside it. the listener sits on the
  // window, not on the dialog: clicking plain text inside moves focus to the
  // body, and a handler on the dialog would never see the key after that
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeModal(); return; }
      const box = dialogRef.current;
      if (e.key !== 'Tab' || !box) return;
      const els = Array.from(box.querySelectorAll<HTMLElement>('a[href],button,[tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      // focus left the dialog, or sits on the edge: pull it back inside
      if (!box.contains(document.activeElement) || document.activeElement === (e.shiftKey ? first : last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  const setLang = (l: Lang) => {
    localStorage.setItem('zx_lang', l);
    // cookie so the server paints the right language on the next visit
    document.cookie = 'zx_lang=' + l + ';path=/;max-age=31536000;samesite=lax';
    setLangState(l);
    setLangOpen(false);
    // the menu is gone, so focus goes back to the trigger
    langBtnRef.current?.focus();
  };
  // admin can override any interface string per language; empty falls back to the default
  const t = { ...T[lang], ...(data.i18n?.[lang] ?? {}) } as (typeof T)[Lang];
  const ru = lang === 'ru';
  // per string font override for ru, picked in the admin interface-text page
  const rf = (k: keyof Dict): React.CSSProperties | undefined => {
    const f = ru ? data.i18nFontRu?.[k] : undefined;
    return f ? { fontFamily: RU_FONT_STACK[f] } : undefined;
  };

  const markBad = useCallback((src: string) => {
    setBadMedia(b => (b[src] ? b : { ...b, [src]: true }));
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
  const tgHref = 'https://t.me/' + data.telegram;
  const ghHref = 'https://github.com/' + data.github;

  // one of the two links that close the page. the row is drawn twice: the
  // second copy is white with black text and clipped, so a hover wipes it in
  const bigLink = (href: string, label: string, handle: string, Icon: React.ComponentType<BrandIconProps>) => {
    const row = (color: string) => (
      <span className="blrow">
        <span className="blword"><Icon size={20} color={color} />{label}</span>
        <span className="blmeta">{handle}<span className="blarr" aria-hidden>↗</span></span>
      </span>
    );
    return (
      <a key={label} className="blink" href={href} target="_blank" rel="noopener noreferrer">
        {row('#f3f3f3')}
        <span className="blfill" aria-hidden>{row('#101010')}</span>
      </a>
    );
  };

  const services = data.services.map(sv => ({
    ...sv,
    title: ru && sv.titleRu ? sv.titleRu : sv.title,
    desc: ru && sv.descRu ? sv.descRu : sv.desc
  }));

  const items: Item[] = [
    ...data.works.map(w => {
      const pics = w.imgs?.length ? w.imgs : w.img ? [w.img] : [];
      // video goes first, photos after it - all in one carousel
      const media: Media[] = [
        ...(w.video ? [{ kind: 'video' as const, src: w.video }] : []),
        ...pics.map(src => ({ kind: 'img' as const, src }))
      ].filter(m => !badMedia[m.src]);
      return {
        id: w.id, media,
        title: ru && w.titleRu ? w.titleRu : w.title, link: w.link,
        sub: ru && w.descRu ? w.descRu : w.desc, cat: w.date || '',
        meta: '', place: t.photoSoon, placeFont: rf('photoSoon'),
        changelog: w.changelog || []
      };
    }),
    ...data.projects.map(p => ({
      id: p.id, media: p.img && !badMedia[p.img] ? [{ kind: 'img' as const, src: p.img }] : [],
      title: p.name, link: p.link, sub: '',
      cat: ru && p.roleRu ? p.roleRu : p.role,
      meta: p.from + ' - ' + p.to, place: t.team,
      placeFont: rf('team'),
      changelog: p.changelog || []
    }))
  ];

  // only real web links become an <a>, so admin text can not add a script url
  const safeUrl = (u: string) => /^(https?:|mailto:)/i.test(u.trim());

  // tiny markdown inside one line: **bold** *italic* [text](url)
  const inline = (ln: string) => {
    const out: React.ReactNode[] = [];
    let rest = ln, k = 0;
    const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/;
    while (rest) {
      const m = rest.match(re);
      if (!m || m.index === undefined) { out.push(rest); break; }
      if (m.index > 0) out.push(rest.slice(0, m.index));
      if (m[2]) out.push(<strong key={k++} style={{ color: 'var(--text)', fontWeight: 500 }}>{m[2]}</strong>);
      else if (m[4]) out.push(<em key={k++}>{m[4]}</em>);
      // a bad scheme stays raw text, so the author can see it did not work
      else if (safeUrl(m[7])) out.push(<a key={k++} href={m[7]} target="_blank" rel="noopener noreferrer" className="ulink">{m[6]}</a>);
      else out.push(m[0]);
      rest = rest.slice(m.index + m[0].length);
    }
    return out;
  };
  // one div per line, an empty line is a spacer
  const lines = (arr: string[]) => arr.map((ln, i) => (
    <div key={i} style={ln.trim() ? undefined : { height: '0.8em' }}>{inline(ln)}</div>
  ));
  const aboutLines = (ru && data.aboutRu ? data.aboutRu : data.about).split('\n');

  const sc = scrolled;
  // dark liquid glass once the pill is up; lighter blur on webkit (re-rasterizes per frame)
  const navBlur = sc ? (safari ? 'blur(13px) saturate(1.5)' : 'blur(22px) saturate(1.9)') : 'none';

  return (
    <div className="site-page" data-custom-cursor={dotOn ? 'true' : undefined} style={{ minHeight: '100vh', overflowX: 'clip', fontFamily: ru ? RU_FONT_STACK[data.fontRu || 'onest'] : undefined }}>
      {/* nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: sc ? '12px 16px 0' : '0px', transition: 'padding .45s ' + EASE, pointerEvents: 'none' }}>
        <div className="navbar" data-sc={sc ? '1' : '0'} style={{ ['--nav-blur' as string]: navBlur }}>
          <button type="button" className="bare nav-mark" aria-label="back to top" onClick={goTop}>AimworkSpace</button>
          {/* language picker, 1:1 from binware.su. the menu is a sibling of the
              trigger, and inert while closed so tab skips the hidden options */}
          <div className="header_lang_item" ref={langRef} style={{ marginLeft: 'auto' }}>
            <button type="button" ref={langBtnRef} className="bare lang_trigger" aria-haspopup="menu" aria-expanded={langOpen} onClick={() => setLangOpen(o => !o)}>
              <span className="header_lang_main">
                <img src={ru ? '/images/flags/russia.svg' : '/images/flags/usa.svg'} alt="" />
                <span>{ru ? 'Russian' : 'English'}</span>
              </span>
              <span className={'header_lang_button' + (langOpen ? ' active' : '')}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>{CHEV}</svg>
              </span>
            </button>
            <div className={'lang_dropdown' + (langOpen ? ' active' : '')} role="menu" inert={!langOpen}>
              <button type="button" role="menuitemradio" aria-checked={ru} className={'bare lang_option' + (ru ? ' active' : '')} onClick={() => setLang('ru')}>
                <img src="/images/flags/russia.svg" alt="" /><span>Russian</span>
              </button>
              <button type="button" role="menuitemradio" aria-checked={!ru} className={'bare lang_option' + (!ru ? ' active' : '')} onClick={() => setLang('en')}>
                <img src="/images/flags/usa.svg" alt="" /><span>English</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* about: it opens the page now */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: 'clamp(120px,16vh,176px) 28px 0', textAlign: 'center' }}>
        <h1 className="in0" style={{ margin: 0, fontSize: 23, fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.005em', ...rf('aboutH') }}>{t.aboutH}</h1>
        <div className="in1" style={{ marginTop: 16, fontSize: 16, lineHeight: 1.65, color: 'var(--muted)' }}>{lines(aboutLines)}</div>
        {/* gif/photo under the text, framed like the card media. size and
            aspect come from the admin; 'auto' keeps the natural ratio */}
        {!!data.aboutImg && (
          <div className="in2" style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
            <img src={data.aboutImg} alt="" style={{
              width: `min(${data.aboutImgW || 252}px, 78vw)`,
              aspectRatio: (data.aboutImgAspect || '16/9') === 'auto' ? undefined : (data.aboutImgAspect || '16/9'),
              objectFit: (data.aboutImgAspect || '16/9') === 'auto' ? undefined : 'cover',
              display: 'block', borderRadius: 14, border: '1px solid var(--line)'
            }} />
          </div>
        )}
        {data.aboutShowBased !== false && (
          <div className="in3" style={{ marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--muted)', fontSize: 14, ...rf('based') }}>
              {data.aboutShowFlag !== false && (
                <span style={{ display: 'inline-block', width: 21, height: 15, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--line-2)' }}>
                  <span style={{ display: 'block', height: 5, background: '#000' }} />
                  <span style={{ display: 'block', height: 5, background: '#dd0000' }} />
                  <span style={{ display: 'block', height: 5, background: '#ffcc00' }} />
                </span>
              )}
              {t.based}
            </span>
          </div>
        )}
      </div>

      {/* projects i was part of: just the logos, right under the about */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(58px,8vh,88px) 28px 0' }}>
        <div className="in3" style={{ borderTop: '1px solid var(--line)', paddingTop: 40, display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="https://leet-cheats.xyz" target="_blank" rel="noopener noreferrer" className="partner" style={{ display: 'block' }}>
            <img src="/assets/leet-cheats.svg" alt="leet-cheats.xyz" style={{ height: 42, display: 'block' }} />
          </a>
          <a href="https://binware.su" target="_blank" rel="noopener noreferrer" className="partner" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img src="/assets/binware.svg" alt="" style={{ width: 44, height: 44, display: 'block' }} />
            <span style={{ fontSize: 21, fontWeight: 500, letterSpacing: '-0.01em' }}>binware.su</span>
          </a>
        </div>
      </div>

      {/* services, hidden from the admin with one switch */}
      {servicesOn && (
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
              {/* case comes from the admin, not from css: type "Сайты" and it
                  stays that way. tracking is softer than caps would need */}
              <div style={{ marginTop: 20, fontSize: 14, letterSpacing: '.06em' }}>{s.title}</div>
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
      )}

      {/* stack loop: smooth velocity, links, hover scale + pause, edge fade.
          the top padding covers for the services block when it is hidden */}
      {stackOn && (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: (servicesOn ? '64px' : '110px') + ' 28px 0' }}>
        <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '18px 0', overflow: 'hidden' }}>
          <LogoLoop logos={STACK_LOGOS} speed={38} direction="left" gap={44} logoHeight={20} hoverSpeed={0} scaleOnHover fadeOut fadeOutColor="#101010" ariaLabel="Tech stack" />
        </div>
      </div>
      )}

      {/* work */}
      <div id="projects" style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 28px 0' }}>
        {/* just a rule and the count, the heading below says the rest */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
          <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
          <span style={{ fontSize: 13, color: 'var(--faint)' }}>({items.length})</span>
        </div>
        <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em', ...rf('projH') }}>{t.projH}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 22 }}>
          {items.map(w => {
            const on = revealAll || revealed[w.id] !== undefined;
            const ci = (cardPic[w.id] || 0) % Math.max(w.media.length, 1);
            const cur = w.media[ci];
            // the wrapper owns the reveal, so hover lift and tilt on the card never fight it
            return (
              <Reveal key={w.id} data-reveal={w.id} on={on} delay={revealAll ? 0 : revealed[w.id] ?? 0} soft={revealAll}>
              <div data-card={w.id} className="card"
                onClick={() => openModal(w, ci)}
                onMouseMove={config.spotlight || tiltOn ? cardMove : undefined}
                onMouseLeave={config.spotlight || tiltOn ? cardLeave : undefined}
                style={{ display: 'flex', flexDirection: 'column', transformStyle: tiltOn ? 'preserve-3d' : undefined }}>
                {/* hit area for the keyboard: tab lands here, enter or space
                    opens the modal, and the click bubbles to the card */}
                <button type="button" className="card-hit" aria-haspopup="dialog" aria-label={w.title} />
                {config.spotlight && <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'radial-gradient(280px circle at var(--mx,-300px) var(--my,-300px),var(--spot),transparent 65%)' }} />}
                {cur ? (
                  <span style={{ position: 'relative', display: 'block', flexShrink: 0, aspectRatio: '16/10', borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
                    {/* shadcn/embla carousel: crossfade slides, swipe on touch */}
                    <MediaCarousel media={w.media} mode="card" motionOk={motionOk} onBroken={markBad} onIndex={i => setCardPic(c => (c[w.id] === i ? c : { ...c, [w.id]: i }))} />
                  </span>
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(45deg,var(--bg) 0px,var(--bg) 9px,var(--card-2) 9px,var(--card-2) 18px)', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 12, letterSpacing: '.14em', color: 'var(--faint)', ...w.placeFont }}>{w.place}</span>
                  </div>
                )}
                {/* fills the rest of the card, so the date can sit at the
                    bottom edge and line up across a row of cards */}
                <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 17, letterSpacing: '-0.005em', minWidth: 0 }}>{w.title}</span>
                    {!!w.link && <span style={{ fontSize: 12, color: 'var(--muted)' }}>↗</span>}
                    {/* dates of a team project. own work carries no meta here */}
                    {!!w.meta && <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{w.meta}</span>}
                  </div>
                  {!!w.sub && <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)' }}>{w.sub}</div>}
                  {!!w.cat && <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 12, letterSpacing: '.04em', color: 'var(--muted)' }}>{w.cat}</div>}
                </div>
              </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* the two links that close the page */}
      <div id="contact" style={{ maxWidth: 1200, margin: '0 auto', padding: '104px 28px 96px' }}>
        {bigLink(tgHref, 'telegram', '@' + data.telegram, TelegramIcon)}
        {bigLink(ghHref, 'github', data.github, GithubIcon)}
      </div>

      {/* modal */}
      {modal && (() => {
        const rm = reduced.current;
        const ovBlur = safari ? 'blur(5px)' : 'blur(10px)';
        return (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.66)', backdropFilter: ovBlur, WebkitBackdropFilter: ovBlur, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: closing ? 'zxfadeout .22s ease both' : rm ? 'none' : 'zxfade .3s ease both' }}>
          {/* exit mirrors the entry path: drops back down, shrinks and blurs away, faster than it came in */}
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="zx-modal-title" tabIndex={-1} onClick={e => e.stopPropagation()} data-lenis-prevent style={{ width: 'min(660px,94vw)', maxHeight: '86vh', overflow: 'auto', background: 'var(--card)', border: '1px solid var(--line-2)', borderRadius: 14, animation: closing ? (rm ? 'zxfadeout .2s ease both' : `zxmodalout .24s ${EASE} both`) : rm ? 'none' : `zxmodal .45s ${EASE} both` }}>
            {modal.media.length > 0 && (
              <div style={{ position: 'relative', borderBottom: '1px solid var(--line)' }}>
                <MediaCarousel media={modal.media} mode="modal" motionOk={motionOk} onBroken={markBad} startIndex={Math.min(pic, modal.media.length - 1)} radius="13px 13px 0 0" />
              </div>
            )}
            <div style={{ padding: '26px 28px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span id="zx-modal-title" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>{modal.title}</span>
                {!!modal.meta && <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{modal.meta}</span>}
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
                {!!modal.link && safeUrl(modal.link) && <a href={modal.link} target="_blank" rel="noopener noreferrer" className="pill" style={{ padding: '11px 22px', ...rf('open') }}>{t.open} ↗</a>}
                <button type="button" ref={closeBtnRef} className="bare ghost" style={{ padding: '11px 22px', userSelect: 'none', ...rf('close') }} onClick={closeModal}>{t.close}</button>
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
