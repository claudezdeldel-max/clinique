import { FEATURE_KEYS, EXAM_TYPES, publicUser, hashPassword, verifyPassword, canCall } from './account-policy.js';
import { randomUUID } from 'node:crypto';
import { readClinicConfig } from './clinic-settings.js';

export function registerAccounts(app, db) {
  // Enable password-only authentication once; sessions from the old account picker expire.
  db.transaction(() => {
    if (db.prepare("SELECT value FROM settings WHERE key = 'password_login_v1'").get()) return;
    let owner = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!owner) {
      const result = db.prepare('INSERT INTO users (username,password,name,role,email,created_at) VALUES (?,?,?,?,?,?)').run('admin', hashPassword('admin'), 'Super administrateur', 'admin', '', new Date().toISOString());
      owner = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
    db.prepare("UPDATE users SET password = ?, role = 'admin', active = 1, is_super_admin = 1, features_json = '{}' WHERE id = ?").run(hashPassword('admin'), owner.id);
    for (const user of db.prepare('SELECT id,password FROM users').all()) {
      if (user.id !== owner.id && verifyPassword('admin', user.password)) db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(randomUUID()), user.id);
      else if (!user.password.startsWith('scrypt:')) db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(user.password), user.id);
    }
    db.prepare('DELETE FROM sessions').run();
    db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('password_login_v1','enabled')").run();
  })();
  app.use('/api', (req, res, next) => {
    const cookieToken = req.headers.cookie?.match(/(?:^|;\s*)cima_session=([a-zA-Z0-9-]+)/)?.[1];
    const token = req.headers.authorization?.replace('Bearer ', '') || cookieToken;
    const session = token && db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    const timeout = readClinicConfig(db).security.session_timeout;
    if (session && timeout && Date.now() - Date.parse(session.last_activity_at || session.created_at) > timeout * 60_000) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    const user = token && db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?').get(token);
    req.account = user?.active && session?.auth_method === 'password' ? publicUser(user) : null;
    if (req.account && token !== cookieToken) res.cookie('cima_session', token, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });
    next();
  });
  const admin = (req, res, next) => req.account?.role === 'admin' ? next() : res.status(403).json({ error: 'Connectez-vous avec un compte administrateur.' });
  const attempts = new Map();
  app.post('/api/auth/login', (req, res) => {
    const password = req.body?.password;
    if (typeof password !== 'string' || !password || password.length > 128) return res.status(400).json({ error: 'Saisissez votre mot de passe.' });
    const address = req.socket.remoteAddress;
    const now = Date.now(), previous = attempts.get(address);
    const entry = previous && previous.until > now ? previous : { count: 0, until: now + 10 * 60000 };
    if (entry.count >= 10) return res.status(429).set('Retry-After', String(Math.ceil((entry.until - now) / 1000))).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
    try {
      const matches = db.prepare('SELECT * FROM users WHERE active = 1').all().filter(u => verifyPassword(password, u.password));
      if (matches.length !== 1) {
        entry.count++; attempts.set(address, entry);
        if (attempts.size > 1000) for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
        return res.status(401).json({ error: matches.length > 1 ? 'Ce mot de passe est partagé par plusieurs comptes. Demandez à l’administrateur de définir des mots de passe distincts.' : 'Mot de passe incorrect ou compte désactivé.' });
      }
      attempts.delete(address);
      const user = matches[0], token = randomUUID();
      db.prepare("INSERT INTO sessions (token,user_id,created_at,last_activity_at,auth_method) VALUES (?,?,?,?,'password')").run(token, user.id, new Date().toISOString(), new Date().toISOString());
      res.cookie('cima_session', token, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });
      res.set('Cache-Control', 'no-store').json({ token, user: publicUser(user) });
    } catch { res.status(500).json({ error: 'Connexion indisponible. Réessayez.' }); }
  });
  // Protect every API route, including uploads and legacy data endpoints.
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' && ['GET', 'HEAD'].includes(req.method)) return next();
    if (!req.account) return res.status(401).json({ error: 'Connectez-vous avec votre mot de passe.' });
    if ((req.path === '/settings' || req.path.startsWith('/settings/')) && req.account.role !== 'admin') return res.status(403).json({ error: 'Les paramètres sont réservés à l’administrateur.' });
    if (req.path.startsWith('/settings/') && ['password_login_v1', 'echo_call_doctor_id', 'clinic_config'].includes(req.path.slice('/settings/'.length))) return res.status(403).json({ error: 'Utilisez la rubrique dédiée dans les paramètres.' });
    next();
  });
  app.post('/api/auth/activity', (req, res) => {
    if (!req.account) return res.status(401).json({ error: 'Session expirée.' });
    db.prepare('UPDATE sessions SET last_activity_at = ? WHERE token = ?').run(new Date().toISOString(), req.headers.authorization?.replace('Bearer ', ''));
    res.json({ ok: true });
  });
  app.get('/api/auth/accounts', admin, (req, res) => res.json({
    roles: db.prepare('SELECT id, name FROM account_roles ORDER BY rowid').all(),
    accounts: db.prepare('SELECT id, name, role FROM users WHERE active = 1 ORDER BY name, id').all(),
  }));
  app.post('/api/auth/select-account', (req, res) => res.status(410).json({ error: 'La connexion nécessite désormais le mot de passe du compte.' }));
  app.post('/api/account-roles', admin, (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 100) return res.status(400).json({ error: 'Saisissez un nom de rôle (100 caractères maximum).' });
    const role = { id: `role_${randomUUID()}`, name };
    try {
      db.prepare('INSERT INTO account_roles (id, name) VALUES (?, ?)').run(role.id, role.name);
      res.status(201).json(role);
    } catch { res.status(400).json({ error: 'Ce rôle existe déjà.' }); }
  });
  app.get('/api/accounts', admin, (req, res) => res.json(db.prepare('SELECT * FROM users ORDER BY id').all().map(publicUser)));
  function validate(data) {
    if (!db.prepare('SELECT id FROM account_roles WHERE id = ?').get(data.role)) throw new Error('Rôle invalide');
    if (!data.username?.trim() || !data.name?.trim()) throw new Error('Nom et identifiant requis');
    if (data.email && (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) throw new Error('Email invalide.');
    if (data.phone && (typeof data.phone !== 'string' || data.phone.length > 40 || !/^[+\d\s().-]+$/.test(data.phone))) throw new Error('Téléphone invalide.');
    if (data.features && (Object.keys(data.features).some(k => !FEATURE_KEYS.includes(k)) || Object.values(data.features).some(v => typeof v !== 'boolean'))) throw new Error('Fonctions invalides');
    if (data.call_exam_types && (!Array.isArray(data.call_exam_types) || data.call_exam_types.some(k => !EXAM_TYPES.includes(k)))) throw new Error("Types d'examen invalides");
  }
  function validatePassword(password, currentId) {
    if (typeof password !== 'string' || password.length < 4 || password.length > 128) throw new Error('Le mot de passe doit comporter entre 4 et 128 caractères.');
    if (password === 'admin') throw new Error('Le mot de passe « admin » est réservé au super administrateur.');
    if (db.prepare('SELECT id,password FROM users WHERE id != ?').all(currentId || 0).some(u => verifyPassword(password, u.password))) throw new Error('Ce mot de passe est déjà utilisé. Choisissez un mot de passe distinct.');
  }
  app.post('/api/accounts', admin, (req, res) => {
    try {
      const b = { ...req.body, username: req.body.username || `account_${randomUUID()}` };
      validate(b);
      validatePassword(b.password);
      const info = db.prepare('INSERT INTO users (username, password, name, role, email, created_at, features_json, call_exam_types_json, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(b.username.trim(), hashPassword(b.password), b.name.trim(), b.role, b.email || '', new Date().toISOString(), JSON.stringify(b.features || {}), JSON.stringify(b.call_exam_types || EXAM_TYPES), b.active === false ? 0 : 1);
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(String(b.phone || ''), info.lastInsertRowid);
      res.status(201).json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)));
    } catch (err) { res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Cet identifiant existe déjà.' : err.message }); }
  });
  app.put('/api/accounts/:id', admin, (req, res) => {
    try {
      const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
      if (!current) return res.status(404).json({ error: 'Compte introuvable' });
      const b = { ...publicUser(current), ...req.body };
      validate(b);
      if (current.is_super_admin && (!b.active || b.role !== 'admin' || b.username !== current.username || b.password || Object.values(b.features || {}).some(v => v === false))) throw new Error('Le compte super administrateur et son accès sont protégés.');
      if (b.password) validatePassword(b.password, current.id);
      if (current.role === 'admin' && (!b.active || b.role !== 'admin') && db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get().n <= 1) throw new Error('Conservez au moins un administrateur actif.');
      const echoDoctor = db.prepare("SELECT value FROM settings WHERE key = 'echo_call_doctor_id'").get()?.value;
      if (Number(echoDoctor) === current.id && (!b.active || b.role !== 'radiologist' || !canCall(b, { modality_name: 'Echo' }, null))) throw new Error("Libérez d'abord la réservation d'échographie de ce médecin.");
      db.prepare('UPDATE users SET username = ?, name = ?, role = ?, email = ?, active = ?, features_json = ?, call_exam_types_json = ?, password = ? WHERE id = ?')
        .run(b.username.trim(), b.name.trim(), b.role, b.email || '', b.active ? 1 : 0, JSON.stringify(b.features), JSON.stringify(b.call_exam_types), b.password ? hashPassword(b.password) : current.password, current.id);
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(String(b.phone || ''), current.id);
      if (b.password || !b.active || b.role !== current.role) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(current.id);
      res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(current.id)));
    } catch (err) { res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Cet identifiant existe déjà.' : err.message }); }
  });
  app.get('/api/call-policy', (req, res) => res.json({ echo_doctor_id: Number(db.prepare("SELECT value FROM settings WHERE key = 'echo_call_doctor_id'").get()?.value) || null }));
  app.put('/api/call-policy', admin, (req, res) => {
    const id = req.body.echo_doctor_id;
    const doctor = id && db.prepare("SELECT * FROM users WHERE id = ? AND role = 'radiologist' AND active = 1").get(id);
    if (id && !doctor) return res.status(400).json({ error: 'Sélectionnez un médecin actif.' });
    if (doctor && !canCall(publicUser(doctor), { modality_name: 'Echo' }, null)) return res.status(400).json({ error: "Activez l'appel d'échographie pour ce médecin avant de le sélectionner." });
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('echo_call_doctor_id', String(id || ''));
    res.json({ echo_doctor_id: Number(id) || null });
  });
  // Apply feature permissions at the API as well as in the interface.
  app.use('/api', (req, res, next) => {
    const feature = req.path.startsWith('/reports') ? 'reports' : req.path.startsWith('/prescriptions') ? 'prescriptions' : req.path.startsWith('/ready-files') ? 'ready_files' : null;
    if (feature && (!req.account || !req.account.features[feature])) return res.status(403).json({ error: 'Connectez-vous à un compte autorisé pour cette fonction.' });
    if (req.method === 'PUT' && req.path === '/settings/echo_call_doctor_id') return res.status(403).json({ error: "Utilisez les paramètres d'appel des comptes." });
    next();
  });
}
