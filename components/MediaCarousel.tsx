'use client';
// media carousel for the project cards and the modal, built on the shadcn
// carousel (embla) with the fade plugin: slides crossfade like before, but
// the controls are real buttons and touch swipe works out of the box

import { useEffect, useRef, useState } from 'react';
import Fade from 'embla-carousel-fade';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';

// crisp chevrons instead of text glyphs
const Chev = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === 'l' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
);

export interface Media { kind: 'video' | 'img'; src: string }

interface MediaCarouselProps {
  media: Media[];
  // card: hover arrows, fills the 16:10 frame, photos auto advance
  // modal: always-on arrows, 16:9 media, clickable dots
  mode: 'card' | 'modal';
  motionOk?: boolean;
  startIndex?: number;
  // reports the visible slide up, so the modal can open on the same one
  onIndex?: (i: number) => void;
  // a file that failed to load (dead link): the parent drops that slide
  onBroken?: (src: string) => void;
  // top corners of the modal media
  radius?: string;
}

const mediaStyle = (mode: 'card' | 'modal', radius?: string): React.CSSProperties =>
  mode === 'card'
    ? { width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }
    : { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', borderRadius: radius, background: '#000' };

// button defaults off, so the .carr / .marr classes keep the old look
const btnReset: React.CSSProperties = { padding: 0, margin: 0, font: 'inherit', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' };

export default function MediaCarousel({ media, mode, motionOk = true, startIndex = 0, onIndex, onBroken, radius }: MediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [sel, setSel] = useState(startIndex);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;
  const onBrokenRef = useRef(onBroken);
  onBrokenRef.current = onBroken;
  // the parent rebuilds this array on every render: keep it in a ref so the
  // auto advance timer below is not restarted each time
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const many = media.length > 1;
  const card = mode === 'card';

  // play the visible slide of a card that is on screen, pause everything else.
  // safari refuses to autoplay a video that is off screen, so playing it once
  // at mount left the card black - it has to be retried when the card shows up.
  // with motion off nothing plays: the first frame stays on like a photo
  useEffect(() => {
    if (!api) return;
    let onScreen = mode === 'modal';
    const apply = () => {
      const i = api.selectedScrollSnap();
      api.slideNodes().forEach((node, ni) => {
        node.querySelectorAll('video').forEach(v => {
          if (ni === i && onScreen && motionOk) { v.muted = true; v.play().catch(() => {}); }
          else v.pause();
        });
      });
    };
    const sync = () => {
      const i = api.selectedScrollSnap();
      setSel(i);
      onIndexRef.current?.(i);
      apply();
    };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; apply(); }, { threshold: 0.15 });
    io.observe(api.rootNode());
    sync();
    api.on('select', sync);
    api.on('reInit', sync);
    return () => { io.disconnect(); api.off('select', sync); api.off('reInit', sync); };
  }, [api, motionOk, mode]);

  // a video that never even gets its metadata (dead link, blocked host) would
  // sit there as a black frame, so after a few seconds the parent drops it
  useEffect(() => {
    if (!api) return;
    const t = setTimeout(() => {
      api.slideNodes().forEach(node => {
        node.querySelectorAll('video').forEach(v => {
          if (v.readyState === 0) onBrokenRef.current?.(v.getAttribute('src') || '');
        });
      });
    }, 8000);
    return () => clearTimeout(t);
  }, [api]);

  // cards auto advance photo slides every 5s. video slides wait for onEnded,
  // unless the video is not really playing (autoplay blocked, stalled) - then
  // it must not hold the carousel on one frame forever
  useEffect(() => {
    if (!card || !many || !motionOk || !api) return;
    const iv = setInterval(() => {
      const i = api.selectedScrollSnap();
      if (mediaRef.current[i]?.kind === 'img') { api.scrollNext(); return; }
      const v = api.slideNodes()[i]?.querySelector('video');
      if (!v || v.paused || v.ended) api.scrollNext();
    }, 5000);
    return () => clearInterval(iv);
  }, [api, card, many, motionOk]);

  // arrows live inside the card link: keep clicks away from the modal.
  // a button fires click on enter and space too, so keys are covered as well
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };

  // css only shows the card arrows on hover, so a focused arrow is shown here
  const [keyArrow, setKeyArrow] = useState<'prev' | 'next' | null>(null);
  // old browsers can throw on this pseudo class, then just show the arrow
  const byKey = (el: HTMLElement) => { try { return el.matches(':focus-visible'); } catch { return true; } };
  const focusArrow = (which: 'prev' | 'next') => (e: React.FocusEvent<HTMLButtonElement>) => {
    if (byKey(e.currentTarget)) setKeyArrow(which);
  };

  return (
    <Carousel
      className="h-full"
      opts={{ loop: many, startIndex, duration: motionOk ? 30 : 0, watchDrag: many }}
      plugins={[Fade()]}
      setApi={setApi}
    >
      <CarouselContent className="ml-0 h-full">
        {media.map((m, i) => (
          <CarouselItem key={i} className="pl-0 h-full">
            {m.kind === 'video' ? (
              // metadata, not none: the first frame paints right away, so a
              // video that can not autoplay still looks like a picture
              <video
                src={m.src} muted playsInline preload="metadata"
                loop={!card || !many}
                onEnded={card && many ? () => api?.scrollNext() : undefined}
                onError={() => onBrokenRef.current?.(m.src)}
                style={mediaStyle(mode, radius)}
              />
            ) : (
              <img src={m.src} loading="lazy" alt="" draggable={false} onError={() => onBrokenRef.current?.(m.src)} style={mediaStyle(mode, radius)} />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      {many && <>
        <button
          type="button" className={card ? 'carr' : 'marr'} aria-label="previous"
          style={{ ...btnReset, left: card ? 8 : 10, zIndex: 3, opacity: card && keyArrow === 'prev' ? 1 : undefined }}
          onFocus={focusArrow('prev')} onBlur={() => setKeyArrow(null)}
          onClick={e => { stop(e); api?.scrollPrev(); }}
        ><Chev dir="l" /></button>
        <button
          type="button" className={card ? 'carr' : 'marr'} aria-label="next"
          style={{ ...btnReset, right: card ? 8 : 10, zIndex: 3, opacity: card && keyArrow === 'next' ? 1 : undefined }}
          onFocus={focusArrow('next')} onBlur={() => setKeyArrow(null)}
          onClick={e => { stop(e); api?.scrollNext(); }}
        ><Chev dir="r" /></button>
        {/* card dots only show the state, the modal dots jump to a slide */}
        <span aria-hidden={card || undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: card ? 8 : 10, display: 'flex', justifyContent: 'center', gap: card ? 5 : 6, zIndex: 3 }}>
          {media.map((_, i) => {
            const dot: React.CSSProperties = { width: card ? 6 : 7, height: card ? 6 : 7, borderRadius: 99, background: i === sel ? '#f3f3f3' : 'rgba(255,255,255,.35)', transform: i === sel ? 'scale(1.25)' : 'scale(1)', transition: 'background .25s ease, transform .25s var(--ease)' };
            return card ? <span key={i} style={dot} /> : (
              <button
                key={i} type="button" aria-label={`go to slide ${i + 1}`}
                style={{ ...btnReset, ...dot, border: 0 }}
                onClick={e => { stop(e); api?.scrollTo(i); }}
              />
            );
          })}
        </span>
      </>}
    </Carousel>
  );
}
