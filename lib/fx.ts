// visual effects helpers. webgl effects only run when the browser really
// supports it, so we probe once and cache the answer.

// hex color -> [r,g,b] in 0..1, for the ogl/three effects that want a vec3
export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

let cached: boolean | null = null;

export function webglSupported(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    cached = !!gl;
  } catch {
    cached = false;
  }
  return cached;
}
