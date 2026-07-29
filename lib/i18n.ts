// ui strings, en + ru

export type Lang = 'en' | 'ru';

export const T = {
  en: {
    svcH: 'What I do.', projH: 'Selected work.', aboutH: 'About',
    based: 'based in Germany',
    photoSoon: 'NO PIC', team: 'TEAM PROJECT',
    open: 'Open project', close: 'Close', chlog: 'CHANGELOG'
  },
  ru: {
    svcH: 'Чем занимаюсь.', projH: 'Что уже сделал.', aboutH: 'Обо мне',
    based: 'живу в Германии',
    photoSoon: 'NO PIC', team: 'В КОМАНДЕ',
    open: 'Открыть проект', close: 'Закрыть', chlog: 'ИЗМЕНЕНИЯ'
  }
} as const;

export type Dict = (typeof T)['en'];
