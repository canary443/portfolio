// llms.txt: the whole site as plain text, for assistants that read a page
// instead of rendering it. built from the same content the page shows, so it
// can not drift. english only, like the rest of the machine readable metadata.
import { DEFAULTS } from '@/lib/data';
import { readContent } from '@/lib/content';

const SITE = 'https://aimwork.space';

// an hour of staleness is fine here, and it keeps the blob read off every hit
export const revalidate = 3600;

export async function GET() {
  const d = (await readContent()) || DEFAULTS;
  const lines: string[] = [
    '# AimworkSpace',
    '',
    '> Personal page of a full stack developer. Sites, Telegram bots and automation.',
    '',
    `- Site: ${SITE}`,
    `- Telegram: https://t.me/${d.telegram}`,
    `- GitHub: https://github.com/${d.github}`,
    `- Email: ${d.email}`,
    '- Languages: English, Russian',
    '',
    '## About',
    '',
    d.about,
    ''
  ];

  // the admin can hide the services block, so only list it when it is shown
  if (d.showServices !== false && d.services.length) {
    lines.push('## Services', '');
    d.services.forEach(s => lines.push(`- ${s.title}: ${s.desc}`));
    lines.push('');
  }

  if (d.works.length) {
    lines.push('## Work', '');
    d.works.forEach(w => lines.push(`- ${w.title}${w.date ? ` (${w.date})` : ''}: ${w.desc}`));
    lines.push('');
  }

  if (d.projects.length) {
    lines.push('## Team projects', '');
    d.projects.forEach(p => lines.push(`- ${p.name}, ${p.role}, ${p.from} to ${p.to}`));
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
