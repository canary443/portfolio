'use client';
// hero art video: it plays through once with sound, then loops muted like a
// gif.
// browsers refuse to start a video with sound until the visitor has clicked or
// typed somewhere on the page - that is a browser rule, not a setting we own.
// so when the start is refused the video runs as a silent loop, and the first
// click, key or touch restarts it from frame one with the sound on. that way
// the sound pass is always heard whole, never from the middle.

import { useCallback, useEffect, useRef } from 'react';

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
}

export default function HeroArtVideo({ src, sound, motionOk, style, zoom, hold }: Props) {
  const vid = useRef<HTMLVideoElement | null>(null);
  // the one loud pass is done (or was never wanted)
  const done = useRef(!sound || !motionOk);

  const attach = useCallback((el: HTMLVideoElement | null) => {
    vid.current = el;
    hold(el);
  }, [hold]);

  useEffect(() => {
    const v = vid.current;
    if (!v || !motionOk) return;
    done.current = !sound;

    // silent loop, the way a gif behaves
    const loop = () => {
      const el = vid.current;
      if (!el) return;
      el.muted = true;
      el.loop = true;
      el.play().catch(() => {});
    };
    // one pass with sound, always from the first frame
    const loud = () => {
      const el = vid.current;
      if (!el || done.current) return;
      done.current = true;
      el.muted = false;
      el.loop = false;
      el.currentTime = 0;
      el.play().catch(loop);
    };
    const drop = () => {
      ['pointerdown', 'touchend', 'keydown', 'click'].forEach(t =>
        window.removeEventListener(t, loud, true)
      );
    };
    const wake = () => {
      // capture, so the sound comes on with the very first interaction
      ['pointerdown', 'touchend', 'keydown', 'click'].forEach(t =>
        window.addEventListener(t, loud, { capture: true, once: true })
      );
    };

    if (!sound) { loop(); return drop; }

    v.muted = false;
    v.loop = false;
    v.play().catch(() => {
      // sound refused for now: run as a gif until the first real gesture
      done.current = false;
      loop();
      wake();
    });
    return drop;
  }, [src, sound, motionOk]);

  // the loud pass is over: silent from here on
  const toLoop = () => {
    const v = vid.current;
    done.current = true;
    if (!v) return;
    v.muted = true;
    v.loop = true;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  return (
    <video
      key={src} ref={attach} data-zoom={zoom} src={src}
      playsInline preload="metadata" autoPlay={motionOk}
      muted={!sound || !motionOk}
      onEnded={motionOk ? toLoop : undefined}
      style={style}
    />
  );
}
