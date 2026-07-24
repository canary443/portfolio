'use client';
// pixel trail cursor: the original reactbits PixelTrail (webgl/r3f), lazy loaded.
// mounted full screen behind clicks; the site only mounts it on a fine pointer
// with motion on.

import dynamic from 'next/dynamic';

const PixelTrail = dynamic(() => import('@/components/PixelTrail'), { ssr: false });

export default function PixelTrailCursor() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }} aria-hidden>
      <PixelTrail gridSize={50} trailSize={0.1} maxAge={250} interpolate={5} color="#f3f3f3" />
    </div>
  );
}
