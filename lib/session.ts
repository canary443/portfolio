// admin session token: sign, check, compare secrets.
// shared by the session api and the content api

import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

export const MAX_AGE = 60 * 60 * 12; // 12h

// session signing key: independent of the passphrase so the cookie can not be
// used to brute force it offline. set ADMIN_SESSION_SECRET in prod so all
// serverless instances share one key; otherwise a random per-process key is
// used (sessions drop on redeploy / across instances, still safe).
const SECRET = process.env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex');

// hash both sides so timingSafeEqual gets equal lengths
const digest = (s: string) => createHmac('sha256', SECRET).update(s).digest();
export const same = (a: string, b: string) => {
  const da = digest(a), db = digest(b);
  return da.length === db.length && timingSafeEqual(da, db);
};

// token is `exp.sig(exp)`; expiry is checked server-side so a copied cookie dies
const sign = (exp: number) => createHmac('sha256', SECRET).update('zx|' + exp).digest('hex');
export const makeToken = () => {
  const exp = Date.now() + MAX_AGE * 1000;
  return exp + '.' + sign(exp);
};
export const validToken = (tok: string | undefined) => {
  if (!tok) return false;
  const dot = tok.indexOf('.');
  if (dot < 0) return false;
  const exp = Number(tok.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return same(tok.slice(dot + 1), sign(exp));
};
