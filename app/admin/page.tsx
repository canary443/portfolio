'use client';
// admin panel, ported from the design prototype

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadData, saveData, resetData, loadRemote, saveRemote, DEFAULTS,
  SiteData, Service, Work, TeamProject, LogEntry, CursorStyle, RuFont
} from '@/lib/data';
import { shrinkImage, dataUrlKb, uploadMedia, fileToDataUrl, importUrl, inStorage } from '@/lib/img';
import { T, type Dict } from '@/lib/i18n';

// interface strings editable in the i18n section (key -> friendly label)
const I18N_FIELDS: [keyof Dict, string][] = [
  ['svcH', 'Services heading'], ['projH', 'Projects heading'],
  ['aboutH', 'About heading'], ['based', 'About: location chip'], ['chlog', 'Changelog label'],
  ['team', 'Badge: team project'], ['photoSoon', 'Placeholder: no pic'],
  ['open', 'Modal: open button'], ['close', 'Modal: close button']
];

// effect controls, rendered in the settings page
type FxKey = 'fxGradualBlur' | 'fxCardTilt';
const CURSOR_OPTS: [CursorStyle, string][] = [['dot', 'Dot'], ['pixel-trail', 'Pixel trail'], ['target', 'Target'], ['native', 'Native']];
// whole page blocks the owner can switch off
type SectionKey = 'showServices' | 'showStack';
const SECTION_TOGGLES: [SectionKey, string, string][] = [
  ['showServices', 'Services block', 'the "what I do" cards. off also removes the nav link'],
  ['showStack', 'Tech stack strip', 'the moving row of language and tool logos']
];
const FX_TOGGLES: [FxKey, string, boolean][] = [
  ['fxGradualBlur', 'Gradual blur seams', true],
  ['fxCardTilt', 'Project card tilt', false]
];

// aspect choices for the about media; auto keeps the natural ratio
const ABOUT_ASPECTS: [string, string][] = [['16/9', '16:9'], ['4/3', '4:3'], ['1/1', '1:1'], ['3/4', '3:4'], ['auto', 'Auto']];
// cyrillic font options; the stack matches the one the site applies for ru
const RU_FONT_OPTS: [RuFont, string, string][] = [
  ['onest', 'Onest', "'Onest', sans-serif"],
  ['carlito', 'Carlito', "'Carlito', sans-serif"],
  ['jost', 'Jost', "'Jost', sans-serif"]
];

type Sec = 'about' | 'services' | 'works' | 'projects' | 'settings' | 'i18n' | 'preview';
type Form = Record<string, string>;

const NAV: [Sec, string][] = [
  ['about', 'About'], ['services', 'Services'], ['works', 'Work'],
  ['projects', 'Team projects'], ['settings', 'Settings'],
  ['i18n', 'Interface text'], ['preview', 'Live preview']
];

// which SiteData keys each page owns, for json export / import
const SECTION_KEYS: Partial<Record<Sec, (keyof SiteData)[]>> = {
  about: ['about', 'aboutRu', 'aboutImg', 'aboutImgW', 'aboutImgAspect', 'aboutShowBased', 'aboutShowFlag'],
  services: ['services'],
  works: ['works'],
  projects: ['projects'],
  settings: ['telegram', 'github', 'email', 'showServices', 'showStack', 'cursorStyle', 'fxGradualBlur', 'fxCardTilt', 'fontRu'],
  i18n: ['i18n', 'i18nFontRu']
};
// every key some page owns; a whole-site import restores all of them
const ALL_KEYS = Array.from(new Set(Object.values(SECTION_KEYS).flatMap(v => v || [])));

// walk the content and collect inline media (data urls), same file only once
function collectInline(v: unknown, out: Set<string>) {
  if (typeof v === 'string') { if (v.startsWith('data:')) out.add(v); return; }
  if (Array.isArray(v)) { for (const x of v) collectInline(x, out); return; }
  if (v && typeof v === 'object') for (const x of Object.values(v)) collectInline(x, out);
}
// same walk, but swaps every moved data url for its storage link
function swapInline<T>(v: T, map: Map<string, string>): T {
  if (typeof v === 'string') return (map.get(v) ?? v) as T;
  if (Array.isArray(v)) return v.map(x => swapInline(x, map)) as T;
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = swapInline(x, map);
    return o as T;
  }
  return v;
}
// what a save really changed, next to the data it was built from. a stale
// full object must not push old values over what another save just wrote.
// keys are compared by reference, so always build a new array or object for a
// list you change (every caller spreads or filters) - editing one in place
// would look unchanged here and the save would drop it
function changedKeys(base: SiteData, next: SiteData): Partial<SiteData> {
  const p: Record<string, unknown> = {};
  for (const k of Object.keys(next) as (keyof SiteData)[]) if (next[k] !== base[k]) p[k] = next[k];
  return p as Partial<SiteData>;
}

