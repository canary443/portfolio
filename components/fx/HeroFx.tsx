'use client';
// hero background layer. webgl ones are lazy loaded so three/ogl stay out of
// the first paint, and the site only mounts them on capable devices. the 'gif'
// mode is a plain uploaded gif or video, so it runs everywhere.
// a color preset (mono, lava, ocean, ...) tints whichever background is active.

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { HeroBg } from '@/lib/data';
import { HERO_PRESETS } from '@/lib/data';
import { hexToRgb01 } from '@/lib/fx';
import { isVideoSrc } from '@/lib/img';

const PixelBlast = dynamic(() => import('@/components/PixelBlast'), { ssr: false });
const Dither = dynamic(() => import('@/components/Dither'), { ssr: false });
const Threads = dynamic(() => import('@/components/Threads'), { ssr: false });
const LiquidChrome = dynamic(() => import('@/components/LiquidChrome'), { ssr: false });

const EASE = 'cubic-bezier(.22,1,.36,1)';

// uploaded gif / video behind the hero. it fades in when the file is decoded,
// so a slow gif never pops in. less motion gets the still frame instead
function GifBg({ src, poster, opacity, motionOk }: { src: string; poster?: string | null; opacity: number; motionOk: boolean }) {
  const [ready, setReady] = useState(false);
  const still = poster && !motionOk ? poster : null;
  const video = !still && isVideoSrc(src);
  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    opacity: ready ? opacity : 0,
    transition: `opacity .5s ${EASE}`
  };
  return video ? (
    <video
      src={src} muted playsInline preload="metadata"
      autoPlay={motionOk} loop={motionOk}
      onLoadedData={() => setReady(true)}
      style={style}
    />
  ) : (
    <img src={still || src} alt="" fetchPriority="high" onLoad={() => setReady(true)} style={style} />
  );
}

export default function HeroFx({ bg, preset = 'mono', gif, gifPoster, gifOpacity = 100, motionOk = true }: {
  bg: HeroBg;
  preset?: string;
  gif?: string | null;
  gifPoster?: string | null;
  gifOpacity?: number;
  motionOk?: boolean;
}) {
  const isMono = preset === 'mono';
  const color = (HERO_PRESETS.find(p => p.id === preset) || HERO_PRESETS[0]).color;
  // hold the color arrays steady: the site re-renders often, and a fresh array
  // would look like a new prop to the webgl layers
  const rgb = useMemo(() => hexToRgb01(color), [color]);
  const ditherColor = useMemo<[number, number, number]>(
    () => (isMono ? [0.11, 0.11, 0.15] : rgb),
    [isMono, rgb]
  );
  const threadsColor = useMemo<[number, number, number]>(
    () => (isMono ? [0.42, 0.42, 0.42] : rgb),
    [isMono, rgb]
  );
  const chromeColor = useMemo<[number, number, number]>(
    () => (isMono ? [0.06, 0.06, 0.07] : [rgb[0] * 0.5, rgb[1] * 0.5, rgb[2] * 0.5]),
    [isMono, rgb]
  );

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      <div style={{ position: 'absolute', inset: 0 }}>
        {bg === 'gif' && !!gif && (
          <GifBg src={gif} poster={gifPoster} opacity={Math.max(10, Math.min(100, gifOpacity)) / 100} motionOk={motionOk} />
        )}
        {bg === 'pixel-blast' && (
          <PixelBlast variant="circle" color={color} pixelSize={5} patternScale={3} patternDensity={1.1} speed={0.5} edgeFade={0.28} transparent />
        )}
        {bg === 'dither' && (
          // mono keeps a very dark wave; colored presets use the preset hue
          <Dither waveColor={ditherColor} waveSpeed={0.03} waveFrequency={3.2} waveAmplitude={0.3} colorNum={4} pixelSize={2} enableMouseInteraction mouseRadius={0.7} />
        )}
        {bg === 'threads' && (
          <Threads color={threadsColor} amplitude={1.1} distance={0.1} enableMouseInteraction />
        )}
        {bg === 'liquid-chrome' && (
          <LiquidChrome baseColor={chromeColor} speed={0.14} amplitude={0.42} frequencyX={2.6} frequencyY={2} interactive />
        )}
      </div>
      {/* scrim: keep the headline readable over a busy background. the webgl
          ones are dark by design, an uploaded gif can be anything - so gif mode
          also veils the middle, where the headline sits */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: bg === 'gif'
            ? 'radial-gradient(120% 78% at 50% 32%, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.62) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.08) 34%, rgba(0,0,0,0) 62%)'
            : 'radial-gradient(120% 78% at 50% 32%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.45) 100%), linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%)'
        }}
      />
    </div>
  );
}
