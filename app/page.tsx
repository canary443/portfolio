'use client';
// main site page, ported from the design prototype

import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { ArrowsClockwise, Browser, Code, Robot } from '@phosphor-icons/react';
import { loadData, fetchRub, DEFAULTS, SiteData, LogEntry } from '@/lib/data';
import { T, Lang } from '@/lib/i18n';
import { config } from '@/lib/config';

interface Item {
  id: string; imgs: string[]; video: string | null;
  title: string; link: string; sub: string; cat: string;
  metaDim: string; metaMain: string; metaSub: string; place: string;
  changelog: LogEntry[];
}

const EASE = 'cubic-bezier(.22,1,.36,1)';
const SERVICE_ICONS = { s1: Browser, s2: Robot, s3: ArrowsClockwise, s4: Code } as const;
const STACK: [string, string][] = [
  ['python', 'Python'], ['rust', 'Rust'], ['cplusplus', 'C++'], ['typescript', 'TypeScript'],
  ['javascript', 'JavaScript'], ['react', 'React'], ['vite', 'Vite'], ['nextdotjs', 'Next.js'],
  ['git', 'Git'], ['claude', 'Agents / Claude'], ['postgresql', 'SQL'], ['redis', 'Redis']
];

export default function Page() {
  // start from defaults so the server renders real content, swap in
  // localStorage after mount (same markup, no hydration mismatch)
  const [data, setData] = useState<SiteData>(DEFAULTS);
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

  const cursorRef = useRef<HTMLDivElement>(null);
  const handsRef = useRef<HTMLImageElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const modalOpen = useRef(false);
  const toastT = useRef<ReturnType<typeof setTimeout>>();
  const closeT = useRef<ReturnType<typeof setTimeout>>();
  const ptrType = useRef<string>('mouse');
  const fine = useRef(false);
  const reduced = useRef(false);

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
  }, []);

  // modal open: freeze scroll under it
  useEffect(() => {
    modalOpen.current = !!modal;
    if (modal) { lenisRef.current?.stop(); document.body.style.overflow = 'hidden'; }
    else { lenisRef.current?.start(); document.body.style.overflow = ''; }
  }, [modal]);

  // load data + language + rate, refresh on focus to pick up admin edits
  useEffect(() => {
    setData(loadData());
    setLangState((localStorage.getItem('zx_lang') as Lang) || 'en');
    fetchRub().then(setRub);
    const onFocus = () => setData(loadData());
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

  const setLang = (l: Lang) => { localStorage.setItem('zx_lang', l); setLangState(l); };
  const t = T[lang];
  const ru = lang === 'ru';

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(''), 1700);
  }, []);

  // magnetic pull toward the cursor + press scale composed in one transform.
  // touch is skipped: it has no leave event, so an offset would stick after a tap
  const magReset = (el: HTMLElement) => { delete el.dataset.press; el.style.transform = ''; };
  const magMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!fine.current || reduced.current || ptrType.current === 'touch') return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * .2, y = (e.clientY - r.top - r.height / 2) * .3;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)' + (el.dataset.press ? ' scale(.97)' : '');
  };
  const magLeave = (e: React.MouseEvent<HTMLElement>) => magReset(e.currentTarget);
  const magDown = (e: React.PointerEvent<HTMLElement>) => {
    ptrType.current = e.pointerType;
    if (e.pointerType === 'touch' || !fine.current || reduced.current) return;
    const el = e.currentTarget;
    el.dataset.press = '1';
    if (el.style.transform) el.style.transform = el.style.transform.replace(/ ?scale\([^)]*\)/, '') + ' scale(.97)';
  };
  const magUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') { magReset(e.currentTarget); return; }
    const el = e.currentTarget;
    delete el.dataset.press;
    el.style.transform = el.style.transform.replace(/ ?scale\([^)]*\)/, '');
  };
  const mag = { onMouseMove: magMove, onMouseLeave: magLeave, onPointerDown: magDown, onPointerUp: magUp, onPointerCancel: (e: React.PointerEvent<HTMLElement>) => magReset(e.currentTarget) };
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
      return {
        id: w.id, imgs: pics, video: w.video || null,
        title: ru && w.titleRu ? w.titleRu : w.title, link: w.link,
        sub: ru && w.descRu ? w.descRu : w.desc, cat: w.date || '',
        metaDim: t.madeFor, metaMain: usd, metaSub: rubP, place: t.photoSoon,
        changelog: w.changelog || []
      };
    }),
    ...data.projects.map(p => ({
      id: p.id, imgs: p.img ? [p.img] : [], video: null,
      title: p.name, link: p.link, sub: '',
      cat: ru && p.roleRu ? p.roleRu : p.role,
      metaDim: '', metaMain: p.from + ' - ' + p.to, metaSub: '', place: t.team,
      changelog: p.changelog || []
    }))
  ];

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
      if (m[2]) out.push(<strong key={k++} style={{ color: '#f3f3f3', fontWeight: 500 }}>{m[2]}</strong>);
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
          pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 22, width: '100%',
          maxWidth: sc ? 790 : 1256, height: sc ? 52 : 64, padding: '0 24px',
          border: '1px solid ' + (sc ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,0)'),
          borderRadius: sc ? 9999 : 0, background: sc ? 'rgba(22,22,22,.6)' : 'rgba(10,10,10,.5)',
          backdropFilter: navBlur, WebkitBackdropFilter: navBlur,
          boxShadow: sc ? '0 16px 48px rgba(0,0,0,.5)' : 'none',
          transition: `max-width .6s ${EASE}, height .6s ${EASE}, border-radius .6s ${EASE}, background .45s ease, border-color .45s ease, box-shadow .45s ease`
        }}>
          <div onClick={goTop} style={{ fontSize: 16, letterSpacing: '-0.01em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>AimworkSpace</div>
          <div style={{ display: 'flex', gap: 22, fontSize: 14, marginLeft: 'auto', marginRight: 'auto' }}>
            <a href="#services" className="navlnk">{t.navS}</a>
            <a href="#projects" className="navlnk">{t.navP}</a>
            <a href="#contact" className="navlnk">{t.navC}</a>
          </div>
          <span onClick={() => setLang(ru ? 'en' : 'ru')} className="langbtn" style={{ cursor: 'pointer' }}>{ru ? 'EN' : 'RU'}</span>
          <a href={tgHref} target="_blank" className="chatbtn" {...mag}>
            <img src="https://cdn.simpleicons.org/telegram/f3f3f3" alt="" style={{ width: 14, height: 14, display: 'block', flex: 'none' }} />
            {t.chat}
          </a>
        </div>
      </div>

      {/* hero (pinned, content slides over it) */}
      <div style={{ background: '#000', position: 'sticky', top: 0, zIndex: 1, overflow: 'hidden' }}>
        <div ref={heroRef} style={{ maxWidth: 1200, margin: '0 auto', padding: '104px 28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transformOrigin: '50% 30%', willChange: reduced.current ? 'auto' : 'transform,opacity' }}>
          <h1 className="in0" style={{ margin: 0, fontSize: 'clamp(38px,5.2vw,60px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.011em', maxWidth: '17ch', textWrap: 'balance' }}>{t.heroT}</h1>
          <div className="in1" style={{ marginTop: 14, fontSize: 18, lineHeight: 1.4, color: '#9c9c9c', maxWidth: '46ch', textWrap: 'balance' }}>{t.heroSub}</div>
          <div className="in2" style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <a href={tgHref} target="_blank" className="pill" {...mag}>{t.start} ↗</a>
            <a href="#projects" className="ghost" {...mag}>{t.view} ↓</a>
          </div>
        </div>
        {config.showMap && (
          <div className="in3" style={{ overflow: 'hidden', marginTop: 8 }}>
            <img ref={handsRef} src="/assets/hero-hands.avif" alt="" fetchPriority="high" style={{ width: '114%', marginLeft: '-7%', display: 'block', transform: 'scale(1.06)', willChange: reduced.current ? 'auto' : 'transform' }} />
          </div>
        )}
      </div>

      {/* sheet that covers the hero */}
      <div style={{ position: 'relative', zIndex: 2, background: '#101010', borderRadius: '26px 26px 0 0', borderTop: '1px solid #212121', boxShadow: '0 -40px 80px rgba(0,0,0,.6)' }}>

        {/* services */}
        <div id="services" style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: '#9c9c9c' }}>{'// SERVICES'}</span>
            <span style={{ flex: 1, borderTop: '1px solid #212121' }} />
          </div>
          <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em' }}>{t.svcH}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid #212121', background: '#212121' }}>
            {services.map((s, i) => {
              const on = revealAll || revealed['svc-' + s.id];
              const Icon = SERVICE_ICONS[s.id as keyof typeof SERVICE_ICONS];
              return (
              <div key={s.id} data-reveal={'svc-' + s.id} className="svc" onMouseMove={config.spotlight ? spotMove : undefined} onMouseLeave={config.spotlight ? spotLeave : undefined}
                style={{ opacity: on ? 1 : 0, transform: on ? undefined : 'translate3d(0,18px,0)', transitionDelay: on ? `0s, ${(i % 2) * 60}ms, ${(i % 2) * 60}ms` : '0s' }}>
                {config.spotlight && <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(280px circle at var(--mx,-300px) var(--my,-300px),rgba(255,255,255,.06),transparent 65%)' }} />}
                {s.icon
                  ? <img src={s.icon} loading="lazy" alt="" style={{ width: 26, height: 26, objectFit: 'contain', display: 'block' }} />
                  : Icon
                    ? <Icon size={26} weight="regular" color="#6f6759" aria-hidden />
                    : <div style={{ fontSize: 22, lineHeight: 1.2, color: '#6f6759' }}>{s.glyph}</div>}
                <div style={{ marginTop: 20, fontSize: 14, letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.title}</div>
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: '#9c9c9c', maxWidth: '36ch' }}>{s.desc}</div>
              </div>
              );
            })}
          </div>
        </div>

        {/* stack marquee */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px 0' }}>
          <div style={{ borderTop: '1px solid #212121', borderBottom: '1px solid #212121', padding: '20px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div className="marq" style={{ display: 'inline-flex', whiteSpace: 'nowrap', alignItems: 'center' }}>
              {[...STACK, ...STACK].map(([slug, label], i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginRight: 48 }}>
                  <img src={`https://cdn.simpleicons.org/${slug}/9c9c9c`} loading="lazy" alt="" style={{ width: 18, height: 18, display: 'block', opacity: .75 }} />
                  <span style={{ fontSize: 14, color: '#9c9c9c' }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* projects */}
        <div id="projects" style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: '#9c9c9c' }}>{'// PROJECTS'}</span>
            <span style={{ flex: 1, borderTop: '1px solid #212121' }} />
            <span style={{ fontSize: 13, color: '#474747' }}>({items.length})</span>
          </div>
          <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em' }}>{t.projH}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 22 }}>
            {items.map((w, i) => {
              const on = revealAll || revealed[w.id];
              const ci = (cardPic[w.id] || 0) % Math.max(w.imgs.length, 1);
              const hasCar = w.imgs.length > 1 && !w.video;
              return (
                <a key={w.id} data-card={w.id} data-reveal={w.id} className="card"
                  onClick={() => openModal(w, ci)}
                  onMouseMove={config.spotlight ? spotMove : undefined}
                  onMouseLeave={config.spotlight ? spotLeave : undefined}
                  style={{ opacity: on ? 1 : 0, transform: on ? undefined : `translate3d(${i % 2 ? 36 : -36}px,0,0)` }}>
                  {config.spotlight && <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'radial-gradient(280px circle at var(--mx,-300px) var(--my,-300px),rgba(255,255,255,.05),transparent 65%)' }} />}
                  {w.video ? (
                    <video ref={vidStart} src={w.video} loop muted playsInline preload="none" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block', borderBottom: '1px solid #212121', background: '#000' }} />
                  ) : w.imgs.length ? (
                    <span style={{ position: 'relative', display: 'block', borderBottom: '1px solid #212121', overflow: 'hidden' }}>
                      <img key={ci} className="imgfade" src={w.imgs[ci]} loading="lazy" alt="" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block' }} />
                      {hasCar && <>
                        <span className="carr" style={{ left: 8 }} onClick={e => { e.stopPropagation(); e.preventDefault(); setCardPic(c => ({ ...c, [w.id]: (ci - 1 + w.imgs.length) % w.imgs.length })); }}>‹</span>
                        <span className="carr" style={{ right: 8 }} onClick={e => { e.stopPropagation(); e.preventDefault(); setCardPic(c => ({ ...c, [w.id]: (ci + 1) % w.imgs.length })); }}>›</span>
                        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', gap: 5 }}>
                          {w.imgs.map((_, di) => <span key={di} style={{ width: 6, height: 6, borderRadius: 99, background: di === ci ? '#f3f3f3' : 'rgba(255,255,255,.35)', transition: 'background .25s ease' }} />)}
                        </span>
                      </>}
                    </span>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(45deg,#101010 0px,#101010 9px,#161616 9px,#161616 18px)', borderBottom: '1px solid #212121' }}>
                      <span style={{ fontSize: 12, letterSpacing: '.14em', color: '#474747' }}>{w.place}</span>
                    </div>
                  )}
                  <div style={{ padding: '16px 18px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 17, letterSpacing: '-0.005em', minWidth: 0 }}>{w.title}</span>
                      {!!w.link && <span style={{ fontSize: 12, color: '#9c9c9c' }}>↗</span>}
                      <span style={{ marginLeft: 'auto', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 13 }}><span style={{ color: '#9c9c9c' }}>{w.metaDim}</span><span>{w.metaMain}</span></span>
                        {!!w.metaSub && <span style={{ display: 'block', fontSize: 11.5, color: '#9c9c9c', marginTop: 2 }}>{w.metaSub}</span>}
                      </span>
                    </div>
                    {!!w.sub && <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: '#9c9c9c' }}>{w.sub}</div>}
                    {!!w.cat && <div style={{ marginTop: 6, fontSize: 12, letterSpacing: '.04em', color: '#9c9c9c' }}>{w.cat}</div>}
                  </div>
                </a>
              );
            })}
          </div>

          {/* featured in */}
          <div style={{ marginTop: 70, borderTop: '1px solid #212121', paddingTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: '#9c9c9c', textAlign: 'center' }}>{t.feat}</span>
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
            <div style={{ marginTop: 16, fontSize: 16, lineHeight: 1.65, color: '#9c9c9c' }}>{renderAbout(aboutText)}</div>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: '#9c9c9c', fontSize: 14 }}>
                <span style={{ display: 'inline-block', width: 21, height: 15, borderRadius: 2, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
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
            <span style={{ fontSize: 13, letterSpacing: '.12em', color: '#9c9c9c' }}>{'// FAQ'}</span>
            <span style={{ flex: 1, borderTop: '1px solid #212121' }} />
          </div>
          <h2 style={{ margin: '0 0 26px', fontSize: 'clamp(28px,3vw,38px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em' }}>{t.faqH}</h2>
          {data.faq.map(q => {
            const open = faqOpen === q.id;
            return (
              <div key={q.id} style={{ borderTop: '1px solid #212121' }}>
                <div className="faqrow" style={{ cursor: 'pointer' }} onClick={() => setFaqOpen(open ? null : q.id)}>
                  <span style={{ fontSize: 16, flex: 1 }}>{ru && q.qRu ? q.qRu : q.q}</span>
                  <span style={{ fontSize: 13, color: '#9c9c9c', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .35s ' + EASE }}>▾</span>
                </div>
                <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows .45s ' + EASE }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 4px 22px', fontSize: 14.5, lineHeight: 1.65, color: '#9c9c9c', maxWidth: '60ch' }}>{ru && q.aRu ? q.aRu : q.a}</div>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid #212121' }} />
        </div>

        {/* contact */}
        <div id="contact" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 28px 110px' }}>
          <div style={{ position: 'relative', borderTop: '1px solid #212121', borderBottom: '1px solid #212121', padding: '80px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {(['left', 'right'] as const).map(sx => (['top', 'bottom'] as const).map(sy => (
              <span key={sx + sy} style={{ position: 'absolute', [sx]: -3, [sy]: sy === 'top' ? -9 : -8, color: '#474747', fontSize: 13, lineHeight: 1 }}>+</span>
            )))}
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 400, lineHeight: 1.07, letterSpacing: '-0.007em', maxWidth: '22ch', textWrap: 'balance' }}>{t.ctH}</h2>
            <div style={{ marginTop: 10, fontSize: 16, color: '#9c9c9c' }}>{t.ctSub}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <a href={tgHref} target="_blank" className="pill" {...mag}>
                <img src="https://cdn.simpleicons.org/telegram/000000" alt="" style={{ width: 15, height: 15, display: 'block' }} />Telegram
              </a>
              <a href={ghHref} target="_blank" className="ghost" {...mag}>
                <img src="https://cdn.simpleicons.org/github/f3f3f3" alt="" style={{ width: 15, height: 15, display: 'block' }} />GitHub
              </a>
            </div>
            <div style={{ marginTop: 22, fontSize: 14, color: '#9c9c9c' }}>
              {t.dm} -&gt; <a href={tgHref} target="_blank" className="ulink">@{data.telegram}</a> · <span className="ulink" title="click to copy" style={{ textDecorationStyle: 'dotted', cursor: 'pointer' }} onClick={() => { navigator.clipboard?.writeText(email).catch(() => {}); showToast(t.copied); }}>{email}</span>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ borderTop: '1px solid #212121' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14 }}>AimworkSpace</span>
            <span style={{ fontSize: 12, color: '#474747' }}>© 2026</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontSize: 13, alignItems: 'center' }}>
              <a href={tgHref} target="_blank" className="ftr"><img src="https://cdn.simpleicons.org/telegram/9c9c9c" alt="" style={{ width: 12, height: 12 }} />telegram</a>
              <a href={ghHref} target="_blank" className="ftr"><img src="https://cdn.simpleicons.org/github/9c9c9c" alt="" style={{ width: 12, height: 12 }} />github</a>
              <a href={'mailto:' + email} className="ftr">email</a>
              {config.adminLink && <a href="/admin" className="ftr" style={{ color: '#474747' }}>admin</a>}
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
          <div onClick={e => e.stopPropagation()} data-lenis-prevent style={{ width: 'min(660px,94vw)', maxHeight: '86vh', overflow: 'auto', background: '#151515', border: '1px solid #2a2a2a', borderRadius: 14, opacity: closing ? 0 : undefined, transform: closing && !rm ? 'translateY(8px) scale(.98)' : undefined, transition: `opacity .18s ease, transform .18s ${EASE}`, animation: closing || rm ? 'none' : `zxmodal .45s ${EASE} both` }}>
            {modal.video ? (
              <video ref={vidStart} src={modal.video} loop muted playsInline preload="none" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', borderBottom: '1px solid #212121', borderRadius: '13px 13px 0 0', background: '#000' }} />
            ) : modal.imgs.length > 0 && (
              <div style={{ position: 'relative', borderBottom: '1px solid #212121' }}>
                <img key={Math.min(pic, modal.imgs.length - 1)} className="imgfade" src={modal.imgs[Math.min(pic, modal.imgs.length - 1)]} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', borderRadius: '13px 13px 0 0' }} />
                {modal.imgs.length > 1 && <>
                  <span className="marr" style={{ left: 10, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setPic(p => (p - 1 + modal.imgs.length) % modal.imgs.length); }}>‹</span>
                  <span className="marr" style={{ right: 10, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setPic(p => (p + 1) % modal.imgs.length); }}>›</span>
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {modal.imgs.map((_, i) => (
                      <span key={i} onClick={e => { e.stopPropagation(); setPic(i); }} style={{ width: 7, height: 7, borderRadius: 99, cursor: 'pointer', background: i === pic ? '#f3f3f3' : 'rgba(255,255,255,.35)', transform: i === pic ? 'scale(1.25)' : 'scale(1)', transition: 'background .2s ease, transform .2s ease' }} />
                    ))}
                  </span>
                </>}
              </div>
            )}
            <div style={{ padding: '26px 28px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span style={{ fontSize: 24, letterSpacing: '-0.01em' }}>{modal.title}</span>
                <span style={{ marginLeft: 'auto', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 14 }}><span style={{ color: '#9c9c9c' }}>{modal.metaDim}</span><span>{modal.metaMain}</span></span>
                  {!!modal.metaSub && <span style={{ display: 'block', fontSize: 12, color: '#9c9c9c', marginTop: 2 }}>{modal.metaSub}</span>}
                </span>
              </div>
              {!!modal.cat && <div style={{ marginTop: 6, fontSize: 13, color: '#9c9c9c' }}>{modal.cat}</div>}
              {!!modal.sub && <div style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: '#9c9c9c', whiteSpace: 'pre-line' }}>{modal.sub}</div>}
              {modal.changelog.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 12, letterSpacing: '.12em', color: '#9c9c9c' }}>{'// ' + t.chlog}</span>
                    <span style={{ flex: 1, borderTop: '1px solid #212121' }} />
                  </div>
                  {modal.changelog.map(en => (
                    <div key={en.id} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ fontSize: 12.5, color: '#9c9c9c', whiteSpace: 'nowrap', flex: 'none', letterSpacing: '.04em' }}>{en.date}</span>
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
        <span style={{ background: '#f3f3f3', color: '#101010', borderRadius: 9999, padding: '9px 18px', fontSize: 13, opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(14px)', transition: `opacity .35s ease, transform .4s ${EASE}` }}>{toast || ' '}</span>
      </div>

      {/* cursor dot: safari uses the native cursor to avoid frame lag */}
      {customCursor && <div ref={cursorRef} style={{ position: 'fixed', left: 0, top: 0, width: 9, height: 9, borderRadius: 99, background: '#f3f3f3', pointerEvents: 'none', zIndex: 9999, opacity: 0, transform: 'translate3d(-100px,-100px,0)', willChange: 'transform', transition: 'opacity .25s ease', mixBlendMode: 'difference' }} />}
    </div>
  );
}