export default function Admin() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [data, setData] = useState<SiteData | null>(null);
  const [sec, setSec] = useState<Sec>('about');
  const [form, setForm] = useState<Form>({});
  const [imgs, setImgs] = useState<string[]>([]);
  const [icon, setIcon] = useState<string | null>(null);
  const [video, setVideo] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [wait, setWait] = useState(0);
  const [flash, setFlash] = useState('');
  // errors stay on screen until the next save, a toast is too easy to miss
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  // true while inline media is being moved to storage
  const [moving, setMoving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  // live slider value for the about image width; saved when the drag ends
  const [aboutW, setAboutW] = useState<number | null>(null);

  const flashT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{ list: keyof SiteData; id: string } | null>(null);
  const busy = useRef(false);
  // newest content, so a save never sends the data of an older render
  const dataRef = useRef<SiteData | null>(null);
  // saves run one after another, never two puts at the same time
  const saveQ = useRef<Promise<unknown>>(Promise.resolve());
  const importRef = useRef<HTMLInputElement>(null);
  const importSec = useRef<Sec>('about');
  const aboutImgRef = useRef<HTMLInputElement>(null);

  // defined before the effects so they can call it
  const show = (msg: string) => {
    clearTimeout(flashT.current);
    setFlash(msg);
    flashT.current = setTimeout(() => setFlash(''), 1700);
  };
  // state and ref together, so the next save reads fresh data
  const applyData = (d: SiteData) => { dataRef.current = d; setData(d); };

  useEffect(() => {
    const local = loadData();
    applyData(local);
    setForm({ about: local.about, aboutRu: local.aboutRu || '' });
    (async () => {
      // ask the server if the session cookie is still valid, and pull shared content
      const [remote, ok] = await Promise.all([
        loadRemote(),
        fetch('/api/admin/session').then(r => r.json()).then(j => !!j.ok).catch(() => false)
      ]);
      setAuth(ok);
      if (remote) {
        applyData(remote); saveData(remote);
        setForm({ about: remote.about, aboutRu: remote.aboutRu || '' });
      } else if (ok) {
        // server is still empty: upload what this browser already has, so
        // nothing added before goes away. skip untouched demo content, or a
        // fresh browser would push the demo over real work
        if (JSON.stringify(local) === JSON.stringify(DEFAULTS)) {
          show('server is empty, demo content not uploaded');
        } else {
          const r = await saveRemote(local);
          show(r.ok ? 'content uploaded to the server' : 'upload failed: ' + r.err);
        }
      }
    })();
    return () => clearTimeout(flashT.current);
  }, []);

  // lockout countdown
  useEffect(() => {
    if (wait <= 0) return;
    const iv = setInterval(() => setWait(w => (w > 1 ? w - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, [wait > 0]);

  // keep the live-preview iframe in sync with the current content
  useEffect(() => {
    if (!data) return;
    try { localStorage.setItem('zx_preview', JSON.stringify(data)); } catch {}
  }, [data]);

  // media still inside the content file. base64 eats the 4mb save limit, so
  // the settings page offers to move it to storage
  const inline = useMemo(() => {
    const set = new Set<string>();
    if (data) collectInline(data, set);
    const list = Array.from(set);
    return { list, kb: list.reduce((n, s) => n + dataUrlKb(s), 0) };
  }, [data]);

  if (!data || auth === null) return null;

  const locked = wait > 0;

  // the server copy is the real one. localStorage is only a cache, so a full
  // one must never block a save.
  // a caller passes the whole next object (or an updater). only the keys it
  // changed are merged onto the newest data, and saves wait in a queue, so
  // two fast clicks cannot roll each other back
  const persist = (nd: SiteData | ((cur: SiteData) => SiteData), msg = 'saved'): Promise<boolean> => {
    const base = data;
    const run = async (): Promise<boolean> => {
      const cur = dataRef.current || base;
      const next = typeof nd === 'function' ? nd(cur) : { ...cur, ...changedKeys(base, nd) };
      setErr('');
      setSaving(true);
      const r = await saveRemote(next);
      setSaving(false);
      if (!r.ok) { setErr('not saved: ' + r.err); return false; }
      applyData(next);
      saveData(next); // best effort, a full cache is fine
      show(msg);
      return true;
    };
    const p = saveQ.current.then(run, run);
    saveQ.current = p.catch(() => false);
    return p;
  };
  // move every inline data url to storage, one file at a time, then save once
  const moveMedia = async () => {
    if (moving || !inline.list.length) return;
    setMoving(true);
    setErr('');
    const map = new Map<string, string>();
    let bad = 0;
    for (let i = 0; i < inline.list.length; i++) {
      show('moving ' + (i + 1) + '/' + inline.list.length + '...');
      const url = await uploadMedia(inline.list[i]);
      // still a data url = the upload failed, keep that one inline
      if (url.startsWith('data:')) bad++;
      else map.set(inline.list[i], url);
    }
    if (map.size) await persist(cur => swapInline(cur, map), map.size + ' file(s) moved to storage');
    if (bad) setErr(bad + ' file(s) could not be uploaded, they stay inline');
    setMoving(false);
  };
  // about media: gifs keep their animation (no canvas), photos get shrunk
  const onAboutMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const dataUrl = await shrinkImage(f, 1280, 'image/jpeg', 700);
    if (dataUrlKb(dataUrl) > 4200) { setErr('not saved: file is over ~4mb, compress the gif first'); return; }
    const url = await uploadMedia(dataUrl);
    persist({ ...data, aboutImg: url });
  };
  // save the slider width once the user lets go of it
  const commitAboutW = async () => {
    if (aboutW === null || aboutW === (data.aboutImgW || 252)) { setAboutW(null); return; }
    if (await persist({ ...data, aboutImgW: aboutW })) setAboutW(null);
  };
  const F = (k: string) => form[k] || '';
  const onF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const clearForm = () => { setForm({}); setImgs([]); setIcon(null); setVideo(''); setLogs([]); setEditId(null); };

  // build the i18n overrides from the form, keeping only non-empty values so
  // untouched strings keep falling back to the built-in defaults
  const saveI18n = () => {
    const pick = (p: 'en' | 'ru') => {
      const o: Record<string, string> = {};
      I18N_FIELDS.forEach(([key]) => { const v = F(p + '_' + String(key)).trim(); if (v) o[String(key)] = v; });
      return o;
    };
    const en = pick('en'), ru = pick('ru');
    const i18n: NonNullable<SiteData['i18n']> = {};
    if (Object.keys(en).length) i18n.en = en as Partial<Dict>;
    if (Object.keys(ru).length) i18n.ru = ru as Partial<Dict>;
    persist({ ...data, i18n });
  };

  // json export / import per page
  const downloadJson = (name: string, obj: unknown) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };
  const exportSection = (s: Sec) => {
    const keys = SECTION_KEYS[s];
    if (!keys) return;
    const obj: Record<string, unknown> = {};
    keys.forEach(k => { obj[k] = data[k]; });
    downloadJson('aimwork-' + s + '.json', obj);
  };
  const pickImport = (s: Sec) => { importSec.current = s; importRef.current?.click(); };
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const s = importSec.current;
    const keys = s === ('all' as Sec) ? ALL_KEYS : SECTION_KEYS[s];
    if (!keys) return;
    try {
      // a bare array is fine for a single-list page
      let parsed = JSON.parse(await f.text());
      if (Array.isArray(parsed) && keys.length === 1) parsed = { [keys[0]]: parsed };
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { setErr('import failed: not a json object'); return; }
      const next: SiteData = { ...data };
      let touched = false;
      for (const k of keys) {
        if (!(k in parsed)) continue;
        const v = (parsed as Record<string, unknown>)[k];
        if (Array.isArray(data[k]) && !Array.isArray(v)) { setErr('import failed: "' + String(k) + '" must be a list'); return; }
        (next as unknown as Record<string, unknown>)[k] = v;
        touched = true;
      }
      if (!touched) { setErr('import failed: no fields for this page in the file'); return; }
      if (await persist(next, 'imported')) {
        if (s === 'about') setForm({ about: next.about, aboutRu: next.aboutRu || '' });
        else if (s === 'settings') setForm({ telegram: next.telegram, github: next.github, email: next.email });
        else clearForm();
      }
    } catch { setErr('import failed: bad json'); }
  };
  const ioBar = (s: Sec) => (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <span className="aghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => exportSection(s)}>Export JSON</span>
      <span className="aghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => pickImport(s)}>Import JSON</span>
    </div>
  );

  const goSec = (k: Sec) => {
    setSec(k); clearForm(); setConfirmReset(false);
    if (k === 'about') setForm({ about: data.about, aboutRu: data.aboutRu || '' });
    if (k === 'settings') setForm({ telegram: data.telegram, github: data.github, email: data.email });
    if (k === 'i18n') {
      const f: Form = {};
      I18N_FIELDS.forEach(([key]) => {
        f['en_' + key] = data.i18n?.en?.[key] || '';
        f['ru_' + key] = data.i18n?.ru?.[key] || '';
      });
      setForm(f);
    }
  };

  const tryLogin = async () => {
    if (locked || !pw || busy.current) return;
    busy.current = true;
    try {
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pass: pw })
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) { setAuth(true); setPw(''); setLoginErr(''); return; }
      setPw('');
      if (j.wait) { setWait(j.wait); setLoginErr(''); }
      else setLoginErr('wrong passphrase');
    } catch {
      setLoginErr('network error, try again');
    } finally {
      busy.current = false;
    }
  };

  const del = (list: keyof SiteData, id: string) => {
    // if the open form is editing this row, close it so a later save is not a no-op
    if (editId === id) clearForm();
    persist({ ...data, [list]: (data[list] as { id: string }[]).filter(x => x.id !== id) }, 'deleted');
  };

  const dropOn = (list: keyof SiteData, targetId: string) => {
    const dr = drag.current;
    drag.current = null;
    if (!dr || dr.list !== list || dr.id === targetId) return;
    const arr = [...(data[list] as { id: string }[])];
    const from = arr.findIndex(x => x.id === dr.id), to = arr.findIndex(x => x.id === targetId);
    if (from < 0 || to < 0) return;
    const [it] = arr.splice(from, 1);
    arr.splice(to, 0, it);
    persist({ ...data, [list]: arr } as SiteData, 'reordered');
  };

  // photos are scaled down here, so a big phone photo is fine
  const readImgs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 8);
    e.target.value = '';
    if (!files.length) return;
    show('adding photos...');
    const done = await Promise.all(files.map(f => shrinkImage(f, 1400).catch(() => '')));
    const ok = done.filter(Boolean);
    const kb = dataUrlKb(ok.join(''));
    // upload each to storage, fall back to the data url on failure
    const stored = await Promise.all(ok.map(d => uploadMedia(d)));
    if (stored.length) setImgs(p => [...p, ...stored]);
    if (ok.length < files.length) show('some images could not be read');
    else show(ok.length + ' photo(s) added, ' + kb + 'kb');
  };
  // service icons stay png so a transparent logo keeps its background
  const readIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const src = await shrinkImage(f, 128, 'image/png');
      // upload to storage, keep the data url if that fails
      setIcon(await uploadMedia(src));
      show('icon added, ' + dataUrlKb(src) + 'kb');
    } catch { show('image could not be read'); }
  };
  // team project photo: a real photo, so jpeg
  const readPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    show('adding photo...');
    try {
      const src = await shrinkImage(f, 1400);
      // upload to storage, keep the data url if that fails
      setIcon(await uploadMedia(src));
      show('photo added, ' + dataUrlKb(src) + 'kb');
    } catch { show('image could not be read'); }
  };
  // the file goes to storage, so it does not have to fit the content json
  const readVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 12000000) { show('video too big, max ~12mb (or use a url)'); return; }
    show('uploading video...');
    try {
      const url = await uploadMedia(await fileToDataUrl(f));
      // a big base64 video inside the content file would break the save
      if (url.startsWith('data:') && dataUrlKb(url) > 1200) {
        setErr('not saved: storage upload failed, and the file is too big to keep inline');
        return;
      }
      setVideo(url);
      setForm(fm => ({ ...fm, videoUrl: '' }));
      show('video attached');
    } catch { show('video could not be read'); }
  };

  const fmtWrap = (pre: string, post: string) => {
    const ta = aboutRef.current;
    if (!ta) return;
    const st = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
    setForm(f => ({ ...f, about: v.slice(0, st) + pre + v.slice(st, en) + post + v.slice(en) }));
  };

  // save handlers: keep the form open if the write was rejected (quota)
  const upsert = <T extends { id: string }>(arr: T[], item: T) =>
    editId ? arr.map(x => x.id === editId ? item : x) : [...arr, item];
  const saveService = async () => {
    if (!F('title').trim()) return;
    const item: Service = { id: editId || 's' + Date.now(), title: F('title').trim(), titleRu: F('titleRu').trim(), desc: F('desc').trim(), descRu: F('descRu').trim(), glyph: F('glyph').trim() || '▢', icon };
    if (await persist({ ...data, services: upsert(data.services, item) })) clearForm();
  };
  const saveWork = async () => {
    if (!F('title').trim()) return;
    let vid = video || F('videoUrl').trim() || null;
    // a pasted link is copied into our storage first: discord and most cdn
    // links are signed and stop working in a day, and the card goes black
    let warn = '';
    if (vid && !inStorage(vid) && /^https?:/i.test(vid)) {
      show('copying the video to storage...');
      const r = await importUrl(vid);
      if (r.url) vid = r.url;
      else warn = 'video not copied to storage: ' + r.err + '. saved as a plain link, it can stop working';
    }
    const item: Work = { id: editId || 'w' + Date.now(), title: F('title').trim(), titleRu: F('titleRu').trim(), date: F('date').trim(), link: F('link').trim(), video: vid, desc: F('desc').trim(), descRu: F('descRu').trim(), imgs, img: imgs[0] || null, changelog: logs };
    if (await persist({ ...data, works: upsert(data.works, item) })) {
      clearForm();
      if (warn) setErr(warn);
    }
  };
  const saveProject = async () => {
    if (!F('name').trim() || !F('role').trim()) return;
    const item: TeamProject = { id: editId || 'p' + Date.now(), name: F('name').trim(), role: F('role').trim(), roleRu: F('roleRu').trim(), from: F('from').trim() || '?', to: F('to').trim() || 'now', link: F('link').trim(), img: icon, changelog: logs };
    if (await persist({ ...data, projects: upsert(data.projects, item) })) clearForm();
  };

  // changelog entry editor, shared by works and team projects
  const addLog = () => {
    if (!F('logText').trim()) return;
    const d = new Date();
    const today = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    setLogs(p => [...p, { id: 'l' + Date.now(), date: F('logDate').trim() || today, text: F('logText').trim(), textRu: F('logTextRu').trim() }]);
    setForm(f => ({ ...f, logDate: '', logText: '', logTextRu: '' }));
  };

  const counts: Partial<Record<Sec, number>> = { services: data.services.length, works: data.works.length, projects: data.projects.length };

  const inp = (k: string, ph: string, style?: React.CSSProperties) => (
    <input className="ainput" value={F(k)} onChange={onF(k)} placeholder={ph} style={style} />
  );
  const dragRow = (list: keyof SiteData, id: string) => ({
    draggable: true,
    onDragStart: () => { drag.current = { list, id }; },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => dropOn(list, id)
  });

  const logEditor = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#9c9c9c', borderTop: '1px solid #212121', paddingTop: 12 }}>
      changelog (shown in the project window):
      {logs.map(l => (
        <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ color: '#474747', fontSize: 12, whiteSpace: 'nowrap', flex: 'none' }}>{l.date}</span>
          <span style={{ color: '#f3f3f3', flex: 1, minWidth: 0 }}>{l.text}</span>
          <span className="adel" onClick={() => setLogs(p => p.filter(x => x.id !== l.id))}>delete</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10 }}>
        {inp('logDate', 'date (2026.07.23)', { flex: 1 })}
        {inp('logText', 'what changed *', { flex: 2 })}
      </div>
      {inp('logTextRu', 'что изменилось RU (опц.)')}
      <div><span className="aghost" style={{ padding: '6px 16px', fontSize: 13 }} onClick={addLog}>Add entry</span></div>
    </div>
  );

  // login gate
  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 14, color: '#9c9c9c' }}>AimworkSpace</div>
      {!locked ? <>
        <input type="password" className="ainput" value={pw} onChange={e => { setPw(e.target.value); setLoginErr(''); }} onKeyDown={e => { if (e.key === 'Enter') tryLogin(); }} placeholder="passphrase" style={{ marginTop: 22, width: 280, textAlign: 'center', letterSpacing: '.14em', fontSize: 15, padding: '12px 16px', borderRadius: 10 }} />
        <span className="abtn" style={{ marginTop: 14, padding: '10px 26px' }} onClick={tryLogin}>Enter</span>
        {!!loginErr && <div style={{ marginTop: 16, fontSize: 13, color: '#ff6b6b' }}>{loginErr}</div>}
      </> : <>
        <div style={{ marginTop: 22, fontSize: 14, color: '#ff6b6b' }}>too many attempts</div>
        <div style={{ marginTop: 6, fontSize: 13, color: '#9c9c9c' }}>try again in {wait}s</div>
      </>}
      <a href="/" style={{ marginTop: 34, fontSize: 13, color: '#474747', textDecoration: 'none' }}>← back to site</a>
    </div>
  );

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 28px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '1px solid #212121', paddingBottom: 18 }}>
        <span style={{ fontSize: 20, letterSpacing: '-0.01em' }}>Admin</span>
        <span style={{ fontSize: 13, color: '#474747' }}>/ AimworkSpace</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/" className="aghost" style={{ textDecoration: 'none', padding: '7px 16px', fontSize: 13 }}>View site</a>
          <span style={{ fontSize: 13, color: '#9c9c9c', cursor: 'pointer' }} onClick={() => { fetch('/api/admin/session', { method: 'DELETE' }).finally(() => setAuth(false)); }}>Logout</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: 26, marginTop: 22, alignItems: 'flex-start' }}>
        {/* nav */}
        <div style={{ width: 180, flex: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map(([k, label]) => (
            <span key={k} className="anav" onClick={() => goSec(k)} style={{ background: sec === k ? '#161616' : 'transparent', color: sec === k ? '#f3f3f3' : '#9c9c9c' }}>
              {label}
              {counts[k] !== undefined && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#474747' }}>{counts[k]}</span>}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {sec !== 'preview' && ioBar(sec)}
          {/* about */}
          {sec === 'about' && <>
            <div style={{ fontSize: 22 }}>About</div>
            <div style={{ margin: '4px 0 18px', fontSize: 13, color: '#9c9c9c' }}>The text in the About block. Select text and use the buttons to format.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <span className="afmt" style={{ fontWeight: 500 }} onClick={() => fmtWrap('**', '**')}>B</span>
              <span className="afmt" style={{ fontStyle: 'italic' }} onClick={() => fmtWrap('*', '*')}>I</span>
              <span className="afmt" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }} onClick={() => fmtWrap('[', '](https://)')}>link</span>
            </div>
            <textarea ref={aboutRef} className="ainput" value={F('about')} onChange={onF('about')} rows={8} style={{ width: '100%', maxWidth: 640, lineHeight: 1.6, borderRadius: 10, padding: '12px 14px' }} />
            <div style={{ marginTop: 8, fontSize: 12, color: '#474747' }}>**bold** · *italic* · [text](https://url) · empty line = spacer</div>
            <div style={{ margin: '18px 0 8px', fontSize: 13, color: '#9c9c9c' }}>Russian version (shown when RU is selected):</div>
            <textarea className="ainput" value={F('aboutRu')} onChange={onF('aboutRu')} rows={8} style={{ width: '100%', maxWidth: 640, lineHeight: 1.6, borderRadius: 10, padding: '12px 14px' }} />
            <div style={{ marginTop: 16 }}><span className="abtn" onClick={() => persist({ ...data, about: F('about'), aboutRu: F('aboutRu') })}>Save</span></div>

            {/* about media: framed gif/photo under the text, saved on upload */}
            <div style={{ marginTop: 28, borderTop: '1px solid #212121', paddingTop: 20, maxWidth: 640 }}>
              <div style={{ fontSize: 16 }}>About media</div>
              <div style={{ margin: '4px 0 14px', fontSize: 13, color: '#9c9c9c', lineHeight: 1.6 }}>Optional gif or photo under the about text. The preview below is the real size and shape the site uses. Saved right after upload / on click; the width saves when you let the slider go.</div>
              <input ref={aboutImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAboutMedia} />
              {(() => {
                const w = aboutW ?? data.aboutImgW ?? 252;
                const asp = data.aboutImgAspect || '16/9';
                const frame: React.CSSProperties = { width: w, maxWidth: '100%', aspectRatio: asp === 'auto' ? undefined : asp, borderRadius: 14, border: '1px solid #212121', display: 'block' };
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                    {data.aboutImg
                      ? <img src={data.aboutImg} alt="" style={{ ...frame, objectFit: asp === 'auto' ? undefined : 'cover' }} />
                      : <div style={{ ...frame, aspectRatio: asp === 'auto' ? '16/9' : asp, border: '1px dashed #2a2a2a', display: 'grid', placeItems: 'center', color: '#474747', fontSize: 12 }}>empty</div>}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="aghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => aboutImgRef.current?.click()}>Upload</span>
                      {!!data.aboutImg && <span className="adel" onClick={() => persist({ ...data, aboutImg: null })}>remove</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, width: 60, color: '#9c9c9c' }}>Width</span>
                      <input type="range" min={160} max={520} step={4} value={w}
                        onChange={e => setAboutW(Number(e.target.value))}
                        onPointerUp={commitAboutW} onKeyUp={commitAboutW} onBlur={commitAboutW}
                        style={{ width: 220, accentColor: '#f3f3f3' }} />
                      <span style={{ fontSize: 13, color: '#9c9c9c', width: 52 }}>{w}px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, width: 60, color: '#9c9c9c' }}>Aspect</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ABOUT_ASPECTS.map(([val, label]) => {
                          const active = asp === val;
                          return <span key={val} className="aghost" style={{ padding: '5px 12px', fontSize: 12, borderColor: active ? '#474747' : '#2a2a2a', color: active ? '#f3f3f3' : '#9c9c9c' }} onClick={() => persist({ ...data, aboutImgAspect: val })}>{label}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* the location line and its flag can be hidden */}
              <div style={{ marginTop: 18, borderTop: '1px solid #1a1a1a' }}>
                {([['aboutShowBased', 'Location line (based in ...)'], ['aboutShowFlag', 'Flag on the location line']] as const).map(([key, label]) => {
                  const on = data[key] !== false;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ fontSize: 14, flex: 1 }}>{label}</span>
                      <span className="aghost" style={{ padding: '6px 18px', fontSize: 13, borderColor: on ? '#474747' : '#2a2a2a', color: on ? '#f3f3f3' : '#9c9c9c' }} onClick={() => persist({ ...data, [key]: !on })}>{on ? 'On' : 'Off'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>}

          {/* services */}
          {sec === 'services' && <>
            <div style={{ fontSize: 22 }}>Services</div>
            <div style={{ margin: '4px 0 14px', fontSize: 13, color: '#9c9c9c' }}>The &quot;What I do&quot; cards. Icon = uploaded image, or a text glyph like ▤ ◉ &lt;/&gt;.</div>
            {data.services.map(sv => (
              <div key={sv.id} className="arow" {...dragRow('services', sv.id)}>
                <span style={{ color: '#474747', cursor: 'grab', fontSize: 13, userSelect: 'none', flex: 'none' }}>⋮⋮</span>
                {sv.icon ? <img src={sv.icon} loading="lazy" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} /> : <span style={{ color: '#6f6759', width: 22, textAlign: 'center', fontSize: 16 }}>{sv.glyph}</span>}
                <span style={{ fontSize: 15 }}>{sv.title}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                  <span className="aedit" onClick={() => { setEditId(sv.id); setForm({ title: sv.title, titleRu: sv.titleRu || '', desc: sv.desc, descRu: sv.descRu || '', glyph: sv.glyph }); setIcon(sv.icon); }}>edit</span>
                  <span className="adel" onClick={() => del('services', sv.id)}>delete</span>
                </span>
              </div>
            ))}
            <div style={{ marginTop: 20, background: '#151515', border: '1px solid #212121', borderRadius: 12, padding: 18, maxWidth: 640 }}>
              <div style={{ fontSize: 13, color: '#9c9c9c', marginBottom: 12 }}>{editId ? 'Edit service' : 'Add service'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {inp('title', 'title *', { flex: 2 })}
                  {inp('glyph', 'glyph (if no icon)', { flex: 1 })}
                </div>
                <textarea className="ainput" value={F('desc')} onChange={onF('desc')} rows={2} placeholder="description" style={{ lineHeight: 1.5 }} />
                {inp('titleRu', 'название RU (опц.)')}
                <textarea className="ainput" value={F('descRu')} onChange={onF('descRu')} rows={2} placeholder="описание RU (опц.)" style={{ lineHeight: 1.5 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#9c9c9c', flexWrap: 'wrap' }}>
                  icon: <input type="file" accept="image/*" onChange={readIcon} style={{ fontSize: 12, color: '#9c9c9c' }} />
                  {icon && <><img src={icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} /><span className="adel" onClick={() => setIcon(null)}>clear</span></>}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <span className="abtn" onClick={saveService}>{editId ? 'Save changes' : 'Add service'}</span>
                  {editId && <span className="aghost" onClick={clearForm}>Cancel</span>}
                </div>
              </div>
            </div>
          </>}

          {/* works */}
          {sec === 'works' && <>
            <div style={{ fontSize: 22 }}>Work</div>
            <div style={{ margin: '4px 0 14px', fontSize: 13, color: '#9c9c9c' }}>Photos (carousel) + optional video + link + description + date.</div>
            {data.works.map(w => {
              const cover = w.imgs?.[0] || w.img;
              return (
                <div key={w.id} className="arow" {...dragRow('works', w.id)}>
                  <span style={{ color: '#474747', cursor: 'grab', fontSize: 13, userSelect: 'none', flex: 'none' }}>⋮⋮</span>
                  {cover
                    ? <img src={cover} loading="lazy" alt="" style={{ width: 52, height: 34, objectFit: 'cover', borderRadius: 6, border: '1px solid #212121' }} />
                    : <span style={{ width: 52, height: 34, border: '1px dashed #2a2a2a', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#474747' }}>no img</span>}
                  <span style={{ fontSize: 15 }}>{w.title}</span>
                  <span style={{ fontSize: 13, color: '#474747' }}>{w.date}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                    <span className="aedit" onClick={() => {
                      setEditId(w.id);
                      setForm({ title: w.title, titleRu: w.titleRu || '', date: w.date || '', link: w.link, videoUrl: w.video && !w.video.startsWith('data:') ? w.video : '', desc: w.desc, descRu: w.descRu || '' });
                      setImgs(w.imgs?.length ? w.imgs : w.img ? [w.img] : []);
                      setVideo(w.video?.startsWith('data:') ? w.video : '');
                      setLogs(w.changelog || []);
                    }}>edit</span>
                    <span className="adel" onClick={() => del('works', w.id)}>delete</span>
                  </span>
                </div>
              );
            })}
            <div style={{ marginTop: 20, background: '#151515', border: '1px solid #212121', borderRadius: 12, padding: 18, maxWidth: 640 }}>
              <div style={{ fontSize: 13, color: '#9c9c9c', marginBottom: 12 }}>{editId ? 'Edit project' : 'Add project'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {inp('title', 'title *', { flex: 2 })}
                  {inp('date', 'date (2025.06)', { flex: 1 })}
                </div>
                {inp('link', 'link (optional)')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#9c9c9c', flexWrap: 'wrap' }}>
                  video (mp4/webm, plays muted like a gif): <input type="file" accept="video/mp4,video/webm" onChange={readVideo} style={{ fontSize: 12, color: '#9c9c9c' }} />
                  {!!video && <><span style={{ color: '#f3f3f3', fontSize: 12 }}>video attached{video.startsWith('data:') ? ' (' + dataUrlKb(video) + 'kb, inline)' : ' (in storage)'}</span><span className="adel" onClick={() => setVideo('')}>clear</span></>}
                </div>
                {inp('videoUrl', '...or paste a video url instead')}
                <div style={{ fontSize: 12, color: '#474747', marginTop: -4 }}>a pasted link is copied into our storage on save. discord links are signed and die in a day, so paste them the same day or upload the file</div>
                <textarea className="ainput" value={F('desc')} onChange={onF('desc')} rows={3} placeholder="description (EN)" style={{ lineHeight: 1.5 }} />
                {inp('titleRu', 'название RU (опц.)')}
                <textarea className="ainput" value={F('descRu')} onChange={onF('descRu')} rows={3} placeholder="описание RU (опц.)" style={{ lineHeight: 1.5 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#9c9c9c' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    photos (multiple ok): <input type="file" accept="image/*" multiple onChange={readImgs} style={{ fontSize: 12, color: '#9c9c9c' }} />
                  </div>
                  {imgs.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {imgs.map((src, i) => (
                        <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                          <img src={src} alt="" style={{ width: 64, height: 42, objectFit: 'cover', borderRadius: 6, border: '1px solid #212121', display: 'block' }} />
                          <span onClick={() => setImgs(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', right: -6, top: -6, width: 17, height: 17, borderRadius: 99, background: '#2a2a2a', color: '#f3f3f3', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #474747' }}>×</span>
                        </span>
                      ))}
                      <span style={{ fontSize: 11, color: '#474747' }}>first photo = card cover</span>
                    </div>
                  )}
                </div>
                {logEditor}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <span className="abtn" onClick={saveWork}>{editId ? 'Save changes' : 'Add project'}</span>
                  {editId && <span className="aghost" onClick={clearForm}>Cancel</span>}
                </div>
              </div>
            </div>
          </>}

          {/* team projects */}
          {sec === 'projects' && <>
            <div style={{ fontSize: 22 }}>Team projects</div>
            <div style={{ margin: '4px 0 14px', fontSize: 13, color: '#9c9c9c' }}>Projects you were part of: name + your role + dates (free format).</div>
            {data.projects.map(p => (
              <div key={p.id} className="arow" {...dragRow('projects', p.id)}>
                <span style={{ color: '#474747', cursor: 'grab', fontSize: 13, userSelect: 'none', flex: 'none' }}>⋮⋮</span>
                <span style={{ fontSize: 15 }}>{p.name}</span>
                <span style={{ fontSize: 13, color: '#9c9c9c' }}>{p.role}</span>
                <span style={{ fontSize: 13, color: '#474747' }}>{p.from} - {p.to}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                  <span className="aedit" onClick={() => { setEditId(p.id); setForm({ name: p.name, role: p.role, roleRu: p.roleRu || '', from: p.from, to: p.to, link: p.link }); setIcon(p.img || null); setLogs(p.changelog || []); }}>edit</span>
                  <span className="adel" onClick={() => del('projects', p.id)}>delete</span>
                </span>
              </div>
            ))}
            <div style={{ marginTop: 20, background: '#151515', border: '1px solid #212121', borderRadius: 12, padding: 18, maxWidth: 640 }}>
              <div style={{ fontSize: 13, color: '#9c9c9c', marginBottom: 12 }}>{editId ? 'Edit team project' : 'Add team project'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {inp('name', 'project name *', { flex: 2 })}
                  {inp('role', 'my role (EN) *', { flex: 1 })}
                  {inp('roleRu', 'роль RU (опц.)', { flex: 1 })}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {inp('from', 'from (2024.02)', { flex: 1 })}
                  {inp('to', 'to (now)', { flex: 1 })}
                </div>
                {inp('link', 'link (optional)')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#9c9c9c', flexWrap: 'wrap' }}>
                  photo: <input type="file" accept="image/*" onChange={readPhoto} style={{ fontSize: 12, color: '#9c9c9c' }} />
                  {icon && <><img src={icon} alt="" style={{ width: 52, height: 34, objectFit: 'cover', borderRadius: 6, border: '1px solid #212121' }} /><span className="adel" onClick={() => setIcon(null)}>clear</span></>}
                </div>
                {logEditor}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <span className="abtn" onClick={saveProject}>{editId ? 'Save changes' : 'Add project'}</span>
                  {editId && <span className="aghost" onClick={clearForm}>Cancel</span>}
                </div>
              </div>
            </div>
          </>}

          {/* settings */}
          {sec === 'settings' && <>
            <div style={{ fontSize: 22 }}>Settings</div>
            <div style={{ margin: '4px 0 18px', fontSize: 13, color: '#9c9c9c' }}>Contacts shown across the site.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {inp('telegram', 'telegram username (no @)', { flex: 1 })}
                {inp('github', 'github username', { flex: 1 })}
              </div>
              {inp('email', 'contact email')}
              <div style={{ marginTop: 6 }}>
                <span className="abtn" onClick={() => persist({ ...data, telegram: F('telegram').trim().replace(/^@/, ''), github: F('github').trim(), email: F('email').trim() })}>Save</span>
              </div>
            </div>

            {/* effects: saved on click, no separate save button */}
            <div style={{ marginTop: 40, borderTop: '1px solid #212121', paddingTop: 20, maxWidth: 640 }}>
              <div style={{ fontSize: 16 }}>Effects</div>
              <div style={{ margin: '4px 0 18px', fontSize: 13, color: '#9c9c9c', lineHeight: 1.6 }}>Saved as you click, no save button.</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                <span style={{ fontSize: 14, width: 150 }}>Cursor</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CURSOR_OPTS.map(([val, label]) => {
                    const active = (data.cursorStyle || 'dot') === val;
                    return <span key={val} className="aghost" style={{ padding: '6px 14px', fontSize: 13, borderColor: active ? '#474747' : '#2a2a2a', color: active ? '#f3f3f3' : '#9c9c9c' }} onClick={() => persist({ ...data, cursorStyle: val })}>{label}</span>;
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0' }}>
                <span style={{ fontSize: 14, width: 150, paddingTop: 6 }}>Russian font</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {RU_FONT_OPTS.map(([val, label, stack]) => {
                      const active = (data.fontRu || 'onest') === val;
                      return <span key={val} className="aghost" style={{ padding: '6px 14px', fontSize: 13, fontFamily: stack, borderColor: active ? '#474747' : '#2a2a2a', color: active ? '#f3f3f3' : '#9c9c9c' }} onClick={() => persist({ ...data, fontRu: val })}>{label}</span>;
                    })}
                  </div>
                  {/* sample line in the picked font, so the choice is visible right here */}
                  <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5, color: '#9c9c9c', fontFamily: RU_FONT_OPTS.find(([v]) => v === (data.fontRu || 'onest'))![2] }}>
                    Съешь ещё этих мягких французских булок, да выпей чаю · 1234567890
                  </div>
                </div>
              </div>

              {/* whole blocks of the page. off also drops the nav link */}
              <div style={{ marginTop: 8, borderTop: '1px solid #1a1a1a' }}>
                {SECTION_TOGGLES.map(([key, label, note]) => {
                  const on = data[key] !== false;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ fontSize: 14, flex: 1 }}>{label}<span style={{ display: 'block', fontSize: 12, color: '#474747', marginTop: 2 }}>{note}</span></span>
                      <span className="aghost" style={{ padding: '6px 18px', fontSize: 13, borderColor: on ? '#474747' : '#2a2a2a', color: on ? '#f3f3f3' : '#9c9c9c' }} onClick={() => persist({ ...data, [key]: !on })}>{on ? 'Shown' : 'Hidden'}</span>
                    </div>
                  );
                })}
                {FX_TOGGLES.map(([key, label, def]) => {
                  const on = data[key] === undefined ? def : !!data[key];
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ fontSize: 14, flex: 1 }}>{label}</span>
                      <span className="aghost" style={{ padding: '6px 18px', fontSize: 13, borderColor: on ? '#474747' : '#2a2a2a', color: on ? '#f3f3f3' : '#9c9c9c' }} onClick={() => persist({ ...data, [key]: !on })}>{on ? 'On' : 'Off'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* inline base64 media sits inside the content file, and the api
                rejects a save over ~4mb */}
            <div style={{ marginTop: 40, borderTop: '1px solid #212121', paddingTop: 20, maxWidth: 640 }}>
              <div style={{ fontSize: 16 }}>Media storage</div>
              {!inline.list.length
                ? <div style={{ marginTop: 4, fontSize: 13, color: '#9c9c9c' }}>All media is in storage.</div>
                : <>
                  <div style={{ margin: '4px 0 14px', fontSize: 13, color: '#9c9c9c', lineHeight: 1.6 }}>
                    {inline.list.length} file(s) still live inside the content file, about {inline.kb}kb. Moving them to storage keeps saves under the 4mb limit. Files go up one by one, then everything is saved once.
                  </div>
                  <span className="abtn" onClick={moveMedia} style={{ opacity: moving ? .5 : 1, pointerEvents: moving ? 'none' : undefined }}>
                    {moving ? 'Moving…' : 'Move ' + inline.list.length + (inline.list.length === 1 ? ' file' : ' files') + ' to storage'}
                  </span>
                </>}
            </div>

            <div style={{ marginTop: 40, borderTop: '1px solid #212121', paddingTop: 20 }}>
              <div style={{ fontSize: 13, color: '#ff6b6b', marginBottom: 12, opacity: .8 }}>Danger zone</div>
              <span onClick={() => {
                if (!confirmReset) { setConfirmReset(true); return; }
                resetData();
                const nd = loadData();
                setConfirmReset(false);
                setForm({ telegram: nd.telegram, github: nd.github, email: nd.email });
                // a reset replaces everything, so it ignores the current data
                persist(() => nd, 'reset to defaults');
              }} style={{ border: '1px solid rgba(255,107,107,.4)', color: '#ff6b6b', borderRadius: 9999, padding: '9px 20px', fontSize: 14, cursor: 'pointer', userSelect: 'none', display: 'inline-block' }}>
                {confirmReset ? 'Sure? Click again' : 'Reset all content to defaults'}
              </span>
            </div>
          </>}

          {/* interface text (i18n) */}
          {sec === 'i18n' && <>
            <div style={{ fontSize: 22 }}>Interface text</div>
            <div style={{ margin: '4px 0 18px', fontSize: 13, color: '#9c9c9c', lineHeight: 1.6 }}>Static UI strings in English and Russian. Leave a field empty to use the built-in default (shown greyed as the placeholder). Left = EN, right = RU. The font chips under a Russian field style that one string only and save on click; Global follows the font from Settings.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
              {I18N_FIELDS.map(([key, label]) => (
                <div key={String(key)}>
                  <div style={{ fontSize: 12, color: '#9c9c9c', marginBottom: 6 }}>{label} <span style={{ color: '#474747' }}>({String(key)})</span></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {inp('en_' + String(key), T.en[key], { flex: 1 })}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {inp('ru_' + String(key), T.ru[key])}
                      {/* font for this one russian string; global = the settings font */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="aghost" style={{ padding: '3px 10px', fontSize: 11, borderColor: !data.i18nFontRu?.[key] ? '#474747' : '#2a2a2a', color: !data.i18nFontRu?.[key] ? '#f3f3f3' : '#9c9c9c' }} onClick={() => { const m = { ...(data.i18nFontRu || {}) }; delete m[key]; persist({ ...data, i18nFontRu: m }); }}>Global</span>
                        {RU_FONT_OPTS.map(([val, lab, stack]) => {
                          const active = data.i18nFontRu?.[key] === val;
                          return <span key={val} className="aghost" style={{ padding: '3px 10px', fontSize: 11, fontFamily: stack, borderColor: active ? '#474747' : '#2a2a2a', color: active ? '#f3f3f3' : '#9c9c9c' }} onClick={() => persist({ ...data, i18nFontRu: { ...(data.i18nFontRu || {}), [key]: val } })}>{lab}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 6 }}>
                <span className="abtn" onClick={saveI18n}>Save</span>
              </div>
            </div>
          </>}

          {/* live preview */}
          {sec === 'preview' && <>
            <div style={{ fontSize: 22 }}>Live preview</div>
            <div style={{ margin: '4px 0 16px', fontSize: 13, color: '#9c9c9c' }}>The real site with your current content. It refreshes when you save a page. Switch device to check mobile.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span className="aghost" style={{ padding: '6px 14px', fontSize: 13, borderColor: device === 'desktop' ? '#474747' : '#2a2a2a', color: device === 'desktop' ? '#f3f3f3' : '#9c9c9c' }} onClick={() => setDevice('desktop')}>Desktop</span>
              <span className="aghost" style={{ padding: '6px 14px', fontSize: 13, borderColor: device === 'mobile' ? '#474747' : '#2a2a2a', color: device === 'mobile' ? '#f3f3f3' : '#9c9c9c' }} onClick={() => setDevice('mobile')}>Mobile</span>
              <a href="/?preview=1" target="_blank" className="aghost" style={{ padding: '6px 14px', fontSize: 13, textDecoration: 'none', marginLeft: 'auto' }}>Open in tab ↗</a>
            </div>
            {(() => {
              const pv = device === 'mobile' ? { w: 390, h: 780, s: 0.9 } : { w: 1280, h: 800, s: 0.62 };
              return (
                <div style={{ width: pv.w * pv.s, height: pv.h * pv.s, maxWidth: '100%', overflow: 'hidden', borderRadius: 14, border: '1px solid #212121', margin: '0 auto', boxShadow: '0 24px 70px rgba(0,0,0,.45)' }}>
                  <iframe title="preview" src="/?preview=1" style={{ width: pv.w, height: pv.h, border: 0, transform: `scale(${pv.s})`, transformOrigin: 'top left', background: '#101010' }} />
                </div>
              );
            })()}
            <div style={{ marginTop: 28, borderTop: '1px solid #212121', paddingTop: 20, display: 'flex', gap: 10, alignItems: 'center', maxWidth: 640 }}>
              <span style={{ fontSize: 13, color: '#9c9c9c', marginRight: 'auto' }}>Whole site backup</span>
              <span className="aghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => downloadJson('aimwork-site.json', data)}>Export all</span>
              <span className="aghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => pickImport('all' as Sec)}>Import all</span>
            </div>
          </>}
        </div>
      </div>

      {/* hidden input for json import */}
      <input ref={importRef} type="file" accept="application/json,.json" onChange={onImportFile} style={{ display: 'none' }} />

      {/* save error: stays until the next save */}
      {!!err && (
        <div style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 700, background: '#3a1414', borderBottom: '1px solid #ff6b6b', color: '#ffbcbc', padding: '11px 18px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>{err}</span>
          <span onClick={() => setErr('')} style={{ marginLeft: 'auto', cursor: 'pointer', color: '#ff6b6b' }}>dismiss</span>
        </div>
      )}
      {saving && (
        <div style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 700, height: 2, background: '#f3f3f3', opacity: .5 }} />
      )}

      {/* toast */}
      <div style={{ position: 'fixed', left: 0, bottom: 34, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 600 }}>
        <span style={{ background: '#f3f3f3', color: '#101010', borderRadius: 9999, padding: '9px 18px', fontSize: 13, opacity: flash ? 1 : 0, transform: flash ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity .35s ease, transform .4s cubic-bezier(.22,1,.36,1)' }}>{flash || ' '}</span>
      </div>
    </div>
  );
}
