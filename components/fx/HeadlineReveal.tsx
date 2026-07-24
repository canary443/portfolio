'use client';
// hero headline reveal: words rise and un-blur with a short stagger.
// uses motion (already a dependency), no gsap. the site only renders this
// when motion is allowed, otherwise it shows the plain headline.

import { motion, type Variants } from 'motion/react';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } }
};
// ease-out curve, blur masks the entrance so words feel like one motion
const word: Variants = {
  hidden: { opacity: 0, y: '0.4em', filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } }
};

export default function HeadlineReveal({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <motion.span variants={container} initial="hidden" animate="show" style={{ display: 'inline' }}>
      {words.map((w, i) => (
        <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
          <motion.span variants={word} style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}>
            {w}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </motion.span>
  );
}
