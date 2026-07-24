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
import { T, Lang } from '@/lib/i18n';
import { config } from '@/lib/config';

// one slide of a card carousel: video or photo
interface Media { kind: 'video' | 'img'; src: string }
interface Item {
  id: string; media: Media[];
  title: string; link: string; sub: string; cat: string;
  metaDim: string; metaMain: string; metaSub: string; place: string;
  changelog: LogEntry[];
}

const EASE = 'cubic-bezier(.22,1,.36,1)';
// sites, bots, automation, custom code
const SERVICE_ICONS = { s1: Layers, s2: Bot, s3: Cog, s4: Binary } as const;
const STACK: [string, string][] = [
  ['python', 'Python'], ['rust', 'Rust'], ['cplusplus', 'C++'], ['typescript', 'TypeScript'],
  ['javascript', 'JavaScript'], ['react', 'React'], ['vite', 'Vite'], ['nextdotjs', 'Next.js'],
  ['git', 'Git'], ['claude', 'Agents / Claude'], ['postgresql', 'SQL'], ['redis', 'Redis']
];

// header switch icons (paths inherit the svg fill)
const SUN = (<>
  <path d="M7.00011 11.0833C7.14294 11.0834 7.28074 11.136 7.38748 11.2309C7.49421 11.3258 7.56272 11.4565 7.57945 11.5983L7.58344 11.6667V12.25C7.58328 12.3987 7.526 12.5418 7.42394 12.6499C7.32191 12.7579 7.18259 12.8229 7.03429 12.8316C6.88592 12.8403 6.73984 12.792 6.62584 12.6966C6.51185 12.6012 6.43835 12.466 6.42076 12.3184L6.41677 12.25V11.6667C6.41677 11.512 6.47828 11.3636 6.58767 11.2542C6.69706 11.1449 6.84543 11.0833 7.00011 11.0833Z" />
  <path d="M3.67499 9.74178C3.82966 9.74179 3.97805 9.80333 4.08743 9.91268C4.18782 10.0131 4.24828 10.1469 4.25719 10.2887C4.26604 10.4303 4.22287 10.5707 4.13585 10.6829L4.08743 10.7375L3.67898 11.146C3.57409 11.2505 3.43331 11.3112 3.28535 11.3158C3.13721 11.3203 2.99262 11.2679 2.88146 11.1699C2.77035 11.0719 2.70068 10.9352 2.68663 10.7877C2.67264 10.6402 2.71512 10.493 2.80569 10.3758L2.85411 10.3211L3.26256 9.91268C3.37195 9.80332 3.52031 9.74178 3.67499 9.74178Z" />
  <path d="M10.2164 9.75147C10.3562 9.72508 10.5009 9.75049 10.6232 9.82324L10.6824 9.86426L10.7377 9.91268L11.1455 10.3211C11.2501 10.4261 11.3113 10.5667 11.3159 10.7148C11.3204 10.8629 11.268 11.0075 11.17 11.1187C11.072 11.2298 10.9353 11.2994 10.7878 11.3135C10.6404 11.3275 10.4931 11.2849 10.3759 11.1944L10.3207 11.146L9.91279 10.7375C9.81212 10.6371 9.75138 10.503 9.74246 10.361C9.73358 10.2191 9.77711 10.0791 9.86437 9.9668C9.95164 9.85451 10.0767 9.77786 10.2164 9.75147Z" />
  <path d="M7.00011 4.08333C7.57147 4.08333 8.1303 4.25105 8.60712 4.56584C9.08401 4.88072 9.45821 5.32887 9.68264 5.85441C9.90708 6.37997 9.97182 6.96014 9.86949 7.52238C9.76714 8.08457 9.5019 8.60442 9.10672 9.01717C8.71152 9.42989 8.20388 9.71766 7.64667 9.84432C7.08947 9.97097 6.50721 9.93115 5.97244 9.72982C5.43762 9.52843 4.97361 9.17403 4.63829 8.71126C4.30301 8.24852 4.11109 7.69737 4.08629 7.12647L4.08344 7L4.08629 6.87354C4.11891 6.12264 4.44008 5.41321 4.98294 4.89339C5.5258 4.37357 6.2485 4.08338 7.00011 4.08333Z" />
  <path d="M2.33344 6.41667C2.48207 6.41687 2.62527 6.47357 2.73334 6.5756C2.84145 6.67767 2.90635 6.81741 2.91507 6.96582C2.92377 7.11419 2.87542 7.26027 2.78006 7.37427C2.68468 7.48822 2.54935 7.56174 2.4018 7.57935L2.33344 7.58333H1.75011C1.60149 7.58317 1.4583 7.52639 1.35021 7.4244C1.24209 7.32233 1.1772 7.1826 1.16848 7.03418C1.15977 6.88576 1.20807 6.73975 1.30349 6.62573C1.39892 6.51173 1.53412 6.43821 1.68175 6.42066L1.75011 6.41667H2.33344Z" />
  <path d="M12.2501 6.41667C12.3987 6.41687 12.5419 6.47357 12.65 6.5756C12.7581 6.67767 12.823 6.81741 12.8317 6.96582C12.8404 7.11419 12.7921 7.26027 12.6967 7.37427C12.6013 7.48822 12.466 7.56174 12.3185 7.57935L12.2501 7.58333H11.6668C11.5182 7.58317 11.375 7.52639 11.2669 7.4244C11.1588 7.32233 11.0939 7.1826 11.0852 7.03418C11.0764 6.88576 11.1247 6.73975 11.2202 6.62573C11.3156 6.51173 11.4508 6.43821 11.5984 6.42066L11.6668 6.41667H12.2501Z" />
  <path d="M3.15831 2.69393C3.29767 2.66746 3.4418 2.69295 3.56391 2.76514L3.62429 2.80558L3.67898 2.85401L4.08743 3.26245C4.19205 3.36743 4.25266 3.50852 4.25719 3.65666C4.26168 3.80468 4.20981 3.94887 4.11192 4.05998C4.01394 4.1711 3.87715 4.24071 3.72968 4.2548C3.58214 4.26886 3.43449 4.2264 3.31725 4.13574L3.26256 4.08732L2.85411 3.67887C2.75399 3.57843 2.69376 3.44501 2.68492 3.30347C2.67614 3.16179 2.71922 3.02139 2.80626 2.90926C2.89335 2.79712 3.01883 2.72049 3.15831 2.69393Z" />
  <path d="M10.7331 2.68368C10.8877 2.68368 11.0362 2.74477 11.1455 2.85401C11.2459 2.95442 11.3064 3.08826 11.3153 3.22998C11.3242 3.37175 11.281 3.51195 11.194 3.62419L11.1455 3.67887L10.7371 4.08732C10.6321 4.19187 10.4915 4.25254 10.3435 4.25708C10.1953 4.2616 10.0507 4.20984 9.93956 4.11182C9.82846 4.01381 9.75879 3.87707 9.74474 3.72957C9.73068 3.58204 9.77371 3.43439 9.86437 3.31714L9.91279 3.26245L10.3207 2.85401C10.43 2.7447 10.5785 2.68372 10.7331 2.68368Z" />
  <path d="M7.00011 1.16667C7.14294 1.16672 7.28074 1.2193 7.38748 1.31421C7.49421 1.40913 7.56272 1.53979 7.57945 1.68164L7.58344 1.75V2.33333C7.58328 2.48201 7.526 2.62512 7.42394 2.73324C7.32191 2.84122 7.18259 2.90622 7.03429 2.91496C6.88592 2.92367 6.73984 2.87531 6.62584 2.77995C6.51185 2.68455 6.43835 2.54929 6.42076 2.40169L6.41677 2.33333V1.75C6.41677 1.59529 6.47828 1.44696 6.58767 1.33757C6.69706 1.22821 6.84543 1.16667 7.00011 1.16667Z" />
</>);
const MOON = (<path d="M7.03476 1.16325L7.07407 1.16667H7.22959C7.73751 1.16685 7.99301 1.76366 7.67164 2.1311L7.62664 2.17782C6.97706 2.78122 6.55931 3.59304 6.4463 4.47241C6.3333 5.35186 6.53197 6.24338 7.00799 6.99146C7.484 7.73948 8.20744 8.29699 9.05193 8.56714C9.89641 8.83725 10.809 8.8026 11.6308 8.46973C12.1102 8.27517 12.5868 8.75596 12.3879 9.23421C11.9826 10.2093 11.3198 11.0561 10.471 11.6843C9.62217 12.3124 8.61888 12.6983 7.56796 12.8009C6.51707 12.9035 5.45798 12.7191 4.50375 12.2671C3.54945 11.8149 2.73558 11.1117 2.14934 10.2334C1.56319 9.35513 1.22613 8.33435 1.17465 7.2797C1.12319 6.22495 1.35916 5.17578 1.85711 4.24455C2.35506 3.31336 3.09673 2.53499 4.00245 1.99211C4.90799 1.44936 5.94371 1.16242 6.99944 1.16211L7.03476 1.16325Z" />);
const CHEV = (<path d="M10.0878 4.83761C10.3157 4.6098 10.6849 4.6098 10.9127 4.83761C11.1405 5.06542 11.1405 5.43469 10.9127 5.66248L7.41272 9.16248C7.18493 9.39027 6.81566 9.39024 6.58785 9.16248L3.08785 5.66248C2.86004 5.43467 2.86004 5.06542 3.08785 4.83761C3.31565 4.6098 3.68491 4.6098 3.91272 4.83761L7.00028 7.92518L10.0878 4.83761Z" />);

