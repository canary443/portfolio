'use client';
// hero webgl background. lazy loaded so three/ogl stay out of the first paint.
// the site only mounts this on capable devices, the plain image is the fallback.
// a color preset (mono, lava, ocean, ...) tints whichever background is active.

import dynamic from 'next/dynamic';
import type { HeroBg } from '@/lib/data';
import { HERO_PRESETS } from '@/lib/data';
import { hexToRgb01 } from '@/lib/fx';

const PixelBlast = dynamic(() => import('@/components/PixelBlast'), { ssr: false });
const Dither = dynamic(() => import('@/components/Dither'), { ssr: false });
const Threads = dynamic(() => import('@/components/Threads'), { ssr: false });
const LiquidChrome = dynamic(() => import('@/components/LiquidChrome'), { ssr: false });

export default function HeroFx({ bg, preset = 'mono' }: { bg: HeroBg; preset?: string }) {
  const isMono = preset === 'mono';
  const color = (HERO_PRESETS.find(p => p.id === preset) || HERO_PRESETS[0]).color;
  const rgb = hexToRgb01(color);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      <div style={{ position: 'absolute', inset: 0 }}>
        {bg === 'pixel-blast' && (
          <PixelBlast variant="circle" color={color} pixelSize={5} patternScale={3} patternDensity={1.1} speed={0.5} edgeFade={0.28} transparent />
        )}
        {bg === 'dither' && (
          // mono keeps a very dark wave; colored presets use the preset hue
          <Dither waveColor={isMono ? [0.11, 0.11, 0.15] : rgb} waveSpeed={0.03} waveFrequency={3.2} waveAmplitude={0.3} colorNum={4} pixelSize={2} enableMouseInteraction mouseRadius={0.7} />
        )}
        {bg === 'threads' && (
          <Threads color={isMono ? [0.42, 0.42, 0.42] : rgb} amplitude={1.1} distance={0.1} enableMouseInteraction />
        )}
        {bg === 'liquid-chrome' && (
          <LiquidChrome baseColor={isMono ? [0.06, 0.06, 0.07] : [rgb[0] * 0.5, rgb[1] * 0.5, rgb[2] * 0.5]} speed={0.14} amplitude={0.42} frequencyX={2.6} frequencyY={2} interactive />
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
