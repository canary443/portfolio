'use client';
// target cursor: 4 corners that lock onto links, buttons and cards.
// lazy loaded so gsap stays out of the first paint. it hides the native cursor
// itself. the site only mounts this on a fine pointer with motion on.

import dynamic from 'next/dynamic';

const TargetCursor = dynamic(() => import('@/components/TargetCursor'), { ssr: false });

export default function TargetCursorFx() {
  return <TargetCursor targetSelector="a, button, [data-card]" spinDuration={2} hideDefaultCursor />;
}
