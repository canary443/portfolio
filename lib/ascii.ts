// turn any picture into ascii art: white monospace glyphs on pure black,
// the same style as the hero cat. runs in the browser (canvas), returns a
// png data url ready for upload. used by the admin hero uploader.

const RAMP = " .`':,;\"~-_+<>i!lI?/\\|()1{}[]rcvunxzjftLCJUYXZO0Qoahkbdpqwm*WMB8&%$#@";

// draw pasted text art (ascii or braille) onto a black canvas, one glyph per
// grid cell like a terminal. upscale makes the art span the full width;
// without it the art keeps a small terminal-ish size, centered
export function renderTextArt(text: string, upscale = true, targetW = 3000): string {
  const lines = text.replace(/\r/g, '').split('\n')
    // drop trailing spaces and blank braille cells so centering is true
    .map(l => l.replace(/[\s⠀]+$/g, ''));
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  if (!lines.length) throw new Error('empty art');

  const cols = Math.max(...lines.map(l => [...l].length));
  const cellR = 0.6, lineR = 1.2; // monospace cell proportions
  const font = upscale ? Math.floor((targetW * 0.92) / (cols * cellR)) : 26;
  const cw = font * cellR, chh = font * lineR;
  const artW = cols * cw;
  const pad = Math.round(chh);
  const W = targetW, H = Math.round(lines.length * chh + pad * 2);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `${font}px Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f3f3f3';
  const ox = (W - artW) / 2;
  lines.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      if (ch === ' ' || ch === '⠀') return;
      ctx.fillText(ch, ox + x * cw + cw / 2, pad + y * chh + chh / 2);
    });
  });
  return c.toDataURL('image/png');
}

const load = (src: string): Promise<HTMLImageElement> => new Promise((ok, no) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = () => no(new Error('bad image'));
  im.src = src;
});

export async function renderAscii(src: string, targetW = 3000, cols = 300): Promise<string> {
  const img = await load(src);
  const W = targetW;
  const H = Math.round(W * img.naturalHeight / img.naturalWidth);
  const cw = W / cols;
  // a monospace cell is roughly 3:5, keep the grid near that so nothing squashes
  const rows = Math.max(1, Math.round(H / (cw * 5 / 3)));
  const ch = H / rows;

  // sample the picture into the character grid
  const s = document.createElement('canvas');
  s.width = cols; s.height = rows;
  const sc = s.getContext('2d')!;
  sc.drawImage(img, 0, 0, cols, rows);
  const d = sc.getImageData(0, 0, cols, rows).data;
  const n = cols * rows;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;

  // stretch 2..98 percentile to the full range, so any exposure maps well
  const sorted = Array.from(L).sort((a, b) => a - b);
  const lo = sorted[Math.floor(0.02 * (n - 1))];
  const hi = sorted[Math.floor(0.98 * (n - 1))];
  const span = Math.max(hi - lo, 0.001);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `${Math.floor(ch * 0.95)}px Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const v = Math.max(0, Math.min(1, (L[y * cols + x] - lo) / span));
    if (v < 0.1) continue;
    const chr = RAMP[Math.min(RAMP.length - 1, Math.round(Math.pow(v, 0.9) * (RAMP.length - 1)))];
    if (chr === ' ') continue;
    ctx.fillStyle = `rgba(243,243,243,${(0.45 + 0.55 * v).toFixed(3)})`;
    ctx.fillText(chr, x * cw + cw / 2, y * ch + ch / 2);
  }
  return c.toDataURL('image/png');
}
