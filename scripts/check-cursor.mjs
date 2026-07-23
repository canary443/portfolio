import fs from 'node:fs';

const css = fs.readFileSync('app/globals.css', 'utf8');
const page = fs.readFileSync('app/page.tsx', 'utf8');

if (!/\.site-page\[data-custom-cursor="true"\] \* \{ cursor: none !important; \}/.test(css)) {
  throw new Error('cursor hiding is not scoped to the main site');
}
if (!/className="site-page"/.test(page) || !/data-custom-cursor=\{customCursor \? 'true' : undefined\}/.test(page)) {
  throw new Error('main page does not opt into the custom cursor');
}
if (!/if \(!customCursor\) return;/.test(page) || !/setCustomCursor\(!isSafari && fine\.current && !reduced\.current\)/.test(page)) {
  throw new Error('custom cursor is not disabled for Safari');
}

console.log('cursor regression check passed');