export default function Site({ initial }: { initial: SiteData }) {
  // the server already read the shared content, so the first paint is real.
  // the client only re-pulls it when the tab gets focus again
  const [data, setData] = useState<SiteData>(initial);
  const [lang, setLangState] = useState<Lang>('en');
  const [scrolled, setScrolled] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
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
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [langOpen, setLangOpen] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const handsRef = useRef<HTMLImageElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const modalOpen = useRef(false);
  const toastT = useRef<ReturnType<typeof setTimeout>>();
  const closeT = useRef<ReturnType<typeof setTimeout>>();
  const fine = useRef(false);
  const reduced = useRef(false);
  // mirrors for the auto-advance timer, so it reads fresh values without resetting
  const cardPicRef = useRef(cardPic);
  const itemsRef = useRef<Item[]>([]);
  cardPicRef.current = cardPic;

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
  }, []);

  // theme: read what the no-flash script set on <html>, then keep in sync
  useEffect(() => {
    const t = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    setThemeState(t);
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
    setLangState((localStorage.getItem('zx_lang') as Lang) || 'en');
    fetchRub().then(setRub);
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
    if (!customCursor) return;
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
  }, [customCursor]);

  // reveal cards on scroll; re-observes when data changes so items added
  // via the focus reload also animate in
  useEffect(() => {
    if (reduced.current || !('IntersectionObserver' in window)) { setRevealAll(true); return; }
    const io = new IntersectionObserver(es => {
      es.forEach(en => {
        if (en.isIntersecting) {
          const id = en.target.getAttribute('data-reveal')!;
          setRevealed(r => (r[id] ? r : { ...r, [id]: true }));
          io.unobserve(en.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    const t = setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach(c => {
        if (!revealed[c.getAttribute('data-reveal')!]) io.observe(c);
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

  const setLang = (l: Lang) => { localStorage.setItem('zx_lang', l); setLangState(l); setLangOpen(false); };
  const setTheme = (th: 'dark' | 'light') => {
    document.documentElement.dataset.theme = th;
    localStorage.setItem('zx_theme', th);
    setThemeState(th);
  };
  const t = T[lang];
  const ru = lang === 'ru';

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
        changelog: w.changelog || []
      };
    }),
    ...data.projects.map(p => ({
      id: p.id, media: p.img ? [{ kind: 'img' as const, src: p.img }] : [],
      title: p.name, link: p.link, sub: '',
      cat: ru && p.roleRu ? p.roleRu : p.role,
      metaDim: '', metaMain: p.from + ' - ' + p.to, metaSub: '', place: t.team,
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
  // blur only once the pill is up; lighter on webkit where it re-rasterizes per frame
  const navBlur = sc ? (safari ? 'blur(10px)' : 'blur(16px) saturate(1.6)') : 'none';

  return (
    <div className="site-page" data-custom-cursor={customCursor ? 'true' : undefined} style={{ minHeight: '100vh', overflowX: 'clip' }}>
      {/* nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: sc ? '12px 16px 0' : '0px', transition: 'padding .6s ' + EASE, pointerEvents: 'none' }}>
        <div style={{
          pointerEvents: 'auto', position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          maxWidth: sc ? 790 : 1256, height: sc ? 52 : 64, padding: '0 20px',
          border: '1px solid ' + (sc ? 'var(--nav-border)' : 'transparent'),
          borderRadius: sc ? 9999 : 0, background: sc ? 'var(--nav-bg)' : 'var(--nav-bg-top)',
          backdropFilter: navBlur, WebkitBackdropFilter: navBlur,
          boxShadow: sc ? '0 16px 48px rgba(0,0,0,.5)' : 'none',
          transition: `max-width .6s ${EASE}, height .6s ${EASE}, border-radius .6s ${EASE}, background .45s ease, border-color .45s ease, box-shadow .45s ease`
        }}>
          <div onClick={goTop} style={{ fontSize: 16, letterSpacing: '-0.01em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>AimworkSpace</div>
          <div className="nav-center" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 22, fontSize: 14 }}>
            <a href="#services" className="navlnk">{t.navS}</a>
            <a href="#projects" className="navlnk">{t.navP}</a>
            <a href="#contact" className="navlnk">{t.navC}</a>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* theme toggle: sun on the left, moon on the right, knob slides */}
            <div className="ctrl-pill theme-switch" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} role="button" aria-label="Toggle theme" title="Theme">
              <svg viewBox="0 0 14 14" fill={theme === 'light' ? 'var(--text)' : 'var(--muted)'} style={{ transition: 'fill .2s ease' }} aria-hidden>{SUN}</svg>
              <svg viewBox="0 0 14 14" fill={theme === 'dark' ? 'var(--text)' : 'var(--muted)'} style={{ transition: 'fill .2s ease' }} aria-hidden>{MOON}</svg>
              <span className="theme-knob" style={{ transform: `translateX(${theme === 'dark' ? 23 : 0}px)` }} />
            </div>
            {/* language picker with flags */}
            <div ref={langRef} style={{ position: 'relative' }}>
              <div className={'ctrl-pill lang-pill' + (langOpen ? ' open' : '')} onClick={() => setLangOpen(o => !o)} role="button" aria-haspopup="listbox" aria-expanded={langOpen}>
                <img src={ru ? '/images/flags/russia.svg' : '/images/flags/usa.svg'} alt="" />
                <span className="lang-code">{ru ? 'RU' : 'EN'}</span>
                <svg className="lang-chev" width="12" height="12" viewBox="0 0 14 14" fill="currentColor" aria-hidden>{CHEV}</svg>
              </div>
              <div className="lang-menu" data-closed={!langOpen} role="listbox">
                <div className={'lang-opt' + (!ru ? ' active' : '')} onClick={() => setLang('en')} role="option" aria-selected={!ru}>
                  <img src="/images/flags/usa.svg" alt="" /><span>English</span>
                </div>
                <div className={'lang-opt' + (ru ? ' active' : '')} onClick={() => setLang('ru')} role="option" aria-selected={ru}>
                  <img src="/images/flags/russia.svg" alt="" /><span>Russian</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* hero (pinned, content slides over it) */}
      <div style={{ background: 'var(--hero-bg)', position: 'sticky', top: 0, zIndex: 1, overflow: 'hidden' }}>
        <div ref={heroRef} style={{ maxWidth: 1200, margin: '0 auto', padding: '104px 28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transformOrigin: '50% 30%', willChange: reduced.current ? 'auto' : 'transform,opacity' }}>
          <h1 className="in0" style={{ margin: 0, fontSize: 'clamp(38px,5.2vw,60px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.011em', maxWidth: '17ch', textWrap: 'balance' }}>{t.heroT}</h1>
          <div className="in1" style={{ marginTop: 14, fontSize: 18, lineHeight: 1.4, color: 'var(--muted)', maxWidth: '46ch', textWrap: 'balance' }}>{t.heroSub}</div>
          <div className="in2" style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <a href={tgHref} target="_blank" className="pill">{t.start} ↗</a>
            <a href="#projects" className="ghost">{t.view} ↓</a>
          </div>
        </div>
        {config.showMap && (
          <div className="in3" style={{ overflow: 'hidden', marginTop: 8 }}>
            {/* avif is tiny but ios lockdown mode can not decode it. fall back to png on error */}
            <img ref={handsRef} src="/assets/hero-hands.avif" alt="" fetchPriority="high" onError={e => { const im = e.currentTarget; if (!im.dataset.fb) { im.dataset.fb = '1'; im.src = '/assets/hero-hands.png'; } }} style={{ width: '114%', marginLeft: '-7%', display: 'block', transform: 'scale(1.06)', filter: 'invert(var(--hero-invert))', willChange: reduced.current ? 'auto' : 'transform' }} />
          </div>
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
          <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em' }}>{t.svcH}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid var(--line)', background: 'var(--line)' }}>
            {services.map((s, i) => {
              const on = revealAll || revealed['svc-' + s.id];
              const Icon = SERVICE_ICONS[s.id as keyof typeof SERVICE_ICONS];
              return (
              <div key={s.id} data-reveal={'svc-' + s.id} className="svc"
                onMouseMove={config.spotlight ? spotMove : undefined}
                onMouseLeave={config.spotlight ? spotLeave : undefined}
                style={{ opacity: on ? 1 : 0, transform: on ? undefined : 'translate3d(0,18px,0)', transitionDelay: on ? `0s, ${(i % 2) * 60}ms, ${(i % 2) * 60}ms` : '0s' }}>
                {config.spotlight && <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(280px circle at var(--mx,-300px) var(--my,-300px),var(--spot),transparent 65%)' }} />}
                {s.icon
                  ? <img src={s.icon} loading="lazy" alt="" style={{ width: 26, height: 26, objectFit: 'contain', display: 'block' }} />
                  : Icon
                    ? <AnimateIcon animate={motionOk} loop loopDelay={1000} style={{ display: 'inline-flex', color: 'var(--icon)' }}><Icon size={26} aria-hidden /></AnimateIcon>
                    : <div style={{ fontSize: 22, lineHeight: 1.2, color: 'var(--icon)' }}>{s.glyph}</div>}
                <div style={{ marginTop: 20, fontSize: 14, letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.title}</div>
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', maxWidth: '36ch' }}>{s.desc}</div>
              </div>
              );
            })}
          </div>
        </div>

        {/* stack marquee */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px 0' }}>
          <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '20px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div className="marq" style={{ display: 'inline-flex', whiteSpace: 'nowrap', alignItems: 'center' }}>
              {[...STACK, ...STACK].map(([slug, label], i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginRight: 48 }}>
                  <img src={`https://cdn.simpleicons.org/${slug}/9c9c9c`} loading="lazy" alt="" style={{ width: 18, height: 18, display: 'block', opacity: .75 }} />
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* projects */}
        <div id="projects" style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: 'var(--muted)' }}>{'// PROJECTS'}</span>
            <span style={{ flex: 1, borderTop: '1px solid var(--line)' }} />
            <span style={{ fontSize: 13, color: 'var(--faint)' }}>({items.length})</span>
          </div>
          <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em' }}>{t.projH}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 22 }}>
            {items.map((w, i) => {
              const on = revealAll || revealed[w.id];
              const ci = (cardPic[w.id] || 0) % Math.max(w.media.length, 1);
              const hasCar = w.media.length > 1;
              const cur = w.media[ci];
              return (
                <a key={w.id} data-card={w.id} data-reveal={w.id} className="card"
                  onClick={() => openModal(w, ci)}
                  onMouseMove={config.spotlight ? spotMove : undefined}
                  onMouseLeave={config.spotlight ? spotLeave : undefined}
                  style={{ opacity: on ? 1 : 0, transform: on ? undefined : `translate3d(${i % 2 ? 36 : -36}px,0,0)` }}>
                  {config.spotlight && <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'radial-gradient(280px circle at var(--mx,-300px) var(--my,-300px),var(--spot),transparent 65%)' }} />}
                  {cur ? (
                    <span style={{ position: 'relative', display: 'block', borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
                      {cur.kind === 'video' ? (
                        <video key={ci} ref={vidStart} className="imgfade" src={cur.src} loop={!hasCar} onEnded={hasCar ? () => advanceCard(w.id) : undefined} muted playsInline preload="none" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block', background: '#000' }} />
                      ) : (
                        <img key={ci} className="imgfade" src={cur.src} loading="lazy" alt="" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block' }} />
                      )}
                      {hasCar && <>
                        <span className="carr" style={{ left: 8 }} onClick={e => { e.stopPropagation(); e.preventDefault(); setCardPic(c => ({ ...c, [w.id]: (ci - 1 + w.media.length) % w.media.length })); }}>‹</span>
                        <span className="carr" style={{ right: 8 }} onClick={e => { e.stopPropagation(); e.preventDefault(); setCardPic(c => ({ ...c, [w.id]: (ci + 1) % w.media.length })); }}>›</span>
                        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', gap: 5 }}>
                          {w.media.map((_, di) => <span key={di} style={{ width: 6, height: 6, borderRadius: 99, background: di === ci ? '#f3f3f3' : 'rgba(255,255,255,.35)', transition: 'background .25s ease' }} />)}
                        </span>
                      </>}
                    </span>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(45deg,var(--bg) 0px,var(--bg) 9px,var(--card-2) 9px,var(--card-2) 18px)', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 12, letterSpacing: '.14em', color: 'var(--faint)' }}>{w.place}</span>
                    </div>
                  )}
                  <div style={{ padding: '16px 18px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 17, letterSpacing: '-0.005em', minWidth: 0 }}>{w.title}</span>
                      {!!w.link && <span style={{ fontSize: 12, color: 'var(--muted)' }}>↗</span>}
                      <span style={{ marginLeft: 'auto', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>{w.metaDim}</span><span>{w.metaMain}</span></span>
                        {!!w.metaSub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{w.metaSub}</span>}
                      </span>
                    </div>
                    {!!w.sub && <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)' }}>{w.sub}</div>}
                    {!!w.cat && <div style={{ marginTop: 6, fontSize: 12, letterSpacing: '.04em', color: 'var(--muted)' }}>{w.cat}</div>}
                  </div>
                </a>
              );
            })}
          </div>

          {/* featured in */}
          <div style={{ marginTop: 70, borderTop: '1px solid var(--line)', paddingTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: 'var(--muted)', textAlign: 'center' }}>{t.feat}</span>
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
            <div style={{ fontSize: 23 }}>{t.aboutH}</div>
            <div style={{ marginTop: 16, fontSize: 16, lineHeight: 1.65, color: 'var(--muted)' }}>{renderAbout(aboutText)}</div>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--muted)', fontSize: 14 }}>
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
          <h2 style={{ margin: '0 0 26px', fontSize: 'clamp(28px,3vw,38px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em' }}>{t.faqH}</h2>
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
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em', maxWidth: '22ch', textWrap: 'balance' }}>{t.ctH}</h2>
            <div style={{ marginTop: 10, fontSize: 16, color: 'var(--muted)' }}>{t.ctSub}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <a href={tgHref} target="_blank" className="pill">
                <img src="https://cdn.simpleicons.org/telegram/000000" alt="" style={{ width: 15, height: 15, display: 'block' }} />Telegram
              </a>
              <a href={ghHref} target="_blank" className="ghost">
                <img src="https://cdn.simpleicons.org/github/f3f3f3" alt="" style={{ width: 15, height: 15, display: 'block' }} />GitHub
              </a>
            </div>
            <div style={{ marginTop: 22, fontSize: 14, color: 'var(--muted)' }}>
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
                  <span style={{ fontSize: 14 }}><span style={{ color: 'var(--muted)' }}>{modal.metaDim}</span><span>{modal.metaMain}</span></span>
                  {!!modal.metaSub && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{modal.metaSub}</span>}
                </span>
              </div>
              {!!modal.cat && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>{modal.cat}</div>}
              {!!modal.sub && <div style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', whiteSpace: 'pre-line' }}>{modal.sub}</div>}
              {modal.changelog.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 12, letterSpacing: '.12em', color: 'var(--muted)' }}>{'// ' + t.chlog}</span>
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
                {!!modal.link && <a href={modal.link} target="_blank" className="pill" style={{ padding: '11px 22px' }}>{t.open} ↗</a>}
                <span className="ghost" style={{ padding: '11px 22px', cursor: 'pointer', userSelect: 'none' }} onClick={closeModal}>{t.close}</span>
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

      {/* toast */}
      <div style={{ position: 'fixed', left: 0, bottom: 34, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 600 }}>
        <span style={{ background: 'var(--inv-bg)', color: 'var(--inv-text)', borderRadius: 9999, padding: '9px 18px', fontSize: 13, opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(14px)', transition: `opacity .35s ease, transform .4s ${EASE}` }}>{toast || ' '}</span>
      </div>

      {/* cursor dot: safari uses the native cursor to avoid frame lag */}
      {customCursor && <div ref={cursorRef} style={{ position: 'fixed', left: 0, top: 0, width: 9, height: 9, borderRadius: 99, background: '#f3f3f3', pointerEvents: 'none', zIndex: 9999, opacity: 0, transform: 'translate3d(-100px,-100px,0)', willChange: 'transform', transition: 'opacity .25s ease', mixBlendMode: 'difference' }} />}
    </div>
  );
}
