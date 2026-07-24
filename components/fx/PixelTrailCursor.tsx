'use client';
// pixelated cursor trail: fading squares snapped to a grid, retro digital feel.
// hand rolled on a 2d canvas (no webgl) so it stays light and works on safari.

import { useEffect, useRef } from 'react';

const CELL = 12; // grid size in css px
const LIFE = 520; // ms a square stays visible

interface Dot { x: number; y: number; t: number }

export default function PixelTrailCursor({ color = '243,243,243' }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const dots: Dot[] = [];
    let lastCx = -1, lastCy = -1, raf = 0, running = false;

    const draw = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, w, h);
      for (let i = dots.length - 1; i >= 0; i--) {
        const age = (now - dots[i].t) / LIFE;
        if (age >= 1) { dots.splice(i, 1); continue; }
        const a = (1 - age) * 0.55;
        ctx.fillStyle = `rgba(${color},${a})`;
        ctx.fillRect(dots[i].x, dots[i].y, CELL - 2, CELL - 2);
      }
      if (dots.length) { raf = requestAnimationFrame(draw); }
      else { running = false; }
    };
    const wake = () => { if (!running) { running = true; raf = requestAnimationFrame(draw); } };

    const onMove = (e: MouseEvent) => {
      const cx = Math.floor(e.clientX / CELL);
      const cy = Math.floor(e.clientY / CELL);
      if (cx === lastCx && cy === lastCy) return;
      lastCx = cx; lastCy = cy;
      dots.push({ x: cx * CELL, y: cy * CELL, t: performance.now() });
      if (dots.length > 260) dots.shift();
      wake();
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9998 }}
    />
  );
}
