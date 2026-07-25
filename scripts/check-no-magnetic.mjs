import fs from 'node:fs';

// markup lives in app/site.tsx, app/page.tsx is only a server wrapper
const site = fs.readFileSync('app/site.tsx', 'utf8');

if (!/className="site-page"/.test(site)) {
  throw new Error('site markup not found, this check reads the wrong file');
}
if (/\bmag(?:Move|Leave|Down|Up|Reset)?\b/.test(site) || /\{\.\.\.mag\}/.test(site)) {
  throw new Error('magnetic button behavior is still present');
}

console.log('magnetic button check passed');
