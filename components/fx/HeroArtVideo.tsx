'use client';
// hero art video: it plays through once with sound, then loops muted like a
// gif. browsers only allow sound after the visitor has done something on the
// page, so a blocked start plays silent right away and the sound is armed to
// the first click, key or touch. after the first pass the video stays silent.

import { useCallback, useEffect, useRef, useState } from 'react';

// small speaker with a slash, shown while the video can still make noise
const MUTE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M23 9l-6 6M17 9l6 6" />
  </svg>
);

interface Props {
  src: string;
  // admin switch. off means it is a silent loop from the very first frame
  sound: boolean;
  // false under prefers-reduced-motion: nothing plays, the first frame stays
  motionOk: boolean;
  style: React.CSSProperties;
  zoom: number;
  // the page moves this element for the parallax
  hold: (el: HTMLElement | null) => void;
  // label for the mute button, comes from the site dictionary
  muteLabel: string;
}

export default function HeroArtVideo({ src, sound, motionOk, style, zoom, hold, muteLabel }: Props) {
  const vid = useRef<HTMLVideoElement | null>(null);
  // the mute button is only there while the sound pass is really audible
  const [loud, setLoud] = useState(false);
  // no more sound: the pass ended, or the visitor turned it off
  const quiet = useRef(!sound || !motionOk);

  const attach = useCallback((el: HTMLVideoElement | null) => {
    vid.current = el;
    hold(el);
  }, [hold]);

  useEffect(() => {
    const v = vid.current;
    if (!v || !motionOk) return;
    quiet.current = !sound;
    setLoud(false);

    const unmute = () => {
      const el = vid.current;
      if (!el || quiet.current) return;
      el.muted = false;
      setLoud(true);
    };
    const arm = () => {
      window.addEventListener('pointerdown', unmute, { once: true, passive: true });
      window.addEventListener('keydown', unmute, { once: true });
    };
    const drop = () => {
      window.removeEventListener('pointerdown', unmute);
      window.removeEventListener('keydown', unmute);
    };

    if (!sound) {
      // plain gif behaviour
      v.muted = true;
      v.loop = true;
      v.play().catch(() => {});
      return drop;
    }

    v.loop = false;
    v.muted = false;
    v.play().then(() => setLoud(true)).catch(() => {
      // sound is not allowed yet: run silent and wait for a real gesture
      v.muted = true;
      v.play().catch(() => {});
      arm();
    });
    return drop;
  }, [src, sound, motionOk]);

  // first pass is over, silent loop from here on
  const toLoop = () => {
    quiet.current = true;
    setLoud(false);
    const v = vid.current;
    if (!v) return;
    v.muted = true;
    v.loop = true;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  // the visitor wants it silent now. the loop still starts when the pass ends
  const silence = () => {
    quiet.current = true;
    setLoud(false);
    if (vid.current) vid.current.muted = true;
  };

  return (
    <>
      <video
        key={src} ref={attach} data-zoom={zoom} src={src}
        playsInline preload="metadata" autoPlay={motionOk}
        muted={!sound || !motionOk}
        onEnded={motionOk ? toLoop : undefined}
        style={style}
      />
      {loud && (
        <button
          type="button" className="bare" onClick={silence} aria-label={muteLabel} title={muteLabel}
          style={{
            position: 'absolute', right: 16, bottom: 16, zIndex: 3,
            width: 32, height: 32, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#f3f3f3', background: 'rgba(10,10,10,.6)',
            border: '1px solid rgba(255,255,255,.14)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            transition: 'transform .15s var(--ease), background .15s ease'
          }}
        >{MUTE_ICON}</button>
      )}
    </>
  );
}
