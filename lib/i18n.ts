// ui strings, en + ru

export type Lang = 'en' | 'ru';

export const T = {
  en: {
    navS: 'Services', navP: 'Projects', navC: 'Contact', chat: "Let's chat",
    heroT: 'Full stack development. Sites, bots and automation.',
    heroSub: 'One developer, end to end: from idea to deployed product.',
    start: 'Start now', view: 'View work',
    svcH: 'What I do.', projH: 'Selected work.', aboutH: 'About',
    based: 'based in Germany', faqH: 'Questions.',
    ctH: 'Got an idea? Write me.', ctSub: 'Reply within a day, usually faster.',
    dm: 'or just dm', madeFor: 'made for ', photoSoon: 'NO PIC', team: 'TEAM PROJECT',
    copied: 'copied', open: 'Open project', close: 'Close',
    feat: '// PROJECTS I WAS PART OF', chlog: 'CHANGELOG'
  },
  ru: {
    navS: 'Услуги', navP: 'Проекты', navC: 'Контакты', chat: 'Написать',
    heroT: 'Фулстек-разработка: сайты, боты, автоматизация.',
    heroSub: 'Один человек на весь проект: от идеи до рабочего продукта.',
    start: 'Обсудить проект', view: 'Посмотреть работы',
    svcH: 'Чем занимаюсь.', projH: 'Что уже сделал.', aboutH: 'Обо мне',
    based: 'живу в Германии', faqH: 'Частые вопросы.',
    ctH: 'Есть идея? Напиши.', ctSub: 'Отвечаю в течение дня, чаще быстрее.',
    dm: 'или просто в лс', madeFor: '', photoSoon: 'NO PIC', team: 'В КОМАНДЕ',
    copied: 'скопировано', open: 'Открыть проект', close: 'Закрыть',
    feat: '// ПРОЕКТЫ, В КОТОРЫХ УЧАСТВОВАЛ', chlog: 'ИЗМЕНЕНИЯ'
  }
} as const;

export type Dict = (typeof T)['en'];
