'use client';
// scroll reveal for cards: rise + fade + soft blur on a spring.
// adapted from the animate-ui effect primitives (slide + fade), but
// controlled from outside so the page's own observer can stagger
// cards that enter the viewport together

import * as React from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'motion/react';

type RevealProps = {
  children?: React.ReactNode;
  // true once the element should be visible
  on?: boolean;
  // extra wait in ms, used to stagger a row of cards
  delay?: number;
  // fade only: reduced motion or no observer support
  soft?: boolean;
} & HTMLMotionProps<'div'>;

function Reveal({ on = false, delay = 0, soft = false, ...props }: RevealProps) {
  const d = delay / 1000;
  // small bounce reads as a settle, not a wobble
  const spring = { type: 'spring' as const, duration: 0.55, bounce: 0.18, delay: d };
  const variants: Variants = {
    hidden: soft
      ? { opacity: 0, y: 0, scale: 1, filter: 'none' }
      : { opacity: 0, y: 26, scale: 0.98, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: soft
        ? { duration: 0.3, ease: 'easeOut' }
        : {
            y: spring,
            scale: spring,
            opacity: { duration: 0.4, ease: 'easeOut', delay: d },
            filter: { duration: 0.45, ease: 'easeOut', delay: d },
          },
      // drop the no-op filter so the layer does not stick around
      transitionEnd: { filter: 'none' },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate={on ? 'visible' : 'hidden'}
      variants={variants}
      {...props}
    />
  );
}

export { Reveal, type RevealProps };
