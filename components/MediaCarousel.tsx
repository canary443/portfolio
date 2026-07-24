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
  // top corners of the modal media
  radius?: string;
}

const mediaStyle = (mode: 'card' | 'modal', radius?: string): React.CSSProperties =>
  mode === 'card'
    ? { width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }
    : { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', borderRadius: radius, background: '#000' };

export default function MediaCarousel({ media, mode, motionOk = true, startIndex = 0, onIndex, radius }: MediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [sel, setSel] = useState(startIndex);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;
  const many = media.length > 1;
  const card = mode === 'card';

  // only the visible slide's video plays, the rest stay paused
  useEffect(() => {
    if (!api) return;
    const sync = () => {
      const i = api.selectedScrollSnap();
      setSel(i);
      onIndexRef.current?.(i);
      api.slideNodes().forEach((node, ni) => {
        node.querySelectorAll('video').forEach(v => {
          if (ni === i) { v.muted = true; v.play().catch(() => {}); }
          else v.pause();
        });
      });
    };
    sync();
    api.on('select', sync);
    api.on('reInit', sync);
    return () => { api.off('select', sync); api.off('reInit', sync); };
  }, [api]);

  // cards auto advance photo slides every 5s. video slides wait for onEnded
  useEffect(() => {
    if (!card || !many || !motionOk || !api) return;
    const iv = setInterval(() => {
      if (media[api.selectedScrollSnap()]?.kind === 'img') api.scrollNext();
    }, 5000);
    return () => clearInterval(iv);
  }, [api, card, many, motionOk, media]);

  // arrows live inside the card link: keep clicks away from the modal
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };

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
              <video
                src={m.src} muted playsInline preload="none"
                loop={!card || !many}
                onEnded={card && many ? () => api?.scrollNext() : undefined}
                style={mediaStyle(mode, radius)}
              />
            ) : (
              <img src={m.src} loading="lazy" alt="" draggable={false} style={mediaStyle(mode, radius)} />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      {many && <>
        <span className={card ? 'carr' : 'marr'} role="button" aria-label="previous" style={{ left: card ? 8 : 10, zIndex: 3, cursor: 'pointer' }} onClick={e => { stop(e); api?.scrollPrev(); }}><Chev dir="l" /></span>
        <span className={card ? 'carr' : 'marr'} role="button" aria-label="next" style={{ right: card ? 8 : 10, zIndex: 3, cursor: 'pointer' }} onClick={e => { stop(e); api?.scrollNext(); }}><Chev dir="r" /></span>
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: card ? 8 : 10, display: 'flex', justifyContent: 'center', gap: card ? 5 : 6, zIndex: 3 }}>
          {media.map((_, i) => (
            <span
              key={i}
              onClick={!card ? e => { stop(e); api?.scrollTo(i); } : undefined}
              style={{ width: card ? 6 : 7, height: card ? 6 : 7, borderRadius: 99, cursor: card ? undefined : 'pointer', background: i === sel ? '#f3f3f3' : 'rgba(255,255,255,.35)', transform: i === sel ? 'scale(1.25)' : 'scale(1)', transition: 'background .25s ease, transform .25s var(--ease)' }}
            />
          ))}
        </span>
      </>}
    </Carousel>
  );
}
