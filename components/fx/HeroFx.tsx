'use client';
// hero webgl background. lazy loaded so three/ogl stay out of the first paint.
// the site only mounts this on capable devices, the plain image is the fallback.

import dynamic from 'next/dynamic';
import type { HeroBg } from '@/lib/data';

const PixelBlast = dynamic(() => import('@/components/PixelBlast'), { ssr: false });
const Threads = dynamic(() => import('@/components/Threads'), { ssr: false });
const LiquidChrome = dynamic(() => import('@/components/LiquidChrome'), { ssr: false });

export default function HeroFx({ bg }: { bg: HeroBg }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      <div style={{ position: 'absolute', inset: 0 }}>
        {bg === 'pixel-blast' && (
          <PixelBlast
            variant="circle"
            color="#8f8f8f"
            pixelSize={5}
            patternScale={3}
            patternDensity={1.1}
            speed={0.5}
            edgeFade={0.28}
            transparent
          />
        )}
        {bg === 'threads' && (
          <Threads color={[0.42, 0.42, 0.42]} amplitude={1.1} distance={0.1} enableMouseInteraction />
        )}
        {bg === 'liquid-chrome' && (
          <LiquidChrome baseColor={[0.06, 0.06, 0.07]} speed={0.14} amplitude={0.42} frequencyX={2.6} frequencyY={2} interactive />
        )}
      </div>
      {/* scrim: keep the headline readable over a busy background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 78% at 50% 32%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.45) 100%), linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%)'
        }}
      />
    </div>
  );
}
