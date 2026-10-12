import { FEATURE_KEYS, EXAM_TYPES, publicUser, hashPassword, canCall } from './account-policy.js';
import { randomUUID } from 'node:crypto';
import { readClinicConfig } from './clinic-settings.js';

export function registerAccounts(app, db) {
  app.use('/api', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = token && db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    const timeout = readClinicConfig(db).security.session_timeout;
    if (session && timeout && Date.now() - Date.parse(session.last_activity_at || session.created_at) > timeout * 60_000) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    const user = token && db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?').get(token);
    req.account = user?.active ? publicUser(user) : null;
    next();
  });
  const admin = (req, res, next) => req.account?.role === 'admin' ? next() : res.status(403).json({ error: 'Connectez-vous avec un compte administrateur.' });
  app.post('/api/auth/activity', (req, res) => {
    if (!req.account) return res.status(401).json({ error: 'Session expirée.' });
    db.prepare('UPDATE sessions SET last_activity_at = ? WHERE token = ?').run(new Date().toISOString(), req.headers.authorization?.replace('Bearer ', ''));
    res.json({ ok: true });
  });
  // Current clinic mode: select an active account without entering credentials.
  app.get('/api/auth/accounts', (req, res) => res.json({
    roles: db.prepare('SELECT id, name FROM account_roles ORDER BY rowid').all(),
    accounts: db.prepare('SELECT id, name, role FROM users WHERE active = 1 ORDER BY name, id').all(),
  }));
  app.post('/api/auth/select-account', (req, res) => {
    if (!Number.isInteger(req.body.account_id)) return res.status(400).json({ error: 'Choisissez un compte.' });
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(req.body.account_id);
    if (!user) return res.status(404).json({ error: 'Ce compte est indisponible ou désactivé.' });
    const token = randomUUID();
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, user.id, new Date().toISOString());
    res.json({ token, user: publicUser(user) });
  });
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
  app.post('/api/accounts', admin, (req, res) => {
    try {
      const b = { ...req.body, username: req.body.username || `account_${randomUUID()}` };
      validate(b);
      if (b.password && (typeof b.password !== 'string' || b.password.length < 6)) throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
      const info = db.prepare('INSERT INTO users (username, password, name, role, email, created_at, features_json, call_exam_types_json, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(b.username.trim(), hashPassword(b.password || randomUUID()), b.name.trim(), b.role, b.email || '', new Date().toISOString(), JSON.stringify(b.features || {}), JSON.stringify(b.call_exam_types || EXAM_TYPES), b.active === false ? 0 : 1);
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
      if (current.role === 'admin' && (!b.active || b.role !== 'admin') && db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get().n <= 1) throw new Error('Conservez au moins un administrateur actif.');
      const echoDoctor = db.prepare("SELECT value FROM settings WHERE key = 'echo_call_doctor_id'").get()?.value;
      if (Number(echoDoctor) === current.id && (!b.active || b.role !== 'radiologist' || !canCall(b, { modality_name: 'Echo' }, null))) throw new Error("Libérez d'abord la réservation d'échographie de ce médecin.");
      if (b.password && (typeof b.password !== 'string' || b.password.length < 6)) throw new Error('Mot de passe trop court.');
      db.prepare('UPDATE users SET username = ?, name = ?, role = ?, email = ?, active = ?, features_json = ?, call_exam_types_json = ?, password = ? WHERE id = ?')
        .run(b.username.trim(), b.name.trim(), b.role, b.email || '', b.active ? 1 : 0, JSON.stringify(b.features), JSON.stringify(b.call_exam_types), b.password ? hashPassword(b.password) : current.password, current.id);
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(String(b.phone || ''), current.id);
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
