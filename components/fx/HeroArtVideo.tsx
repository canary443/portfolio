'use client';
// hero art video: it plays through once with sound, then loops muted like a
// gif.
// browsers refuse to start a video with sound until the visitor has clicked or
// typed somewhere on the page - that is a browser rule, not a setting we own.
// so when the start is refused the video runs as a silent loop, and the first
// real gesture restarts it from frame one with the sound on. that way the sound
// pass is always heard whole, never from the middle.
// the spec does not list scrolling as permission, but chrome does let a wheel
// or touch scroll through, so a scroll gets a few careful tries too. the sound
// only stays on when the browser really accepted it: a refusal drops straight
// back to the silent loop, the picture never jumps and never stalls.

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
    // one pass with sound, always from the first frame. the time is only
    // rewound once the browser has really accepted the sound, so a refused
    // try never makes the picture jump
    const loud = () => {
      const el = vid.current;
      if (!el || done.current) return;
      el.muted = false;
      el.play().then(() => {
        done.current = true;
        el.loop = false;
        el.currentTime = 0;
        el.play().catch(loop);
        drop();
      }).catch(loop);
    };

    // gestures that really do unlock sound
    const HARD = ['pointerdown', 'touchend', 'keydown', 'click'];
    // scrolling: not permission, but worth a few tries
    const SOFT = ['wheel', 'touchmove', 'scroll'];
    let tries = 0;
    let last = 0;
    const onScroll = () => {
      if (done.current || tries >= 4) return;
      // one try per scroll burst, so a refusal can not stutter the loop
      const now = performance.now();
      if (now - last < 900) return;
      last = now;
      tries++;
      loud();
    };
    const drop = () => {
      HARD.forEach(t => window.removeEventListener(t, loud, true));
      SOFT.forEach(t => window.removeEventListener(t, onScroll, true));
    };
    const wake = () => {
      // capture, so the sound comes on with the very first interaction
      HARD.forEach(t => window.addEventListener(t, loud, { capture: true }));
      SOFT.forEach(t => window.addEventListener(t, onScroll, { capture: true, passive: true }));
    };

    if (!sound) { loop(); return drop; }

    v.muted = false;
    v.loop = false;
    v.play().then(() => { done.current = true; }).catch(() => {
      // sound refused for now: run as a gif until a gesture unlocks it
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
