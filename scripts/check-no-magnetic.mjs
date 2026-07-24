import fs from 'node:fs';

const page = fs.readFileSync('app/page.tsx', 'utf8');

if (/\bmag(?:Move|Leave|Down|Up|Reset)?\b/.test(page) || /\{\.\.\.mag\}/.test(page)) {
  throw new Error('magnetic button behavior is still present');
}

console.log('magnetic button check passed');
