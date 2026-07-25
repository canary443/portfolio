import fs from 'node:fs';

// markup lives in app/site.tsx, app/page.tsx is only a server wrapper
const css = fs.readFileSync('app/globals.css', 'utf8');
const site = fs.readFileSync('app/site.tsx', 'utf8');

if (!/\.site-page\[data-custom-cursor="true"\] \* \{ cursor: none !important; \}/.test(css)) {
  throw new Error('cursor hiding is not scoped to the main site');
}
if (!/className="site-page"/.test(site) || !/data-custom-cursor=\{dotOn \? 'true' : undefined\}/.test(site)) {
  throw new Error('site markup does not opt into the dot cursor');
}
if (!/const dotOn = cursorStyle === 'dot' && customCursor;/.test(site)) {
  throw new Error('the dot cursor flag is gone');
}
if (!/if \(!dotOn\) return;/.test(site) || !/setCustomCursor\(!isSafari && fine\.current && !reduced\.current\)/.test(site)) {
  throw new Error('custom cursor is not disabled for Safari');
}

console.log('cursor regression check passed');
