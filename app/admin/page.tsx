'use client';
// admin panel, ported from the design prototype

import { useEffect, useRef, useState } from 'react';
import {
  loadData, saveData, resetData, loadRemote, saveRemote, DEFAULTS,
  SiteData, Service, Work, TeamProject, FaqItem, LogEntry
} from '@/lib/data';

type Sec = 'about' | 'services' | 'works' | 'projects' | 'faq' | 'settings';
type Form = Record<string, string>;

const NAV: [Sec, string][] = [
  ['about', 'About'], ['services', 'Services'], ['works', 'For sale'],
  ['projects', 'Team projects'], ['faq', 'FAQ'], ['settings', 'Settings']
];

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
  const [confirmReset, setConfirmReset] = useState(false);

  const flashT = useRef<ReturnType<typeof setTimeout>>();
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{ list: keyof SiteData; id: string } | null>(null);
  const busy = useRef(false);

  // defined before the effects so they can call it
  const show = (msg: string) => {
    clearTimeout(flashT.current);
    setFlash(msg);
    flashT.current = setTimeout(() => setFlash(''), 1700);
  };

  useEffect(() => {
    const local = loadData();
    setData(local);
    setForm({ about: local.about, aboutRu: local.aboutRu || '' });
    (async () => {
      // ask the server if the session cookie is still valid, and pull shared content
      const [remote, ok] = await Promise.all([
        loadRemote(),
        fetch('/api/admin/session').then(r => r.json()).then(j => !!j.ok).catch(() => false)
      ]);
      setAuth(ok);
      if (remote) {
        setData(remote); saveData(remote);
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

  if (!data || auth === null) return null;

  const locked = wait > 0;

  // local write is the fast path, the server copy is what other browsers read
  const persist = (nd: SiteData, msg = 'saved') => {
    if (!saveData(nd)) { show('save failed: storage full, remove some images/video'); return false; }
    setData(nd); show(msg);
    saveRemote(nd).then(r => { if (!r.ok) show('saved here only, server: ' + r.err); });
    return true;
  };
  const F = (k: string) => form[k] || '';
  const onF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const clearForm = () => { setForm({}); setImgs([]); setIcon(null); setVideo(''); setLogs([]); setEditId(null); };

  const goSec = (k: Sec) => {
    setSec(k); clearForm(); setConfirmReset(false);
    if (k === 'about') setForm({ about: data.about, aboutRu: data.aboutRu || '' });
    if (k === 'settings') setForm({ telegram: data.telegram, github: data.github, email: data.email });
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

  const readImgs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 8);
    if (!files.length) return;
    if (files.some(f => f.size > 400000)) { show('file too big, max ~400kb each'); return; }
    // count every reader that finishes (ok or failed) so one bad file does not stall the rest
    let done = 0, failed = false; const out: string[] = [];
    const finish = () => {
      if (++done < files.length) return;
      const ok = out.filter(Boolean);
      if (ok.length) setImgs(p => [...p, ...ok]);
      if (failed) show('some images could not be read');
    };
    files.forEach((f, i) => {
      const r = new FileReader();
      r.onload = () => { out[i] = r.result as string; finish(); };
      r.onerror = () => { failed = true; finish(); };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  };
  const readIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 400000) { show('file too big, max ~400kb'); return; }
    const r = new FileReader();
    r.onload = () => setIcon(r.result as string);
    r.readAsDataURL(f);
    e.target.value = '';
  };
  const readVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2500000) { show('video too big, max ~2.5mb (or use a url)'); return; }
    const r = new FileReader();
    r.onload = () => { setVideo(r.result as string); setForm(fm => ({ ...fm, videoUrl: '' })); };
    r.readAsDataURL(f);
    e.target.value = '';
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
  const saveService = () => {
    if (!F('title').trim()) return;
    const item: Service = { id: editId || 's' + Date.now(), title: F('title').trim(), titleRu: F('titleRu').trim(), desc: F('desc').trim(), descRu: F('descRu').trim(), glyph: F('glyph').trim() || '▢', icon };
    if (persist({ ...data, services: upsert(data.services, item) })) clearForm();
  };
  const saveWork = () => {
    if (!F('title').trim() || !F('price').trim()) return;
    const vid = video || F('videoUrl').trim() || null;
    const item: Work = { id: editId || 'w' + Date.now(), title: F('title').trim(), titleRu: F('titleRu').trim(), price: F('price').trim(), date: F('date').trim(), link: F('link').trim(), video: vid, desc: F('desc').trim(), descRu: F('descRu').trim(), imgs, img: imgs[0] || null, changelog: logs };
    if (persist({ ...data, works: upsert(data.works, item) })) clearForm();
  };
  const saveProject = () => {
    if (!F('name').trim() || !F('role').trim()) return;
    const item: TeamProject = { id: editId || 'p' + Date.now(), name: F('name').trim(), role: F('role').trim(), roleRu: F('roleRu').trim(), from: F('from').trim() || '?', to: F('to').trim() || 'now', link: F('link').trim(), img: icon, changelog: logs };
    if (persist({ ...data, projects: upsert(data.projects, item) })) clearForm();
  };

  // changelog entry editor, shared by works and team projects
  const addLog = () => {
    if (!F('logText').trim()) return;
    const d = new Date();
    const today = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    setLogs(p => [...p, { id: 'l' + Date.now(), date: F('logDate').trim() || today, text: F('logText').trim(), textRu: F('logTextRu').trim() }]);
    setForm(f => ({ ...f, logDate: '', logText: '', logTextRu: '' }));
  };
  const saveFaq = () => {
    if (!F('fq').trim() || !F('fa').trim()) return;
    const item: FaqItem = { id: editId || 'f' + Date.now(), q: F('fq').trim(), a: F('fa').trim(), qRu: F('fqRu').trim(), aRu: F('faRu').trim() };
    if (persist({ ...data, faq: upsert(data.faq, item) })) clearForm();
  };

  const counts: Partial<Record<Sec, number>> = { services: data.services.length, works: data.works.length, projects: data.projects.length, faq: data.faq.length };

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
            <div style={{ fontSize: 22 }}>Projects for sale</div>
            <div style={{ margin: '4px 0 14px', fontSize: 13, color: '#9c9c9c' }}>Photos (carousel) + optional video + link + description + price + date.</div>
            {data.works.map(w => {
              const cover = w.imgs?.[0] || w.img;
              return (
                <div key={w.id} className="arow" {...dragRow('works', w.id)}>
                  <span style={{ color: '#474747', cursor: 'grab', fontSize: 13, userSelect: 'none', flex: 'none' }}>⋮⋮</span>
                  {cover
                    ? <img src={cover} loading="lazy" alt="" style={{ width: 52, height: 34, objectFit: 'cover', borderRadius: 6, border: '1px solid #212121' }} />
                    : <span style={{ width: 52, height: 34, border: '1px dashed #2a2a2a', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#474747' }}>no img</span>}
                  <span style={{ fontSize: 15 }}>{w.title}</span>
                  <span style={{ fontSize: 13, color: '#9c9c9c' }}>{w.price}</span>
                  <span style={{ fontSize: 13, color: '#474747' }}>{w.date}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                    <span className="aedit" onClick={() => {
                      setEditId(w.id);
                      setForm({ title: w.title, titleRu: w.titleRu || '', price: w.price, date: w.date || '', link: w.link, videoUrl: w.video && !w.video.startsWith('data:') ? w.video : '', desc: w.desc, descRu: w.descRu || '' });
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
                  {inp('price', 'price ($450) *', { flex: 1 })}
                  {inp('date', 'date (2025.06)', { flex: 1 })}
                </div>
                {inp('link', 'link (optional)')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#9c9c9c', flexWrap: 'wrap' }}>
                  video (mp4/webm, plays muted like a gif): <input type="file" accept="video/mp4,video/webm" onChange={readVideo} style={{ fontSize: 12, color: '#9c9c9c' }} />
                  {!!video && <><span style={{ color: '#f3f3f3', fontSize: 12 }}>video attached ({Math.round(video.length * 0.75 / 1024)}kb)</span><span className="adel" onClick={() => setVideo('')}>clear</span></>}
                </div>
                {inp('videoUrl', '...or paste a video url instead')}
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
                  photo: <input type="file" accept="image/*" onChange={readIcon} style={{ fontSize: 12, color: '#9c9c9c' }} />
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

          {/* faq */}
          {sec === 'faq' && <>
            <div style={{ fontSize: 22 }}>FAQ</div>
            <div style={{ margin: '4px 0 14px', fontSize: 13, color: '#9c9c9c' }}>Questions on the main page. Drag ⋮⋮ to reorder.</div>
            {data.faq.map(q => (
              <div key={q.id} className="arow" {...dragRow('faq', q.id)}>
                <span style={{ color: '#474747', cursor: 'grab', fontSize: 13, userSelect: 'none', flex: 'none' }}>⋮⋮</span>
                <span style={{ fontSize: 15, flex: 1, minWidth: 0 }}>{q.q}</span>
                <span style={{ display: 'flex', gap: 14 }}>
                  <span className="aedit" onClick={() => { setEditId(q.id); setForm({ fq: q.q, fa: q.a, fqRu: q.qRu || '', faRu: q.aRu || '' }); }}>edit</span>
                  <span className="adel" onClick={() => del('faq', q.id)}>delete</span>
                </span>
              </div>
            ))}
            <div style={{ marginTop: 20, background: '#151515', border: '1px solid #212121', borderRadius: 12, padding: 18, maxWidth: 640 }}>
              <div style={{ fontSize: 13, color: '#9c9c9c', marginBottom: 12 }}>{editId ? 'Edit question' : 'Add question'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inp('fq', 'question (EN) *')}
                <textarea className="ainput" value={F('fa')} onChange={onF('fa')} rows={3} placeholder="answer (EN) *" style={{ lineHeight: 1.5 }} />
                {inp('fqRu', 'вопрос (RU, опц.)')}
                <textarea className="ainput" value={F('faRu')} onChange={onF('faRu')} rows={3} placeholder="ответ (RU, опц.)" style={{ lineHeight: 1.5 }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <span className="abtn" onClick={saveFaq}>{editId ? 'Save changes' : 'Add question'}</span>
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
            <div style={{ marginTop: 40, borderTop: '1px solid #212121', paddingTop: 20 }}>
              <div style={{ fontSize: 13, color: '#ff6b6b', marginBottom: 12, opacity: .8 }}>Danger zone</div>
              <span onClick={() => {
                if (!confirmReset) { setConfirmReset(true); return; }
                resetData();
                const nd = loadData();
                setConfirmReset(false);
                setForm({ telegram: nd.telegram, github: nd.github, email: nd.email });
                persist(nd, 'reset to defaults');
              }} style={{ border: '1px solid rgba(255,107,107,.4)', color: '#ff6b6b', borderRadius: 9999, padding: '9px 20px', fontSize: 14, cursor: 'pointer', userSelect: 'none', display: 'inline-block' }}>
                {confirmReset ? 'Sure? Click again' : 'Reset all content to defaults'}
              </span>
            </div>
          </>}
        </div>
      </div>

      {/* toast */}
      <div style={{ position: 'fixed', left: 0, bottom: 34, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 600 }}>
        <span style={{ background: '#f3f3f3', color: '#101010', borderRadius: 9999, padding: '9px 18px', fontSize: 13, opacity: flash ? 1 : 0, transform: flash ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity .35s ease, transform .4s cubic-bezier(.22,1,.36,1)' }}>{flash || ' '}</span>
      </div>
    </div>
  );
}
