import type { Config } from 'tailwindcss';

// tailwind is only used by the shadcn / animate-ui components.
// preflight is off so it never resets the hand-styled site.
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: []
};

export default config;
