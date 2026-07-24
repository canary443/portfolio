'use client';
// soft morphing blurred shape that reacts to the pointer. sits behind a
// heading as a subtle glow. lazy loaded, mounted only on capable devices.

import dynamic from 'next/dynamic';

const ShapeBlur = dynamic(() => import('@/components/ShapeBlur'), { ssr: false });

export default function ShapeBlurFx({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity }} aria-hidden>
      <ShapeBlur variation={0} shapeSize={1.1} roundness={0.5} borderSize={0.04} circleSize={0.35} circleEdge={0.6} />
    </div>
  );
}
