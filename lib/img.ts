// shrink images in the browser before they go into the content json.
// keeps big phone photos usable and the whole file under the api limit.

const load = (file: File): Promise<HTMLImageElement> => new Promise((ok, no) => {
  const url = URL.createObjectURL(file);
  const im = new Image();
  im.onload = () => { URL.revokeObjectURL(url); ok(im); };
  im.onerror = () => { URL.revokeObjectURL(url); no(new Error('bad image')); };
  im.src = url;
});

const readAsDataUrl = (file: File): Promise<string> => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(r.result as string);
  r.onerror = () => no(new Error('read failed'));
  r.readAsDataURL(file);
});

// draw the image at a given longest side and encode it
function encode(im: HTMLImageElement, maxSide: number, type: string, quality: number): string | null {
  const side = Math.max(im.naturalWidth, im.naturalHeight) || 1;
  const k = Math.min(1, maxSide / side);
  const w = Math.max(1, Math.round(im.naturalWidth * k));
  const h = Math.max(1, Math.round(im.naturalHeight * k));

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  // jpeg has no transparency, put the site background behind it
  if (type === 'image/jpeg') { ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(im, 0, 0, w, h);
  return c.toDataURL(type, quality);
}

// scale down so the longest side is maxSide, stepping quality and size down
// until it fits maxKb. svg is kept as is: it does not survive a canvas.
export async function shrinkImage(
  file: File,
  maxSide: number,
  type: 'image/jpeg' | 'image/png' = 'image/jpeg',
  maxKb = 450
): Promise<string> {
  if (file.type === 'image/svg+xml') return readAsDataUrl(file);

  const im = await load(file);
  const steps: [number, number][] = type === 'image/png'
    ? [[maxSide, 1]]
    : [[maxSide, .82], [maxSide, .7], [Math.round(maxSide * .7), .7], [Math.round(maxSide * .5), .62]];

  let out = '';
  for (const [side, q] of steps) {
    const got = encode(im, side, type, q);
    if (!got) break;
    out = got;
    if (dataUrlKb(got) <= maxKb) break;
  }
  if (!out) return readAsDataUrl(file);

  // if the canvas somehow made it bigger, keep the original
  const orig = await readAsDataUrl(file);
  return out.length < orig.length ? out : orig;
}

// rough byte size of a data url
export const dataUrlKb = (s: string) => Math.round(s.length * 0.75 / 1024);

// map a data url mime to a file extension
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/svg+xml': 'svg', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm'
};

// send a data url to storage and get a public url back. on any failure keep
// the data url, so an add/save never breaks and old inline media still works.
export async function uploadMedia(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl; // already a url
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] || '';
  try {
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dataUrl, ext: EXT_BY_MIME[mime] || '' })
    });
    const j = await r.json().catch(() => ({}));
    if (j && j.ok && typeof j.url === 'string' && j.url) return j.url;
  } catch {}
  return dataUrl;
}
