// the pixel trail cursor is webgl, so we probe support once and cache it.

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
