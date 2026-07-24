'use client';
// soft morphing blurred shape that reacts to the pointer. sits behind a
// heading as a subtle glow. lazy loaded, mounted only on capable devices.

import dynamic from 'next/dynamic';

const ShapeBlur = dynamic(() => import('@/components/ShapeBlur'), { ssr: false });

// sits as a soft glow behind a heading. constrained to a centered box so it
// hugs the text area instead of spilling to the section edges.
export default function ShapeBlurFx({ opacity = 0.45 }: { opacity?: number }) {
  return (
    <div
      style={{ position: 'absolute', left: '50%', top: '44%', transform: 'translate(-50%,-50%)', width: 'min(90%,460px)', height: 240, zIndex: 0, pointerEvents: 'none', opacity }}
      aria-hidden
    >
      <ShapeBlur variation={0} shapeSize={0.9} roundness={0.5} borderSize={0.04} circleSize={0.3} circleEdge={0.5} />
    </div>
  );
}
