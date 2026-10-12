import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export function productionAccess({ enabled = process.env.NODE_ENV === 'production', username = process.env.APP_ACCESS_USERNAME || 'clinique', password = process.env.APP_ACCESS_PASSWORD } = {}) {
  if (!enabled) return (req, res, next) => next();
  if (!password || password.length < 16) throw new Error('Configurez APP_ACCESS_PASSWORD avec au moins 16 caractères avant le déploiement.');
  const digest = value => createHash('sha256').update(value).digest();
  const expected = digest(`${username}:${password}`);
  const sign = expiry => createHmac('sha256', password).update(`${username}:${expiry}`).digest('hex');
  return (req, res, next) => {
    // Railway's liveness probe contains no patient information.
    if (req.method === 'GET' && req.path === '/api/health') return next();
    const authorization = req.headers.authorization || '';
    // The signed HttpOnly cookie keeps the site gate separate from app Bearer sessions.
    const cookie = /(?:^|;\s*)cima-access=(\d+)\.([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '');
    if (cookie && Number(cookie[1]) > Date.now() && timingSafeEqual(Buffer.from(cookie[2], 'hex'), Buffer.from(sign(cookie[1]), 'hex'))) return next();
    const basic = authorization.startsWith('Basic ') ? authorization : '';
    const credentials = basic.startsWith('Basic ') ? Buffer.from(basic.slice(6), 'base64').toString('utf8') : '';
    if (credentials && timingSafeEqual(digest(credentials), expected)) {
      const expiry = String(Date.now() + 12 * 60 * 60 * 1000);
      res.cookie('cima-access', `${expiry}.${sign(expiry)}`, { httpOnly: true, secure: req.secure, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000, path: '/' });
      return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Clinique CIMA", charset="UTF-8"');
    res.status(401).send('Connexion requise pour accéder à la clinique.');
  };
}
