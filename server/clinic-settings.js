import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import Database from 'better-sqlite3';
import { defaultPrintingConfig, validatePrintingConfig } from './printing-policy.js';

export const MODULES = [
  ['dashboard', 'Tableau de bord', '/dashboard-2', ['dashboard', 'metrics']],
  ['patients', 'Patients', '/patients', ['patients', 'students']],
  ['appointments', 'Rendez-vous', '/rendez-vous', ['appointments']],
  ['queue', 'File d’attente', '/queue-management', ['queue']],
  ['reports', 'Comptes rendus', '/comptes-rendus', ['reports', 'report-templates']],
  ['prescriptions', 'Prescriptions', '/comptes-rendus', ['prescriptions']],
  ['images', 'Images', '/comptes-rendus', ['scans']],
  ['ready_files', 'Dossiers prêts', '/secretariat', ['ready-files']],
  ['payments', 'Règlements', '/payments', ['payments', 'student-payments', 'tariffs']],
  ['finance', 'Finance & Comptabilité', '/finance', ['finance', 'transactions']],
  ['chat', 'Messagerie interne', '/chat', ['messages', 'conversations', 'calls']],
  ['settings', 'Paramètres', '/settings/user', ['clinic-config', 'accounts', 'account-roles', 'rooms', 'equipment']],
];
const clone = value => JSON.parse(JSON.stringify(value));
export function defaultClinicConfig(db) {
  return {
    clinic: { name: db.prepare("SELECT value FROM settings WHERE key = 'clinic_name'").get()?.value || 'RadioMed — Clinique de Radiologie', legal_form: 'SARL', capital: '', nif: '', nis: '', rc: '', tax_number: '', address: '', postal_code: '', city: '', phone: '', email: '', website: '', bank: '', rib: '', currency: 'DZD', language: 'fr', timezone: 'Africa/Algiers', date_format: 'dd/MM/yyyy', logo: '' },
    taxes: { regime: 'Exonéré', items: [] },
    currencies: [{ code: 'DZD', name: 'Dinar algérien', rate: 1, active: true, updated_at: null }],
    payments: ['Espèces', 'Virement bancaire', 'Chèque', 'Carte bancaire', 'Prélèvement', 'Crédit patient', 'Chifa / Tiers Payant'].map((name, i) => ({ id: String(i + 1), name, active: i !== 4 })),
    documents: { conditions: '', footer: '', color: '#4f46e5', font: 'Inter', models: [
      { id: 'report-standard', name: 'Compte rendu standard', type: 'Compte rendu', default: true, body: 'Indication\n\nTechnique\n\nRésultats\n\nConclusion' },
      { id: 'report-detailed', name: 'Compte rendu détaillé', type: 'Compte rendu', default: false, body: 'Indication\n\nTechnique\n\nComparaison\n\nRésultats\n\nConclusion' },
      { id: 'prescription', name: 'Ordonnance médicale', type: 'Prescription', default: true, body: '' },
      { id: 'receipt', name: 'Quittance standard', type: 'Quittance', default: true, body: '' },
      { id: 'patient-file', name: 'Fiche patient', type: 'Fiche patient', default: true, body: '' },
      { id: 'ticket', name: 'Ticket d’appel', type: 'Ticket', default: true, body: '' },
    ] },
    notifications: { channels: { application: true, email: false, sms: false }, items: [
      { id: 'waiting', name: 'Attente prolongée', description: 'Patients en attente au-delà du seuil', active: true, threshold: 30, unit: 'minutes' },
      { id: 'unpaid', name: 'Règlement en attente', description: 'Reliquats de quittance à régler', active: true, threshold: 7, unit: 'jours' },
      { id: 'appointment', name: 'Rendez-vous urgent', description: 'Rendez-vous prioritaires du jour', active: true },
      { id: 'patient', name: 'Nouveau patient', description: 'Ajout d’un dossier patient', active: false },
      { id: 'payment', name: 'Paiement reçu', description: 'Confirmation des encaissements', active: true },
      { id: 'backup', name: 'Sauvegarde effectuée', description: 'Confirmation des sauvegardes locales', active: true },
      { id: 'daily', name: 'Rapport quotidien', description: 'Récapitulatif de l’activité du jour dans l’application', active: false },
    ] },
    security: { automatic_backup: false, backup_time: '03:00', retention: 30, encrypted_backup: true, session_timeout: 0 },
    permissions: {},
    printing: defaultPrintingConfig(),
  };
}
export function readClinicConfig(db) {
  const saved = db.prepare("SELECT value FROM settings WHERE key = 'clinic_config'").get();
  if (!saved) return defaultClinicConfig(db);
  const config = JSON.parse(saved.value);
  return { ...config, printing: config.printing || defaultPrintingConfig() };
}
export function attachClinicAudit(app, db) {
  db.exec('CREATE TABLE IF NOT EXISTS clinic_audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL)');
  app.use('/api', (req, res, next) => {
    res.on('finish', () => {
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || res.statusCode >= 400 || req.path.startsWith('/test/') || req.path === '/auth/activity') return;
      try { db.prepare('INSERT INTO clinic_audit_logs (user_id, actor, action, target, created_at) VALUES (?, ?, ?, ?, ?)').run(req.account?.id || null, req.account?.name || 'Session locale', req.method, req.originalUrl.split('?')[0], new Date().toISOString()); } catch { /* A closed server must not crash while finishing a response. */ }
    });
    next();
  });
}
function validateSection(section, data, db) {
  if (data == null || typeof data !== 'object' || JSON.stringify(data).length > 3_000_000) throw new Error('Paramètres invalides.');
  if (section === 'printing') return validatePrintingConfig(data, db.prepare('SELECT id FROM account_roles').all().map(r => r.id), db.prepare('SELECT id FROM users').all().map(u => u.id));
  if (section === 'clinic') {
    if (Object.keys(defaultClinicConfig(db).clinic).some(k => typeof data[k] !== 'string') || Object.entries(data).some(([k, v]) => typeof v !== 'string' || v.length > (k === 'logo' ? 2_800_000 : 2000))) throw new Error('Informations de la clinique invalides.');
    if (typeof data.name !== 'string' || !data.name.trim()) throw new Error('Le nom de la clinique est obligatoire.');
    if (data.capital && (!Number.isFinite(Number(data.capital)) || Number(data.capital) < 0)) throw new Error('Capital social invalide.');
    if (data.website) { try { if (!['https:', 'http:'].includes(new URL(data.website).protocol)) throw new Error(); } catch { throw new Error('Adresse du site web invalide.'); } }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Email invalide.');
    if (!['DZD', ...readClinicConfig(db).currencies.filter(c => c.active).map(c => c.code)].includes(data.currency)) throw new Error('Devise inactive.');
    if (data.logo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data.logo)) throw new Error('Utilisez une image PNG, JPG ou WebP.');
    if (!['fr', 'ar', 'en'].includes(data.language) || !['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'].includes(data.date_format)) throw new Error('Format régional invalide.');
    try { new Intl.DateTimeFormat('fr', { timeZone: data.timezone }); } catch { throw new Error('Fuseau horaire invalide.'); }
  }
  if (section === 'taxes') {
    if (!['Régime réel', 'Régime simplifié', 'Cabinet individuel', 'Exonéré'].includes(data.regime) || !Array.isArray(data.items) || data.items.length > 100 || data.items.some(t => !t.id || typeof t.name !== 'string' || !t.name.trim() || !Number.isFinite(t.rate) || t.rate < 0 || t.rate > 100 || typeof t.active !== 'boolean' || typeof t.default !== 'boolean') || new Set(data.items.map(t => t.id)).size !== data.items.length) throw new Error('Taux invalide (0 à 100 %).');
    if (data.items.filter(t => t.default).length > 1 || data.items.some(t => t.default && !t.active)) throw new Error('Choisissez un seul taux actif par défaut.');
  }
  if (section === 'currencies') {
    if (!Array.isArray(data) || data.length > 50 || data.some(c => !/^[A-Z]{3}$/.test(c.code) || !c.name?.trim() || !Number.isFinite(c.rate) || c.rate <= 0 || typeof c.active !== 'boolean')) throw new Error('Devise ou taux invalide.');
    if (new Set(data.map(c => c.code)).size !== data.length || !data.some(c => c.code === 'DZD' && c.active && c.rate === 1)) throw new Error('Le DZD est la référence (taux 1).');
    if (!data.some(c => c.code === readClinicConfig(db).clinic.currency && c.active)) throw new Error('Conservez la devise utilisée par la clinique active.');
  }
  if (section === 'payments' && (!Array.isArray(data) || !data.some(p => p.active) || data.length > 50 || data.some(p => !p.id || !p.name?.trim() || typeof p.active !== 'boolean'))) throw new Error('Conservez au moins un moyen de paiement actif.');
  if (section === 'documents') {
    if (typeof data.conditions !== 'string' || typeof data.footer !== 'string') throw new Error('Texte de document invalide.');
    if (!/^#[0-9a-fA-F]{6}$/.test(data.color) || !['Inter', 'Arial', 'Roboto', 'Times New Roman'].includes(data.font)) throw new Error('Couleur ou police invalide.');
    if (!Array.isArray(data.models) || data.models.length > 100 || data.models.some(m => !m.id || !m.name?.trim() || !['Compte rendu', 'Prescription', 'Quittance', 'Fiche patient', 'Ticket'].includes(m.type) || typeof m.body !== 'string')) throw new Error('Modèle invalide.');
    if (new Set(data.models.map(m => m.id)).size !== data.models.length || data.models.filter(m => m.default).some((m, i, a) => a.findIndex(x => x.type === m.type) !== i)) throw new Error('Choisissez un modèle par défaut par type de document.');
  }
  if (section === 'notifications') {
    const expected = defaultClinicConfig(db).notifications.items;
    if (!data.channels || ['application', 'email', 'sms'].some(k => typeof data.channels[k] !== 'boolean') || !Array.isArray(data.items) || data.items.length !== expected.length || new Set(data.items.map(n => n.id)).size !== expected.length || data.items.some(n => !expected.some(e => e.id === n.id) || typeof n.active !== 'boolean' || (['waiting', 'unpaid'].includes(n.id) && (!Number.isInteger(n.threshold) || n.threshold < 1 || n.threshold > 1440)))) throw new Error('Seuil invalide.');
    if (data.channels?.email || data.channels?.sms) throw new Error('Les canaux email et SMS nécessitent un service de messagerie configuré. Les notifications dans l’application sont disponibles.');
  }
  if (section === 'security' && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.backup_time) || !Number.isInteger(data.retention) || data.retention < 1 || data.retention > 365 || !Number.isInteger(data.session_timeout) || data.session_timeout < 0 || data.session_timeout > 1440 || typeof data.automatic_backup !== 'boolean' || typeof data.encrypted_backup !== 'boolean')) throw new Error('Paramètres de sauvegarde ou de session invalides.');
  if (section === 'permissions') {
    const roles = db.prepare('SELECT id FROM account_roles').all().map(r => r.id);
    for (const [role, policy] of Object.entries(data)) {
      if (!roles.includes(role) || Object.keys(policy).some(k => !MODULES.some(m => m[0] === k)) || Object.values(policy).some(p => !p || Object.keys(p).some(a => !['view', 'create', 'edit', 'delete'].includes(a)) || Object.values(p).some(v => typeof v !== 'boolean'))) throw new Error('Permissions invalides.');
      if (role === 'admin' && Object.values(policy).some(p => Object.values(p).some(v => !v))) throw new Error('Le rôle administrateur conserve tous les droits.');
    }
  }
  return clone(data);
}
export function registerClinicSettings(app, db, uploadsDir) {
  const admin = (req, res, next) => req.account?.role === 'admin' ? next() : res.status(403).json({ error: 'Choisissez un compte administrateur pour modifier ces paramètres.' });
  const backupDir = path.join(path.dirname(db.name), `${path.basename(db.name)}-backups`);
  const keyPath = path.join(backupDir, '.backup-key');
  const key = () => { mkdirSync(backupDir, { recursive: true }); if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600 }); return readFileSync(keyPath); };
  const backups = () => existsSync(backupDir) ? readdirSync(backupDir).filter(name => /^backup-[\w-]+\.cima$/.test(name)).map(name => ({ name, size: statSync(path.join(backupDir, name)).size, created_at: statSync(path.join(backupDir, name)).mtime.toISOString() })).sort((a, b) => b.created_at.localeCompare(a.created_at)) : [];
  const audit = (actor, action, target) => db.prepare('INSERT INTO clinic_audit_logs (actor, action, target, created_at) VALUES (?, ?, ?, ?)').run(actor, action, target, new Date().toISOString());
  function backup(actor = 'Sauvegarde automatique') {
    const config = readClinicConfig(db);
    const snapshot = db.serialize();
    // A serialized snapshot is self-contained: use rollback journal mode rather than WAL sidecars.
    snapshot[18] = 1; snapshot[19] = 1;
    const archive = { format: 'CIMA-clinic-backup-v1', database: snapshot.toString('base64'), uploads: {} };
    if (existsSync(uploadsDir)) for (const name of readdirSync(uploadsDir)) if (/^[\w.-]+$/.test(name) && statSync(path.join(uploadsDir, name)).isFile()) archive.uploads[name] = readFileSync(path.join(uploadsDir, name)).toString('base64');
    let buffer = gzipSync(Buffer.from(JSON.stringify(archive)));
    if (config.security.encrypted_backup) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      buffer = Buffer.concat([Buffer.from('CIMAENC1'), iv, cipher.getAuthTag(), encrypted]);
    } else buffer = Buffer.concat([Buffer.from('CIMAGZ01'), buffer]);
    mkdirSync(backupDir, { recursive: true });
    const name = `backup-${Date.now()}-${randomUUID()}.cima`;
    writeFileSync(path.join(backupDir, name), buffer, { mode: 0o600 });
    for (const old of backups().slice(config.security.retention)) unlinkSync(path.join(backupDir, old.name));
    audit(actor, 'Sauvegarde créée', name);
    return backups().find(b => b.name === name);
  }
  app.use('/api', (req, res, next) => {
    const config = readClinicConfig(db);
    if (req.account?.role === 'admin') return next();
    const module = MODULES.find(m => m[3].some(prefix => req.path === `/${prefix}` || req.path.startsWith(`/${prefix}/`)));
    const policy = req.account && module && config.permissions[req.account.role]?.[module[0]];
    const modifiesExisting = req.method === 'POST' && /^\/(reports\/[^/]+\/(validate|print)|queue\/(reset|pause))$/.test(req.path);
    const action = modifiesExisting ? 'edit' : ['GET', 'HEAD'].includes(req.method) ? 'view' : req.method === 'DELETE' ? 'delete' : ['PUT', 'PATCH'].includes(req.method) ? 'edit' : 'create';
    if (policy && (!policy.view || !policy[action])) return res.status(403).json({ error: 'Cette action est désactivée pour votre rôle.' });
    next();
  });
  app.get('/api/clinic-preferences', (req, res) => {
    if (!req.account) return res.status(401).json({ error: 'Choisissez un compte.' });
    const c = readClinicConfig(db);
    res.json({ clinic: c.clinic, documents: c.documents, payments: c.payments, currencies: c.currencies, taxes: c.taxes, security: { session_timeout: c.security.session_timeout }, permissions: c.permissions });
  });
  app.get('/api/clinic-config', admin, (req, res) => res.json(readClinicConfig(db)));
  app.put('/api/clinic-config/:section', admin, (req, res) => {
    try {
      const c = readClinicConfig(db), section = req.params.section;
      if (!Object.hasOwn(c, section)) return res.status(404).json({ error: 'Rubrique inconnue.' });
      c[section] = validateSection(section, req.body, db);
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('clinic_config', JSON.stringify(c));
      if (section === 'clinic') db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('clinic_name', c.clinic.name);
      res.json(c[section]);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });
  app.get('/api/clinic-config/users-meta', admin, (req, res) => res.json(db.prepare('SELECT u.id, MAX(s.created_at) AS last_login FROM users u LEFT JOIN sessions s ON s.user_id = u.id GROUP BY u.id').all()));
  app.get('/api/clinic-config/journal', admin, (req, res) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '';
    res.json(db.prepare('SELECT * FROM clinic_audit_logs WHERE created_at >= ? ORDER BY id DESC LIMIT 500').all(date));
  });
  app.get('/api/clinic-config/system', admin, (req, res) => res.json({ version: 'RadioMed OS 1.0.0', mode: 'Poste local / réseau privé', database_size: statSync(db.name).size, connected_users: db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM sessions').get().n, backups: backups() }));
  app.post('/api/clinic-config/backup', admin, (req, res) => { try { res.status(201).json(backup(req.account.name)); } catch { res.status(500).json({ error: 'La sauvegarde n’a pas pu être créée.' }); } });
  app.get('/api/clinic-config/backup/:name', admin, (req, res) => {
    if (!backups().some(b => b.name === req.params.name)) return res.status(404).json({ error: 'Sauvegarde introuvable.' });
    res.download(path.join(backupDir, req.params.name));
  });
  app.post('/api/clinic-config/restore', admin, (req, res) => {
    let source, stage, previous, moved = false, committed = false;
    try {
      if (req.body.confirmation !== 'RESTAURER') throw new Error('Confirmez la restauration.');
      let buffer;
      if (req.body.name) { if (!backups().some(b => b.name === req.body.name)) throw new Error('Sauvegarde introuvable.'); buffer = readFileSync(path.join(backupDir, req.body.name)); }
      else if (typeof req.body.data === 'string' && req.body.data.length < 19_000_000) buffer = Buffer.from(req.body.data, 'base64');
      else throw new Error('Fichier de sauvegarde invalide.');
      const header = buffer.subarray(0, 8).toString();
      if (header === 'CIMAENC1') { const decipher = createDecipheriv('aes-256-gcm', key(), buffer.subarray(8, 20)); decipher.setAuthTag(buffer.subarray(20, 36)); buffer = Buffer.concat([decipher.update(buffer.subarray(36)), decipher.final()]); }
      else if (header === 'CIMAGZ01') buffer = buffer.subarray(8);
      else throw new Error('Format de sauvegarde inconnu.');
      const archive = JSON.parse(gunzipSync(buffer, { maxOutputLength: 200_000_000 }).toString());
      if (archive.format !== 'CIMA-clinic-backup-v1' || !archive.database || !archive.uploads || Array.isArray(archive.uploads)) throw new Error('Archive invalide.');
      for (const [name, data] of Object.entries(archive.uploads)) if (!/^[\w.-]+$/.test(name) || name === '.' || name === '..' || typeof data !== 'string' || !/^[A-Za-z0-9+/=]*$/.test(data)) throw new Error('Image de sauvegarde invalide.');
      const snapshot = Buffer.from(archive.database, 'base64');
      if (snapshot.subarray(0, 16).toString() !== 'SQLite format 3\0') throw new Error('Base de sauvegarde invalide.');
      snapshot[18] = 1; snapshot[19] = 1;
      source = new Database(snapshot, { readonly: true });
      if (source.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Base de sauvegarde endommagée.');
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
      const records = tables.map(name => {
        const columns = db.prepare(`PRAGMA table_info("${name}")`).all().map(c => c.name);
        const sourceColumns = source.prepare(`PRAGMA table_info("${name}")`).all().map(c => c.name);
        if (!columns.every(c => sourceColumns.includes(c))) throw new Error('Cette sauvegarde n’est pas compatible avec la version installée.');
        return { name, columns, rows: source.prepare(`SELECT ${columns.map(c => `"${c}"`).join(',')} FROM "${name}"`).all() };
      });
      if (!records.find(t => t.name === 'users')?.rows.some(u => u.role === 'admin' && u.active)) throw new Error('Cette sauvegarde doit contenir un administrateur actif.');
      const safety = backup(req.account.name);
      // Stage the entire image directory and retain the current directory until SQL commits.
      stage = `${uploadsDir}-restore-${randomUUID()}`;
      previous = `${uploadsDir}-previous-${randomUUID()}`;
      mkdirSync(stage, { recursive: true });
      for (const [name, data] of Object.entries(archive.uploads)) writeFileSync(path.join(stage, name), Buffer.from(data, 'base64'));
      const foreignKeys = db.pragma('foreign_keys', { simple: true });
      db.pragma('foreign_keys = OFF');
      try {
        db.transaction(() => {
          for (const t of records) db.prepare(`DELETE FROM "${t.name}"`).run();
          for (const t of records) { const insert = db.prepare(`INSERT INTO "${t.name}" (${t.columns.map(c => `"${c}"`).join(',')}) VALUES (${t.columns.map(() => '?').join(',')})`); for (const row of t.rows) insert.run(...t.columns.map(c => row[c])); }
          if (db.pragma('foreign_key_check').length) throw new Error('Les liens entre dossiers de la sauvegarde sont invalides.');
          db.prepare('DELETE FROM sessions').run();
          if (existsSync(uploadsDir)) renameSync(uploadsDir, previous);
          try { renameSync(stage, uploadsDir); moved = true; }
          catch (err) { if (existsSync(previous)) renameSync(previous, uploadsDir); throw err; }
        })();
        committed = true;
      } finally { db.pragma(`foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`); }
      audit(req.account.name, 'Sauvegarde restaurée', safety.name);
      res.json({ message: 'Sauvegarde restaurée. Choisissez à nouveau un compte.', safety_backup: safety });
    } catch (err) {
      if (moved && !committed) { rmSync(uploadsDir, { recursive: true, force: true }); if (existsSync(previous)) renameSync(previous, uploadsDir); }
      res.status(400).json({ error: ['Unsupported state or unable to authenticate data'].includes(err.message) ? 'Impossible de déchiffrer cette sauvegarde sur ce poste.' : err.message });
    }
    finally { source?.close(); if (stage && existsSync(stage)) rmSync(stage, { recursive: true, force: true }); if (committed && previous && existsSync(previous)) rmSync(previous, { recursive: true, force: true }); }
  });
  app.post('/api/clinic-config/reset', admin, (req, res) => {
    if (req.body.confirmation !== 'REINITIALISER') return res.status(400).json({ error: 'Confirmez la réinitialisation des paramètres.' });
    try { const safety = backup(req.account.name); db.prepare("DELETE FROM settings WHERE key = 'clinic_config'").run(); res.json({ config: readClinicConfig(db), safety_backup: safety }); }
    catch { res.status(500).json({ error: 'La réinitialisation n’a pas pu être effectuée.' }); }
  });
  const timer = setInterval(() => {
    try {
      const c = readClinicConfig(db), now = new Date(), localTime = new Intl.DateTimeFormat('sv-SE', { timeZone: c.clinic.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
      const date = new Intl.DateTimeFormat('sv-SE', { timeZone: c.clinic.timezone }).format(now);
      const last = db.prepare("SELECT value FROM settings WHERE key = 'last_automatic_backup'").get()?.value;
      if (c.security.automatic_backup && localTime >= c.security.backup_time && date !== last) { backup(); db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('last_automatic_backup', date); }
    } catch (err) { console.error('Échec de sauvegarde automatique:', err.message); }
  }, 60_000);
  timer.unref();
}
