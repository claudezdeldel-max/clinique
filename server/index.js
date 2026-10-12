import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db, { initDatabase, resetDatabase } from './db.js';
import { registerAccounts } from './accounts.js';
import { registerClinicResources } from './clinic-resources.js';
import { attachClinicAudit, registerClinicSettings, readClinicConfig } from './clinic-settings.js';
import sanitizeHtml from 'sanitize-html';
import { publicUser, verifyPassword, hashPassword, canCall } from './account-policy.js';
import { registerPrinting } from './printing.js';
import { registerPatientVisits } from './patient-visits.js';
import { registerFinance } from './finance.js';
import { serveProductionApp } from './production-static.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = process.env.UPLOADS_PATH ? path.resolve(process.env.UPLOADS_PATH) : path.join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Initialize Radio Clinic SQLite Database
initDatabase();
attachClinicAudit(app, db);
registerAccounts(app, db);
registerClinicResources(app, db);
registerClinicSettings(app, db, uploadsDir);
registerPrinting(app, db);
registerPatientVisits(app, db);
registerFinance(app, db);

const cleanReport = html => sanitizeHtml(String(html || ''), {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'u', 's']),
  allowedAttributes: { '*': ['style'], a: ['href'] },
  allowedStyles: { '*': { 'text-align': [/^(left|center|right|justify)$/], 'font-weight': [/^(bold|normal|[1-9]00)$/], 'font-style': [/^(italic|normal)$/], 'text-decoration': [/^(underline|line-through)$/], 'background-color': [/^#[0-9a-fA-F]{3,8}$/], color: [/^#[0-9a-fA-F]{3,8}$/] } },
});

// Test DB Reset Endpoint
app.post('/api/test/reset', (req, res) => {
  if (process.env.NODE_ENV !== 'test') return res.status(404).json({ error: 'Non disponible' });
  try {
    resetDatabase();
    res.json({ status: 'ok', message: 'Database reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'RadioMed OS (Clinique de Radiologie)', database: 'connected (SQLite)' });
});

// Serve uploaded scan files
app.use('/api/uploads', express.static(uploadsDir));

// ===== Authentication API =====
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Identifiants requis' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !user.active || !verifyPassword(password, user.password)) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    if (!user.password.startsWith('scrypt:')) db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), user.id);

    const token = randomUUID();
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, user.id, new Date().toISOString());

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ message: 'Déconnexion réussie' });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.account) return res.status(401).json({ error: 'Session expirée' });
  return res.json({ user: req.account });
});

// ===== Scan Upload API =====
app.post('/api/scans/upload', (req, res) => {
  try {
    if (!req.account?.features.images) return res.status(403).json({ error: 'Images désactivées pour ce compte.' });
    if (req.body?.data) {
      const { data, filename } = req.body;
      if (typeof data !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(data)) return res.status(400).json({ error: 'Format image invalide' });
      const extension = data.startsWith('data:image/jpeg') ? '.jpg' : data.startsWith('data:image/webp') ? '.webp' : '.png';
      const fileName = `scan-${randomUUID()}${extension}`;
      writeFileSync(path.join(uploadsDir, fileName), Buffer.from(data.split(',')[1], 'base64'));
      return res.status(201).json({ url: `/api/uploads/${fileName}`, fileName, originalName: filename });
    }
    const contentType = req.headers['content-type'] || '';
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);

      if (contentType.includes('multipart/form-data')) {
        const boundary = '--' + contentType.split('boundary=')[1];
        const parts = buffer.toString('binary').split(boundary).filter(p => p.includes('filename'));
        if (parts.length === 0) return res.status(400).json({ error: 'Aucun fichier reçu' });

        const part = parts[0];
        const headerEnd = part.indexOf('\r\n\r\n') + 4;
        const headerSection = part.substring(0, headerEnd);
        const filenameMatch = headerSection.match(/filename="([^"]+)"/);
        const originalName = filenameMatch ? filenameMatch[1] : 'scan.png';
        const ext = path.extname(originalName) || '.png';
        const fileName = `scan-${Date.now()}${ext}`;
        const filePath = path.join(uploadsDir, fileName);

        const bodyEnd = part.lastIndexOf('\r\n');
        const fileData = Buffer.from(part.substring(headerEnd, bodyEnd), 'binary');
        writeFileSync(filePath, fileData);

        const url = `/api/uploads/${fileName}`;
        res.status(201).json({ url, fileName, size: fileData.length });
      } else {
        const { data, filename } = JSON.parse(buffer.toString());
        if (!data) return res.status(400).json({ error: 'Aucune donnée reçue' });
        const ext = path.extname(filename || '.png') || '.png';
        const fileName = `scan-${Date.now()}${ext}`;
        const filePath = path.join(uploadsDir, fileName);
        const base64Data = data.replace(/^data:[^;]+;base64,/, '');
        writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        const url = `/api/uploads/${fileName}`;
        res.status(201).json({ url, fileName });
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Metrics API
app.get('/api/metrics', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM metrics').all();
    const metricsMap = {};
    rows.forEach(r => { metricsMap[r.key] = r; });
    res.json(metricsMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function calcAgeFromBirthDate(birthDateStr, fallbackAge) {
  const parsed = fallbackAge === null || fallbackAge === undefined || String(fallbackAge).trim() === '' ? null : Number(fallbackAge);
  const fallback = Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  if (!birthDateStr) return fallback;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return fallback;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : fallback;
}

// ===== Patients API =====
app.get('/api/patients', (req, res) => {
  try {
    const { search, status, gender, blood_group, sort, page = '1', page_size = '50' } = req.query;

    let sql = 'SELECT * FROM patients WHERE 1=1';
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR social_sec_no LIKE ? OR id = ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?)";
      const queryStr = `%${search}%`;
      const numSearch = parseInt(search) || 0;
      const phoneSearch = /^[+\d\s().-]+$/.test(String(search)) ? `%${String(search).replace(/[^+\d]/g, '')}%` : null;
      params.push(queryStr, queryStr, queryStr, queryStr, queryStr, numSearch, phoneSearch);
    }

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (gender && gender !== 'all') {
      sql += ' AND gender = ?';
      params.push(gender);
    }

    if (blood_group && blood_group !== 'all') {
      sql += ' AND blood_group = ?';
      params.push(blood_group);
    }

    // Count query
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countSql).get(...params);
    const total = totalRow ? totalRow.total : 0;

    // Sorting
    if (sort === 'name_asc') sql += ' ORDER BY name ASC';
    else if (sort === 'name_desc') sql += ' ORDER BY name DESC';
    else sql += ' ORDER BY id DESC';

    // Pagination
    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = db.prepare(sql).all(...params);
    items.forEach(item => {
      item.age = calcAgeFromBirthDate(item.birth_date, item.age);
    });
    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy /students endpoint alias for compatibility
app.get('/api/students', (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY id DESC').all();
    patients.forEach(item => {
      item.age = calcAgeFromBirthDate(item.birth_date, item.age);
      item.grade = item.age === null ? '' : String(item.age);
      item.parent_phone = item.phone || '';
    });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/patients', '/api/students'], (req, res) => {
  try {
    const b = req.path === '/api/students' ? { ...req.body, age: req.body.age ?? req.body.grade, phone: req.body.phone ?? req.body.parent_phone } : req.body;
    const name = String(b.name || `${b.first_name || ''} ${b.last_name || ''}`).trim();
    if (!name) return res.status(400).json({ error: 'Le nom du patient est obligatoire.' });
    const socialSecNo = String(b.social_sec_no || '').trim() || null;
    if (socialSecNo && db.prepare('SELECT id FROM patients WHERE social_sec_no = ?').get(socialSecNo)) return res.status(409).json({ error: 'Ce numéro de sécurité sociale appartient déjà à un dossier patient. Sélectionnez ce dossier ou vérifiez le numéro.' });
    const dateStr = new Date().toISOString().split('T')[0];

    const birthDate = b.birth_date || '';
    const computedAge = calcAgeFromBirthDate(birthDate);
    if (birthDate && computedAge === null) return res.status(400).json({ error: 'Date de naissance invalide.' });

    const stmt = db.prepare(`
      INSERT INTO patients (
        name, first_name, last_name, email, age, gender, social_sec_no, phone, prescribing_doctor,
        created_at, birth_date, nationality, marital_status, address, profession, emergency_contact,
        insurance_type, insurance_number, blood_group, weight, height, allergies_json, allergies_notes,
        history_json, history_notes, requested_exam, notes, photo_url, status, last_visit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      name,
      b.first_name || '',
      b.last_name || '',
      b.email || '',
      computedAge,
      b.gender || '',
      socialSecNo,
      b.phone || '',
      b.prescribing_doctor || '',
      dateStr,
      birthDate,
      b.nationality || '',
      b.marital_status || '',
      b.address || '',
      b.profession || '',
      b.emergency_contact || '',
      b.insurance_type || '',
      b.insurance_number || '',
      b.blood_group || '',
      b.weight === '' || b.weight == null ? null : Number(b.weight),
      b.height === '' || b.height == null ? null : Number(b.height),
      typeof b.allergies_json === 'string' ? b.allergies_json : JSON.stringify(b.allergies_json || []),
      b.allergies_notes || '',
      typeof b.history_json === 'string' ? b.history_json : JSON.stringify(b.history_json || []),
      b.history_notes || '',
      b.requested_exam || '',
      b.notes || '',
      b.photo_url || '',
      b.status || 'Actif',
      dateStr
    );

    const newPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newPatient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/patients/export.csv', (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY id DESC').all();
    let csv = 'ID;Nom;Âge;Sexe;Téléphone;Email;Assurance;Groupe Sanguin;Statut\n';
    patients.forEach(p => {
      csv += `${p.id};"${p.name}";${p.age};"${p.gender}";"${p.phone}";"${p.email}";"${p.insurance_type}";"${p.blood_group}";"${p.status}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="patients.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patients/bulk', (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs requis' });

    if (action === 'archive') {
      const stmt = db.prepare('UPDATE patients SET status = ? WHERE id = ?');
      ids.forEach(id => stmt.run('Archivé', id));
    } else if (action === 'delete') {
      if (ids.some(patientHasRecords)) return res.status(409).json({ error: 'Certains patients possèdent un historique. Archivez les dossiers sélectionnés pour le conserver.' });
      const stmt = db.prepare('DELETE FROM patients WHERE id = ?');
      ids.forEach(id => stmt.run(id));
    } else {
      return res.status(400).json({ error: 'Action invalide' });
    }

    res.json({ message: `Action '${action}' effectuée sur ${ids.length} patients` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/patients/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const notes = db.prepare('SELECT * FROM patient_notes WHERE patient_id = ? ORDER BY id DESC').all(req.params.id);
    const history = db.prepare('SELECT * FROM patient_history WHERE patient_id = ? ORDER BY id DESC').all(req.params.id);
    const documents = db.prepare('SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY id DESC').all(req.params.id);
    const uniqueName = db.prepare('SELECT COUNT(*) AS n FROM patients WHERE name = ?').get(patient.name).n === 1;
    const consultations = uniqueName ? db.prepare('SELECT * FROM consultations WHERE patient_name = ? ORDER BY id DESC').all(patient.name) : [];
    const appointments = db.prepare('SELECT * FROM exam_appointments WHERE patient_id = ? ORDER BY id DESC').all(req.params.id);

    res.json({
      ...patient,
      age: calcAgeFromBirthDate(patient.birth_date, patient.age),
      clinical_notes: patient.notes || '',
      notes,
      history,
      documents,
      consultations,
      appointments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/patients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const current = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Patient non trouvé' });

    const b = req.body;
    const name = b.name || `${b.first_name || current.first_name || ''} ${b.last_name || current.last_name || ''}`.trim() || current.name;
    const socialSecNo = b.social_sec_no !== undefined ? String(b.social_sec_no || '').trim() || null : current.social_sec_no || null;
    if (socialSecNo && db.prepare('SELECT id FROM patients WHERE social_sec_no = ? AND id <> ?').get(socialSecNo, id)) return res.status(409).json({ error: 'Ce numéro de sécurité sociale appartient déjà à un autre dossier patient.' });
    const birthDate = b.birth_date !== undefined ? b.birth_date || '' : current.birth_date;
    const age = calcAgeFromBirthDate(birthDate, b.birth_date === undefined ? current.age : null);
    if (birthDate && age === null) return res.status(400).json({ error: 'Date de naissance invalide.' });

    db.transaction(() => {
    db.prepare(`
      UPDATE patients SET
        name = ?, first_name = ?, last_name = ?, email = ?, age = ?, gender = ?, phone = ?, social_sec_no = ?,
        prescribing_doctor = ?, birth_date = ?, nationality = ?, marital_status = ?, address = ?,
        profession = ?, emergency_contact = ?, insurance_type = ?, insurance_number = ?,
        blood_group = ?, weight = ?, height = ?, allergies_json = ?, allergies_notes = ?,
        history_json = ?, history_notes = ?, requested_exam = ?, notes = ?, status = ?
      WHERE id = ?
    `).run(
      name,
      b.first_name !== undefined ? b.first_name : current.first_name,
      b.last_name !== undefined ? b.last_name : current.last_name,
      b.email !== undefined ? b.email : current.email,
      age,
      b.gender !== undefined ? b.gender : current.gender,
      b.phone !== undefined ? b.phone : current.phone,
      socialSecNo,
      b.prescribing_doctor !== undefined ? b.prescribing_doctor : current.prescribing_doctor,
      birthDate,
      b.nationality !== undefined ? b.nationality : current.nationality,
      b.marital_status !== undefined ? b.marital_status : current.marital_status,
      b.address !== undefined ? b.address : current.address,
      b.profession !== undefined ? b.profession : current.profession,
      b.emergency_contact !== undefined ? b.emergency_contact : current.emergency_contact,
      b.insurance_type !== undefined ? b.insurance_type : current.insurance_type,
      b.insurance_number !== undefined ? b.insurance_number : current.insurance_number,
      b.blood_group !== undefined ? b.blood_group : current.blood_group,
      b.weight !== undefined ? (b.weight === '' || b.weight === null ? null : Number(b.weight)) : current.weight,
      b.height !== undefined ? (b.height === '' || b.height === null ? null : Number(b.height)) : current.height,
      b.allergies_json !== undefined ? (typeof b.allergies_json === 'string' ? b.allergies_json : JSON.stringify(b.allergies_json)) : current.allergies_json,
      b.allergies_notes !== undefined ? b.allergies_notes : current.allergies_notes,
      b.history_json !== undefined ? (typeof b.history_json === 'string' ? b.history_json : JSON.stringify(b.history_json)) : current.history_json,
      b.history_notes !== undefined ? b.history_notes : current.history_notes,
      b.requested_exam !== undefined ? b.requested_exam : current.requested_exam,
      b.notes !== undefined ? b.notes : current.notes,
      b.status !== undefined ? b.status : current.status,
      id
    );
    db.prepare('UPDATE waiting_queue SET patient_name = ? WHERE patient_id = ?').run(name, id);
    db.prepare('UPDATE exam_appointments SET patient_name = ?, patient_phone = ? WHERE patient_id = ?').run(name, b.phone !== undefined ? b.phone : current.phone || '', id);
    for (const table of ['reports', 'prescriptions', 'exam_payments']) db.prepare(`UPDATE ${table} SET patient_name = ? WHERE patient_id = ?`).run(name, id);
    db.prepare("UPDATE transactions SET party = ? WHERE source = 'payment' AND source_id IN (SELECT id FROM exam_payments WHERE patient_id = ?)").run(name, id);
    })();

    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/patients/:id', (req, res) => {
  try {
    if (patientHasRecords(req.params.id)) return res.status(409).json({ error: 'Ce patient possède un historique. Archivez son dossier pour conserver ses documents et examens.' });
    db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    res.json({ message: 'Patient supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function patientHasRecords(id) {
  return ['reports', 'prescriptions', 'waiting_queue', 'exam_appointments', 'exam_payments', 'patient_documents', 'patient_notes', 'patient_history', 'patient_visit_measurements'].some(table => db.prepare(`SELECT 1 FROM ${table} WHERE patient_id = ? LIMIT 1`).get(id));
}

// Patient Sub-Resources
app.get('/api/patients/:id/notes', (req, res) => {
  const notes = db.prepare('SELECT * FROM patient_notes WHERE patient_id = ? ORDER BY id DESC').all(req.params.id);
  res.json(notes);
});

app.post('/api/patients/:id/notes', (req, res) => {
  const { author, content } = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const info = db.prepare('INSERT INTO patient_notes (patient_id, author, content, created_at) VALUES (?, ?, ?, ?)').run(req.params.id, author || 'Dr. Rahmane', content || '', now);
  const newNote = db.prepare('SELECT * FROM patient_notes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(newNote);
});

app.get('/api/patients/:id/history', (req, res) => {
  const history = db.prepare('SELECT * FROM patient_history WHERE patient_id = ? ORDER BY id DESC').all(req.params.id);
  res.json(history);
});

app.post('/api/patients/:id/history', (req, res) => {
  const { date, type, title, description } = req.body;
  const info = db.prepare('INSERT INTO patient_history (patient_id, date, type, title, description) VALUES (?, ?, ?, ?, ?)').run(req.params.id, date || new Date().toISOString().split('T')[0], type || 'Medical', title || '', description || '');
  const newHist = db.prepare('SELECT * FROM patient_history WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(newHist);
});

app.get('/api/patients/:id/documents', (req, res) => {
  const docs = db.prepare('SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY id DESC').all(req.params.id);
  res.json(docs);
});

app.post('/api/patients/:id/documents', (req, res) => {
  if (req.body.kind === 'image' && !req.account?.features.images) return res.status(403).json({ error: 'Images désactivées pour ce compte.' });
  const { title, url, kind } = req.body;
  const now = new Date().toISOString().split('T')[0];
  const info = db.prepare('INSERT INTO patient_documents (patient_id, title, url, kind, uploaded_at) VALUES (?, ?, ?, ?, ?)').run(req.params.id, title || 'Document Médical', url || '/api/uploads/default.pdf', kind || 'pdf', now);
  const newDoc = db.prepare('SELECT * FROM patient_documents WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(newDoc);
});

// Helper: Auto-create patient in `patients` table if non-existent
function ensurePatientExists(patientName, patientPhone, requestedExam, birthDate = '', createNew = false) {
  if (!patientName || typeof patientName !== 'string') return null;
  const cleanName = patientName.trim();
  if (!cleanName || cleanName === 'Patient' || cleanName === 'Patient Anonyme') return null;

  try {
    const matches = createNew ? [] : db.prepare("SELECT * FROM patients WHERE name = ? COLLATE NOCASE").all(cleanName);
    if (matches.length > 1) throw new Error("Plusieurs patients portent ce nom. Sélectionnez le dossier concerné.");
    if (matches.length === 1) return matches[0];

    const parts = cleanName.split(' ');
    const firstName = parts[0] || cleanName;
    const lastName = parts.slice(1).join(' ') || '';
    const today = new Date().toISOString().split('T')[0];
    const socialSec = null;

    const emailStr = '';

    const info = db.prepare(`
      INSERT INTO patients (name, first_name, last_name, phone, email, age, gender, requested_exam, social_sec_no, created_at, birth_date, status, nationality, marital_status, insurance_type, blood_group, weight, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Actif', '', '', '', '', NULL, NULL)
    `).run(
      cleanName,
      firstName,
      lastName,
      patientPhone || '',
      emailStr,
      calcAgeFromBirthDate(birthDate),
      '',
      requestedExam || 'Examen Radiologique',
      socialSec,
      today,
      birthDate
    );


    return db.prepare('SELECT * FROM patients WHERE id = ?').get(info.lastInsertRowid);
  } catch (err) {
    console.error('[ensurePatientExists error]', err.message);
    return null;
  }
}

// Auto-sync function: Auto transfer today's due appointments into waiting_queue
function syncTodayAppointmentsToQueue() {
  try {
    const nowISO = new Date().toISOString();

    // A scheduled date does not prove that the patient has arrived.
    const dueAppts = db.prepare("SELECT * FROM exam_appointments WHERE status = 'arrived'").all();

    for (const appt of dueAppts) {
      // Ensure patient exists in patients register
      const patient = appt.patient_id ? db.prepare('SELECT * FROM patients WHERE id = ?').get(appt.patient_id) : ensurePatientExists(appt.patient_name, appt.patient_phone, appt.exam_type || appt.modality_name);

      if (!patient) continue;
      // Check if ticket already exists for this exact appointment ID
      const apptTag = `#${appt.id}`;
      const existingTicket = db.prepare(`
        SELECT id FROM waiting_queue 
        WHERE appointment_id = ? OR notes LIKE ? OR notes LIKE ?
      `).get(appt.id, `%RDV #${appt.id}`, `%(${apptTag})%`);

      if (!existingTicket) {
        // Mark appointment arrived
        db.prepare('UPDATE exam_appointments SET status = ?, arrived_at = ? WHERE id = ?')
          .run('arrived', nowISO, appt.id);

        // Create waiting queue ticket
        const countRow = { total: Number(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'waiting_queue'").get()?.seq || 0) };
        const ticket_number = `${appt.priority === 'urgent' ? 'U' : 'A'}-${String((countRow.total || 0) + 101).padStart(3, '0')}`;

        db.prepare(`
          INSERT INTO waiting_queue (ticket_number, patient_name, modality_name, doctor_name, room_name, status, priority, created_at, notes, patient_id, appointment_id)
          VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?)
        `).run(
          ticket_number,
          appt.patient_name,
          appt.modality_name || appt.exam_type || 'IRM Cérébrale',
          appt.radiologist || '',
          appt.room || appt.location || 'Salle IRM 1',
          appt.priority || 'normal',
          nowISO,
          `Arrivée confirmée RDV (#${appt.id})`, patient?.id || null, appt.id
        );
      } else {
        // If ticket already exists in queue, sync appointment status to arrived if not already completed
        if (appt.status !== 'arrived') {
          db.prepare('UPDATE exam_appointments SET status = ? WHERE id = ?').run('arrived', appt.id);
        }
      }
    }
  } catch (err) {
    console.error('[syncTodayAppointmentsToQueue error]', err.message);
  }
}

// ===== Appointments API =====
app.get('/api/appointments', (req, res) => {
  try {
    const { from, to, exam, doctor, status, auto_queue } = req.query;
    if (auto_queue === 'true' || auto_queue === '1' || auto_queue === undefined) {
      syncTodayAppointmentsToQueue();
    }
    let sql = 'SELECT * FROM exam_appointments WHERE 1=1';
    const params = [];

    if (from) {
      sql += ' AND date_time >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND date_time <= ?';
      params.push(to);
    }
    if (exam && exam !== 'all') {
      sql += ' AND (modality_name LIKE ? OR exam_type LIKE ?)';
      params.push(`%${exam}%`, `%${exam}%`);
    }
    if (doctor && doctor !== 'all') {
      sql += ' AND radiologist LIKE ?';
      params.push(`%${doctor}%`);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY date_time ASC';
    const appts = db.prepare(sql).all(...params);
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments/slots', (req, res) => {
  try {
    const { date, room, exclude_id } = req.query;
    const targetDate = (typeof date === 'string' && date) ? date : new Date().toISOString().split('T')[0];

    const occupiedAppts = db.prepare("SELECT time FROM exam_appointments WHERE substr(date_time, 1, 10) = ? AND status NOT IN ('cancelled', 'Annulé') AND (? = '' OR room = ?) AND id != ?")
      .all(targetDate, room || '', room || '', Number(exclude_id) || -1);
    const occupiedTimes = new Set(occupiedAppts.map(a => a.time));

    const slots = [];
    const hours = [
      '08:00', '08:15', '08:30', '08:45',
      '09:00', '09:15', '09:30', '09:45',
      '10:00', '10:15', '10:30', '10:45',
      '11:00', '11:15', '11:30', '11:45',
      '12:00', '12:30',
      '14:00', '14:15', '14:30', '14:45',
      '15:00', '15:15', '15:30', '15:45',
      '16:00', '16:15', '16:30', '16:45',
      '17:00', '17:30', '18:00', '18:30', '19:00'
    ];
    hours.forEach(time => {
      slots.push({
        time,
        occupied: occupiedTimes.has(time),
      });
    });

    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', (req, res) => {
  try {
    const b = req.body;
    if (!String(b.patient_name || '').trim()) return res.status(400).json({ error: 'Le nom du patient est obligatoire.' });
    if (b.patient_birth_date && calcAgeFromBirthDate(b.patient_birth_date) === null) return res.status(400).json({ error: 'Date de naissance invalide.' });
    const dateStr = b.date_time || new Date().toISOString();
    const timeStr = b.time || '09:00';
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) return res.status(400).json({ error: 'Choisissez une date et une heure valides.' });
    if (b.room && db.prepare("SELECT id FROM exam_appointments WHERE substr(date_time, 1, 10) = ? AND time = ? AND room = ? AND status NOT IN ('cancelled', 'Annulé')").get(dateStr.slice(0, 10), timeStr, b.room)) return res.status(409).json({ error: 'Ce créneau vient d’être réservé dans cette salle. Choisissez une autre heure.' });

    const createdPatient = b.patient_id ? db.prepare('SELECT * FROM patients WHERE id = ?').get(b.patient_id) : ensurePatientExists(
      b.patient_name,
      b.patient_phone,
      b.modality_name || b.exam_type,
      b.patient_birth_date || '', true
    );
    if (!createdPatient) return res.status(400).json({ error: 'Sélectionnez un patient existant ou créez un nouveau patient.' });
    const patientId = createdPatient.id;

    const stmt = db.prepare(`
      INSERT INTO exam_appointments (
        patient_id, patient_name, modality_id, modality_name, date_time, radiologist,
        time, duration, type, location, description, color, status, priority, room, exam_type, patient_phone, emergency_contact, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      patientId,
      createdPatient.name,
      b.modality_id || 1,
      b.modality_name || b.exam_type || 'IRM Cérébrale',
      dateStr,
      b.radiologist || '',
      timeStr,
      b.duration || '30 min',
      b.type || 'event',
      b.location || b.room || 'Salle A - IRM',
      b.description || '',
      b.color || '#0ea5e9',
      b.status || 'pending',
      b.priority || 'normal',
      b.room || 'Salle A - IRM',
      b.exam_type || b.modality_name || 'IRM Cérébrale',
      b.patient_phone || '',
      b.emergency_contact || '',
      b.notes || '',
      req.account?.name || 'Accueil'
    );

    syncTodayAppointmentsToQueue();
    const newAppt = db.prepare('SELECT * FROM exam_appointments WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newAppt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/appointments/:id/arrive', (req, res) => {
  try {
    const appt = db.prepare('SELECT * FROM exam_appointments WHERE id = ?').get(req.params.id);
    if (!appt) return res.status(404).json({ error: 'RDV non trouvé' });

    if (['cancelled', 'Annulé', 'completed', 'Terminé'].includes(appt.status)) return res.status(409).json({ error: 'Ce rendez-vous est annulé ou terminé.' });
    if (!appt.patient_id || !db.prepare('SELECT id FROM patients WHERE id = ?').get(appt.patient_id)) return res.status(409).json({ error: 'Associez ce rendez-vous à un patient enregistré.' });
    const existing = db.prepare('SELECT * FROM waiting_queue WHERE appointment_id = ?').get(appt.id);
    if (existing) return res.json({ message: 'Patient déjà dans la file', ticket: existing });

    const now = new Date().toISOString();
    db.prepare('UPDATE exam_appointments SET status = ?, arrived_at = ? WHERE id = ?').run('arrived', now, req.params.id);

    // Create ticket in waiting_queue
    const countRow = { total: Number(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'waiting_queue'").get()?.seq || 0) };
    const ticket_number = `${appt.priority === 'urgent' ? 'U' : 'A'}-${String(countRow.total + 101).padStart(3, '0')}`;

    const info = db.prepare(`
      INSERT INTO waiting_queue (ticket_number, patient_name, modality_name, doctor_name, room_name, status, priority, created_at, notes, patient_id, appointment_id)
      VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?)
    `).run(
      ticket_number,
      appt.patient_name,
      appt.modality_name || appt.exam_type || 'IRM Cérébrale',
      appt.radiologist || '',
      appt.room || appt.location || 'Salle IRM 1',
      appt.priority || 'normal',
      now,
      `Issu du RDV #${appt.id}`, appt.patient_id || ensurePatientExists(appt.patient_name, appt.patient_phone, appt.modality_name)?.id || null, appt.id
    );

    const ticket = db.prepare('SELECT * FROM waiting_queue WHERE id = ?').get(info.lastInsertRowid);
    res.json({ message: 'Patient marqué comme arrivé et ajouté à la file d\'attente', ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const current = db.prepare('SELECT * FROM exam_appointments WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

    const b = req.body;
    const dateStr = b.date_time || current.date_time;
    const timeStr = b.time || current.time;
    if (b.patient_id && Number(b.patient_id) !== current.patient_id) return res.status(409).json({ error: 'Le patient de ce rendez-vous ne peut pas être remplacé. Créez un nouveau rendez-vous.' });
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(current.patient_id);
    if (b.room && db.prepare("SELECT id FROM exam_appointments WHERE substr(date_time, 1, 10) = ? AND time = ? AND room = ? AND id != ? AND status NOT IN ('cancelled', 'Annulé')").get(dateStr.slice(0, 10), timeStr, b.room, current.id)) return res.status(409).json({ error: 'Ce créneau est occupé dans cette salle.' });

    db.prepare(`
      UPDATE exam_appointments SET
        patient_name = ?,
        patient_phone = ?,
        modality_name = ?,
        exam_type = ?,
        radiologist = ?,
        room = ?,
        location = ?,
        date_time = ?,
        time = ?,
        duration = ?,
        priority = ?,
        status = ?,
        notes = ?
      WHERE id = ?
    `).run(
      patient?.name || current.patient_name,
      b.patient_phone !== undefined ? b.patient_phone : current.patient_phone,
      b.exam_type !== undefined ? b.exam_type : (b.modality_name !== undefined ? b.modality_name : current.modality_name),
      b.exam_type !== undefined ? b.exam_type : current.exam_type,
      b.radiologist !== undefined ? b.radiologist : current.radiologist,
      b.room !== undefined ? b.room : (b.location !== undefined ? b.location : current.room),
      b.location !== undefined ? b.location : (b.room !== undefined ? b.room : current.location),
      dateStr,
      timeStr,
      b.duration !== undefined ? b.duration : current.duration,
      b.priority !== undefined ? b.priority : current.priority,
      b.status !== undefined ? b.status : current.status,
      b.notes !== undefined ? b.notes : current.notes,
      id
    );

    const updated = db.prepare('SELECT * FROM exam_appointments WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (db.prepare('SELECT id FROM waiting_queue WHERE appointment_id = ?').get(id) || db.prepare('SELECT id FROM reports WHERE appointment_id = ?').get(id)) return res.status(409).json({ error: 'Ce rendez-vous a déjà été pris en charge. Conservez-le dans l’historique du patient.' });
    db.prepare('DELETE FROM exam_appointments WHERE id = ?').run(id);
    res.json({ message: 'Rendez-vous supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments/export.csv', (req, res) => {
  try {
    const appts = db.prepare('SELECT * FROM exam_appointments ORDER BY date_time ASC').all();
    let csv = 'ID;Patient;Examen;Médecin;Date;Heure;Salle;Statut\n';
    appts.forEach(a => {
      csv += `${a.id};"${a.patient_name}";"${a.modality_name}";"${a.radiologist}";"${a.date_time}";"${a.time}";"${a.location || a.room}";"${a.status}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rendez-vous.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Equipment API =====
app.get('/api/equipment', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM equipment ORDER BY id ASC').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/equipment/:id', (req, res) => {
  try {
    const { status, usage_pct, next_maintenance } = req.body;
    const current = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Équipement non trouvé' });

    db.prepare(`
      UPDATE equipment SET status = ?, usage_pct = ?, next_maintenance = ?
      WHERE id = ?
    `).run(
      status || current.status,
      usage_pct !== undefined ? usage_pct : current.usage_pct,
      next_maintenance || current.next_maintenance,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== Queue Management API =====
app.get('/api/queue/:id/dossier', (req, res) => {
  if (!req.account || !['reports', 'prescriptions', 'images'].some(feature => req.account.features[feature])) return res.status(403).json({ error: 'Accès au dossier désactivé.' });
  const ticket = db.prepare('SELECT * FROM waiting_queue WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
  res.json(ticket);
});
app.get('/api/queue', (req, res) => {
  try {
    syncTodayAppointmentsToQueue();
    db.exec(`UPDATE waiting_queue SET patient_id = (SELECT MIN(id) FROM patients WHERE name = waiting_queue.patient_name)
      WHERE patient_id IS NULL AND (SELECT COUNT(*) FROM patients WHERE name = waiting_queue.patient_name) = 1`);
    const items = db.prepare('SELECT * FROM waiting_queue ORDER BY id ASC').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue', (req, res) => {
  try {
    const b = req.body;
    const patient = b.patient_id ? db.prepare('SELECT * FROM patients WHERE id = ?').get(b.patient_id) : ensurePatientExists(b.patient_name, b.phone, b.modality_name || b.exam_type);
    if (!patient) return res.status(400).json({ error: 'Patient non trouvé' });

    const countRow = { total: Number(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'waiting_queue'").get()?.seq || 0) };
    const prefix = b.priority === 'urgent' ? 'U' : 'A';
    const ticket_number = b.ticket_number || `${prefix}-${String((countRow.total || 0) + 101).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO waiting_queue (ticket_number, patient_name, modality_name, doctor_name, room_name, status, priority, created_at, notes, patient_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      ticket_number,
      patient.name,
      b.modality_name || b.exam_type || 'IRM Cérébrale',
      b.doctor_name || b.radiologist || '',
      b.room_name || b.room || b.location || 'Salle IRM 1',
      'waiting',
      b.priority || 'normal',
      now,
      b.notes || '', patient.id
    );

    const newItem = db.prepare('SELECT * FROM waiting_queue WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put(['/api/queue/:id', '/api/queue/:id/status'], (req, res) => {
  try {
    const { id } = req.params;
    const current = db.prepare('SELECT * FROM waiting_queue WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Ticket non trouvé' });

    const b = req.body;
    const now = new Date().toISOString();

    const newStatus = b.status || current.status;
    if (newStatus === 'in_progress' && !['called', 'in_progress'].includes(current.status)) return res.status(409).json({ error: 'Appelez le patient avant de confirmer son entrée.' });
    if (['called', 'in_progress'].includes(newStatus)) {
      const echoDoctor = db.prepare("SELECT value FROM settings WHERE key = 'echo_call_doctor_id'").get()?.value;
      if (!canCall(req.account, current, echoDoctor)) return res.status(403).json({ error: "Ce compte n'est pas autorisé à appeler ce type d'examen." });
      if (newStatus === 'called' && db.prepare("SELECT value FROM settings WHERE key = 'queue_paused'").get()?.value === '1') return res.status(409).json({ error: "La file d'attente est en pause." });
    }
    const calledAt = newStatus === 'called' ? (current.called_at || now) : current.called_at;
    const completedAt = newStatus === 'completed' ? (current.completed_at || now) : current.completed_at;

    db.prepare(`
      UPDATE waiting_queue SET
        status = ?,
        room_name = ?,
        doctor_name = ?,
        priority = ?,
        called_at = ?,
        completed_at = ?
      WHERE id = ?
    `).run(
      newStatus,
      b.room_name || current.room_name,
      (newStatus === 'called' && req.account?.role === 'radiologist') ? req.account.name : (b.doctor_name || current.doctor_name),
      b.priority || current.priority,
      calledAt,
      completedAt,
      id
    );

    if (current.appointment_id) {
      const appointmentStatus = newStatus === 'completed' ? 'completed' : newStatus === 'absent' ? 'absent' : ['called', 'in_progress'].includes(newStatus) ? newStatus : 'arrived';
      db.prepare('UPDATE exam_appointments SET status = ? WHERE id = ?').run(appointmentStatus, current.appointment_id);
    }
    const updated = db.prepare('SELECT * FROM waiting_queue WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/queue/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (db.prepare('SELECT id FROM reports WHERE queue_id = ?').get(id)) return res.status(409).json({ error: 'Ce ticket est associé à un compte rendu. Conservez-le pour retrouver cet examen.' });
    db.prepare('DELETE FROM waiting_queue WHERE id = ?').run(id);
    res.json({ message: 'Ticket supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/reset', (req, res) => {
  try {
    db.prepare('DELETE FROM waiting_queue WHERE id NOT IN (SELECT queue_id FROM reports WHERE queue_id IS NOT NULL)').run();
    res.json({ message: 'File d\'attente réinitialisée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Queue Pause & Extended State API =====
app.post('/api/queue/pause', (req, res) => {
  try {
    const { paused } = req.body;
    const val = paused ? '1' : '0';
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('queue_paused', val);
    res.json({ paused: !!paused });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/queue/state', (req, res) => {
  try {
    syncTodayAppointmentsToQueue();
    const pausedSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('queue_paused');
    const paused = pausedSetting ? pausedSetting.value === '1' : false;

    const current = db.prepare("SELECT * FROM waiting_queue WHERE status IN ('called', 'in_progress') ORDER BY id ASC LIMIT 1").get();
    const next = db.prepare("SELECT * FROM waiting_queue WHERE status = 'waiting' ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'vip' THEN 2 ELSE 3 END, id ASC LIMIT 1").get();

    const waitingCount = db.prepare("SELECT COUNT(*) as count FROM waiting_queue WHERE status = 'waiting'").get().count;
    const urgentCount = db.prepare("SELECT COUNT(*) as count FROM waiting_queue WHERE status = 'waiting' AND priority = 'urgent'").get().count;
    const completedCount = db.prepare("SELECT COUNT(*) as count FROM waiting_queue WHERE status = 'completed'").get().count;

    const rooms = db.prepare('SELECT * FROM equipment').all();

    res.json({
      paused,
      current: current || null,
      next: next || null,
      stats: {
        waiting: waitingCount,
        urgent: urgentCount,
        completed: completedCount,
        total: waitingCount + completedCount,
      },
      rooms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Dashboard Summary API =====
app.get('/api/dashboard/summary', (req, res) => {
  try {
    const today = req.query.date || db.prepare("SELECT date('now', 'localtime') AS date").get().date;
    if (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today))) return res.status(400).json({ error: 'Date invalide.' });
    const yesterday = db.prepare("SELECT date(?, '-1 day') AS date").get(today).date;
    const todayAppts = db.prepare("SELECT * FROM exam_appointments WHERE substr(date_time, 1, 10) = ? AND status NOT IN ('cancelled', 'Annulé') ORDER BY time ASC, id ASC").all(today);
    const totalPatients = db.prepare("SELECT COUNT(*) as total FROM patients").get().total;
    const doneExams = db.prepare("SELECT COUNT(*) as total FROM waiting_queue WHERE status = 'completed' AND date(completed_at, 'localtime') = ?").get(today).total;
    const waitingQueue = db.prepare("SELECT COUNT(*) as total FROM waiting_queue WHERE status = 'waiting'").get().total;

    const queueItems = db.prepare("SELECT * FROM waiting_queue WHERE status IN ('waiting', 'called', 'in_progress') ORDER BY created_at ASC, id ASC LIMIT 10").all();
    const equipment = db.prepare("SELECT e.*, (SELECT COUNT(*) FROM waiting_queue q WHERE q.room_name = e.room AND q.status IN ('called', 'in_progress')) AS active_exams FROM equipment e ORDER BY e.id").all();

    res.json({
      date: today,
      kpis: {
        today_appointments: todayAppts.length,
        total_patients: totalPatients,
        completed_exams: doneExams,
        waiting_queue: waitingQueue,
        pending_reports: req.account?.features.reports ? db.prepare("SELECT COUNT(*) AS total FROM reports WHERE status = 'draft'").get().total : null,
      },
      today_appointments: todayAppts,
      queue: queueItems,
      equipment,
      exam_counts: db.prepare("SELECT modality_name AS name, COUNT(*) AS count FROM exam_appointments WHERE substr(date_time, 1, 10) = ? AND status NOT IN ('cancelled', 'Annulé') GROUP BY modality_name ORDER BY count DESC").all(today),
      comparison: {
        appointments_yesterday: db.prepare("SELECT COUNT(*) AS total FROM exam_appointments WHERE substr(date_time, 1, 10) = ? AND status NOT IN ('cancelled', 'Annulé')").get(yesterday).total,
        patients_this_month: db.prepare("SELECT COUNT(*) AS total FROM patients WHERE substr(created_at, 1, 7) = ?").get(today.slice(0, 7)).total,
        completed_yesterday: db.prepare("SELECT COUNT(*) AS total FROM waiting_queue WHERE status = 'completed' AND date(completed_at, 'localtime') = ?").get(yesterday).total,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Radiology Reports API =====
app.get('/api/reports', (req, res) => {
  try {
    const { status, author, patient_id } = req.query;
    let sql = 'SELECT * FROM reports WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (author) {
      sql += ' AND author LIKE ?';
      params.push(`%${author}%`);
    }
    if (patient_id) {
      sql += ' AND patient_id = ?';
      params.push(patient_id);
    }

    sql += ' ORDER BY id DESC';
    const reports = db.prepare(sql).all(...params);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/:id', (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });
    const versions = db.prepare('SELECT * FROM report_versions WHERE report_id = ? ORDER BY version DESC').all(req.params.id);
    res.json({ ...report, versions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', (req, res) => {
  try {
    const b = req.body;
    const ticket = b.queue_id ? db.prepare('SELECT * FROM waiting_queue WHERE id = ?').get(b.queue_id) : null;
    if (b.queue_id && (!ticket?.patient_id || ticket.patient_id !== Number(b.patient_id))) return res.status(400).json({ error: 'Le ticket ne correspond pas au patient.' });
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(b.patient_id);
    if (!patient) return res.status(400).json({ error: 'Sélectionnez un patient existant.' });
    if (b.queue_id && db.prepare('SELECT id FROM reports WHERE queue_id = ?').get(b.queue_id)) return res.status(409).json({ error: 'Un compte rendu existe déjà pour cet examen. Rechargez son dossier.' });
    b.content_html = cleanReport(b.content_html);
    const reportNo = b.report_no || `CR-${new Date().getFullYear()}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reports (
        report_no, patient_id, patient_name, consultation_id, appointment_id, exam_type,
        title, content_html, status, version, author, severity, diagnosis, recommendations, created_at, updated_at, queue_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      reportNo,
      b.patient_id || 1,
      patient.name,
      b.consultation_id || null,
      ticket?.appointment_id || b.appointment_id || null,
      b.exam_type || 'IRM Cérébrale',
      b.title || `Compte-Rendu d'Examen — ${b.exam_type || 'IRM'}`,
      b.content_html,
      'draft',
      req.account.name,
      b.severity || 'Normal',
      b.diagnosis || '',
      b.recommendations || '',
      now,
      now, b.queue_id || null
    );

    // Save version 1
    db.prepare('INSERT INTO report_versions (report_id, version, content_html, author, saved_at) VALUES (?, 1, ?, ?, ?)').run(info.lastInsertRowid, b.content_html || '', req.account.name, now);

    const newReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newReport);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/reports/:id', (req, res) => {
  try {
    const { id } = req.params;
    const current = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (current.status === 'validated') return res.status(403).json({ error: 'Ce compte-rendu a déjà été validé et verrouillé' });

    const b = req.body;
    if (b.version !== undefined && b.version !== current.version) return res.status(409).json({ error: 'Ce compte rendu a été modifié sur un autre poste. Votre texte est conservé localement ; rechargez le dossier avant de reprendre.' });
    if (b.content_html !== undefined) b.content_html = cleanReport(b.content_html);
    const now = new Date().toISOString();
    const nextVersion = (current.version || 1) + 1;

    db.prepare(`
      UPDATE reports SET
        title = ?, content_html = ?, status = ?, version = ?, severity = ?, diagnosis = ?, recommendations = ?, updated_at = ?
      WHERE id = ?
    `).run(
      b.title || current.title,
      b.content_html !== undefined ? b.content_html : current.content_html,
      current.status,
      nextVersion,
      b.severity || current.severity,
      b.diagnosis !== undefined ? b.diagnosis : current.diagnosis,
      b.recommendations !== undefined ? b.recommendations : current.recommendations,
      now,
      id
    );

    // Record new version
    if (b.content_html !== undefined && b.content_html !== current.content_html) {
      db.prepare('INSERT INTO report_versions (report_id, version, content_html, author, saved_at) VALUES (?, ?, ?, ?, ?)').run(id, nextVersion, b.content_html, req.account.name, now);
    }

    const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/reports/:id/validate', (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (report.status === 'validated') return res.json(report);
    if (!cleanReport(report.content_html).replace(/<[^>]*>/g, '').trim()) return res.status(400).json({ error: 'Rédigez le compte rendu avant de le finaliser.' });
    const now = new Date().toISOString();
    db.prepare("UPDATE reports SET status = 'validated', validated_at = ?, updated_at = ? WHERE id = ?").run(now, now, req.params.id);
    const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/:id/print', (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });
  if (report.status !== 'validated') return res.status(409).json({ error: "Finalisez le compte rendu avant de lancer l'impression." });
  if (!db.prepare("SELECT id FROM print_jobs WHERE report_id = ? AND user_id = ? AND status = 'submitted'").get(report.id, req.account.id)) return res.status(403).json({ error: 'Envoyez le compte rendu à une imprimante autorisée avant de le marquer prêt.' });
  res.json(db.prepare('SELECT * FROM reports WHERE id = ?').get(report.id));
});

app.get('/api/ready-files', (req, res) => {
  res.json(db.prepare(`SELECT r.id, r.report_no, r.patient_id, r.patient_name, r.exam_type, r.delivery_status,
    r.print_started_at, r.patient_informed_at, r.delivered_at, p.phone
    FROM reports r LEFT JOIN patients p ON p.id = r.patient_id
    WHERE r.status = 'validated' AND r.print_started_at IS NOT NULL ORDER BY r.print_started_at DESC`).all());
});
app.get('/api/ready-files/:id', (req, res) => {
  const report = db.prepare("SELECT * FROM reports WHERE id = ? AND status = 'validated' AND print_started_at IS NOT NULL").get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Dossier prêt introuvable.' });
  res.json({ ...report, content_html: cleanReport(report.content_html) });
});
app.put('/api/ready-files/:id', (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Dossier non trouvé' });
  const status = req.body.status;
  if (!report.print_started_at || report.status !== 'validated') return res.status(409).json({ error: "Ce dossier n'est pas prêt." });
  if (status === report.delivery_status) return res.json(report);
  if (!(report.delivery_status === 'ready' && status === 'informed') && !(report.delivery_status === 'informed' && status === 'delivered')) return res.status(409).json({ error: 'Informez le patient avant de remettre son dossier.' });
  const column = status === 'informed' ? 'patient_informed_at' : 'delivered_at';
  db.prepare(`UPDATE reports SET delivery_status = ?, ${column} = ? WHERE id = ? AND delivery_status = ?`)
    .run(status, new Date().toISOString(), report.id, report.delivery_status);
  res.json(db.prepare('SELECT * FROM reports WHERE id = ?').get(report.id));
});

app.get('/api/reports/:id/versions', (req, res) => {
  const versions = db.prepare('SELECT * FROM report_versions WHERE report_id = ? ORDER BY version DESC').all(req.params.id);
  res.json(versions);
});

app.get('/api/report-templates', (req, res) => {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  res.json(readClinicConfig(db).documents.models.filter(m => m.type === 'Compte rendu').map(m => ({ id: m.id, name: m.name, default: m.default, exam: 'Tous', template: m.body.split(/\n\s*\n/).map(p => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join('') })));
});

// ===== Prescriptions API =====
app.get('/api/prescriptions', (req, res) => {
  try {
    const { patient_id } = req.query;
    let sql = 'SELECT * FROM prescriptions';
    const params = [];
    if (patient_id) {
      sql += ' WHERE patient_id = ?';
      params.push(patient_id);
    }
    sql += ' ORDER BY id DESC';
    const items = db.prepare(sql).all(...params);
    res.json(items.map(p => ({ ...p, medications: JSON.parse(p.medications_json || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prescriptions', (req, res) => {
  try {
    const b = req.body;
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(b.patient_id);
    if (!patient) return res.status(400).json({ error: 'Sélectionnez un patient existant.' });
    if (!Array.isArray(b.medications) || !b.medications.length || b.medications.some(m => !m || typeof m.name !== 'string' || !m.name.trim())) return res.status(400).json({ error: 'Saisissez le nom de chaque médicament ou retirez les lignes vides.' });
    const countRow = db.prepare('SELECT COUNT(*) as count FROM prescriptions').get();
    const prescriptionNo = b.prescription_no || `ORD-${new Date().getFullYear()}-${String(countRow.count + 101).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const dateStr = b.date || now.split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO prescriptions (prescription_no, patient_id, patient_name, doctor_name, date, medications_json, instructions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      prescriptionNo,
      patient.id,
      patient.name,
      req.account.name,
      dateStr,
      JSON.stringify(b.medications),
      b.instructions || '',
      now
    );

    const created = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ...created, medications: JSON.parse(created.medications_json || '[]') });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== Messaging API =====
app.get('/api/conversations', (req, res) => {
  try {
    const convs = db.prepare('SELECT * FROM conversations ORDER BY id DESC').all();
    const result = convs.map(c => {
      const lastMsg = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1').get(c.id);
      const unread = db.prepare("SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND read_by_json NOT LIKE '%Dr. Rahmane%'").get(c.id).count;
      return {
        ...c,
        participants: JSON.parse(c.participants_json || '[]'),
        last_message: lastMsg || null,
        unread_count: unread,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations', (req, res) => {
  try {
    const { title, type, participants } = req.body;
    const now = new Date().toISOString();
    const info = db.prepare('INSERT INTO conversations (title, type, participants_json, created_at) VALUES (?, ?, ?, ?)').run(
      title || 'Nouvelle conversation',
      type || 'direct',
      JSON.stringify(participants || ['Dr. Rahmane', 'Salima (Secrétariat)']),
      now
    );
    const newConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ...newConv, participants: JSON.parse(newConv.participants_json) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/conversations/:id/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(req.params.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations/:id/messages', (req, res) => {
  try {
    const { sender_id, sender_name, sender_role, body, attachment_url, attachment_name, urgent } = req.body;
    const now = new Date().toISOString();

    const info = db.prepare(`
      INSERT INTO messages (conversation_id, sender_id, sender_name, sender_role, body, attachment_url, attachment_name, urgent, read_by_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id,
      sender_id || 1,
      sender_name || 'Dr. Rahmane',
      sender_role || 'radiologist',
      body || '',
      attachment_url || null,
      attachment_name || null,
      urgent ? 1 : 0,
      JSON.stringify([sender_name || 'Dr. Rahmane']),
      now
    );

    const newMsg = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/conversations/:id/read', (req, res) => {
  const { user_name } = req.body;
  const user = user_name || 'Dr. Rahmane';
  const msgs = db.prepare('SELECT id, read_by_json FROM messages WHERE conversation_id = ?').all(req.params.id);

  const stmt = db.prepare('UPDATE messages SET read_by_json = ? WHERE id = ?');
  msgs.forEach(m => {
    let readers = [];
    try { readers = JSON.parse(m.read_by_json || '[]'); } catch (e) {}
    if (!readers.includes(user)) {
      readers.push(user);
      stmt.run(JSON.stringify(readers), m.id);
    }
  });

  res.json({ message: 'Messages marqués comme lus' });
});

app.get('/api/messages/unread-count', (req, res) => {
  try {
    const countRow = db.prepare("SELECT COUNT(*) as count FROM messages WHERE read_by_json NOT LIKE '%Dr. Rahmane%'").get();
    res.json({ unread: countRow ? countRow.count : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Calls API =====
app.get('/api/calls', (req, res) => {
  const calls = db.prepare('SELECT * FROM calls ORDER BY id DESC LIMIT 20').all();
  res.json(calls);
});

app.post('/api/calls', (req, res) => {
  try {
    const { caller, phone, type, reason, notes, patient_id, created_by } = req.body;
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO calls (caller, phone, type, reason, notes, patient_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      caller || 'Appelant Inconnu',
      phone || '+213 555 000 000',
      type || 'incoming',
      reason || 'Prise de RDV',
      notes || '',
      patient_id || null,
      created_by || 'Salima',
      now
    );
    const newCall = db.prepare('SELECT * FROM calls WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newCall);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== Payments & Tariffs API =====
app.get('/api/payments/patient-balances', (req, res) => {
  try {
    const payments = db.prepare('SELECT * FROM exam_payments ORDER BY id DESC').all();
    const map = new Map();

    payments.forEach(p => {
      const key = p.patient_id;
      if (!map.has(key)) {
        map.set(key, {
          patient_id: p.patient_id,
          patient_name: p.patient_name,
          total_exams: 0,
          total_fee: 0,
          total_paid: 0,
          due_balance: 0,
          history: [],
        });
      }
      const entry = map.get(key);
      entry.total_exams += 1;
      entry.total_fee += p.total_fee || 0;
      entry.total_paid += p.paid_amount || 0;
      entry.due_balance += p.due_balance || 0;
      entry.history.push({
        ...p,
        student_id: p.patient_id,
        student_name: p.patient_name,
        grade: p.exam_type,
      });
    });

    res.json(Array.from(map.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/api/payments', '/api/student-payments'], (req, res) => {
  try {
    const payments = db.prepare('SELECT * FROM exam_payments ORDER BY id DESC').all();
    const mapped = payments.map(p => ({
      ...p,
      student_id: p.patient_id,
      student_name: p.patient_name,
      grade: p.exam_type,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments/summary', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT SUM(paid_amount) as total_paid, SUM(due_balance) as total_due FROM exam_payments').get();
    const byMethod = db.prepare('SELECT payment_method, SUM(paid_amount) as total FROM exam_payments GROUP BY payment_method').all();
    res.json({
      total_paid: totalRow ? totalRow.total_paid || 0 : 0,
      total_due: totalRow ? totalRow.total_due || 0 : 0,
      by_method: byMethod,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function cleanString(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isSamePatient(name1, name2) {
  if (!name1 || !name2) return false;
  const n1 = cleanString(name1);
  const n2 = cleanString(name2);
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;

  const words1 = n1.split(/[^a-z0-9]+/).filter(w => w.length > 1);
  const words2 = n2.split(/[^a-z0-9]+/).filter(w => w.length > 1);
  if (words1.length === 0 || words2.length === 0) return false;

  return words1.every(w => n2.includes(w)) || words2.every(w => n1.includes(w));
}

function isSameExam(exam1, exam2) {
  if (!exam1 || !exam2) return true;
  const e1 = cleanString(exam1);
  const e2 = cleanString(exam2);
  if (e1 === e2 || e1.includes(e2) || e2.includes(e1)) return true;

  const modalities = ['irm', 'scanner', 'ct', 'radio', 'echo', 'mammo', 'xray'];
  for (const m of modalities) {
    if (e1.includes(m) && e2.includes(m)) return true;
  }
  return false;
}

// Completed Queue & Exam Patients Ready for Settlement
app.get('/api/payments/queue-completed', (req, res) => {
  try {
    const queueRows = db.prepare("SELECT * FROM waiting_queue WHERE LOWER(status) IN ('completed', 'terminé', 'termine', 'done', 'finished', 'facturé', 'facture', 'fait') ORDER BY id DESC").all();
    let apptRows = [];
    try {
      apptRows = db.prepare("SELECT * FROM exam_appointments WHERE LOWER(status) IN ('completed', 'terminé', 'termine', 'done', 'finished', 'facturé', 'facture', 'fait') ORDER BY id DESC").all();
    } catch (e) {}

    let patientRows = [];
    try {
      patientRows = db.prepare("SELECT * FROM patients WHERE LOWER(status) IN ('completed', 'terminé', 'termine', 'done', 'finished', 'facturé', 'facture', 'fait') ORDER BY id DESC").all();
    } catch (e) {}

    const tariffs = db.prepare('SELECT * FROM tariffs').all();
    const allPayments = db.prepare('SELECT * FROM exam_payments ORDER BY id DESC').all();

    const itemsMap = new Map();
    const usedPaymentIds = new Set();
    const todayStr = new Date().toISOString().split('T')[0];

    const processItem = (item, source) => {
      const pName = item.patient_name || item.name || (item.first_name ? `${item.first_name} ${item.last_name}` : 'Patient');
      const exam = item.modality_name || item.requested_exam || item.exam_type || 'IRM Cérébrale';
      
      const normName = cleanString(pName);
      const normExam = cleanString(exam);
      const patientId = source === 'patient' ? item.id : item.patient_id;
      const dedupeKey = `${source}_${item.id}`;

      if (itemsMap.has(dedupeKey)) return;

      const matchingTariff = tariffs.find(t =>
        exam && (cleanString(t.label).includes(normExam) || normExam.includes(cleanString(t.modality)))
      );

      const defaultPrice = normExam.includes('irm') ? 8500 :
                           normExam.includes('scanner') || normExam.includes('ct') ? 7000 :
                           normExam.includes('radio') ? 2500 :
                           normExam.includes('echo') ? 6000 : 5000;

      const price = matchingTariff ? matchingTariff.price : defaultPrice;

      const ticketNum = item.ticket_number || '';
      const notes = item.notes || '';

      const existingPayment = allPayments.find(p => {
        if (usedPaymentIds.has(p.id)) return false;
        if (!patientId || p.patient_id !== patientId) return false;
        if (p.queue_id) return source === 'queue' && p.queue_id === item.id;
        if (p.appointment_id) return p.appointment_id === (source === 'appt' ? item.id : item.appointment_id);

        const matchesTicketNum = ticketNum && (
          (p.receipt_no && p.receipt_no.includes(ticketNum)) ||
          (p.period && p.period.includes(ticketNum))
        );
        const matchesNotePayed = notes && p.receipt_no && notes.includes(p.receipt_no);

        if (matchesTicketNum || matchesNotePayed) return true;

        const pDateStr = (p.date || '').split('T')[0].split(' ')[0];
        const itemDateStr = (item.completed_at || item.created_at || '').split('T')[0].split(' ')[0];

        const isSameDate = (pDateStr && itemDateStr && pDateStr === itemDateStr) || pDateStr === todayStr;

        return isSameDate && isSamePatient(p.patient_name, pName) && isSameExam(p.exam_type, exam);
      });

      if (existingPayment) {
        usedPaymentIds.add(existingPayment.id);
      }

      const stableTicketId = item.id ? `${source}_${item.id}` : `${source}_${normName.replace(/[^a-z0-9]/g, '')}_${normExam.replace(/[^a-z0-9]/g, '')}`;

      itemsMap.set(dedupeKey, {
        ticket_id: stableTicketId,
        ticket_number: item.ticket_number || String(item.id || '01').padStart(2, '0'),
        patient_id: patientId || null,
        queue_id: source === 'queue' ? item.id : null,
        appointment_id: source === 'appt' ? item.id : item.appointment_id || null,
        patient_name: pName,
        exam_type: exam,
        doctor_name: item.doctor_name || item.radiologist || 'Dr. Rahmane',
        completed_at: item.completed_at || item.created_at || new Date().toISOString(),
        price,
        payment: existingPayment ? {
          ...existingPayment,
          student_id: existingPayment.patient_id,
          student_name: existingPayment.patient_name,
          grade: existingPayment.exam_type,
        } : null,
      });
    };

    queueRows.forEach(item => processItem(item, 'queue'));
    const queuedAppointments = new Set(queueRows.map(item => item.appointment_id).filter(Boolean));
    apptRows.filter(item => !queuedAppointments.has(item.id)).forEach(item => processItem(item, 'appt'));
    const patientsWithVisits = new Set([...queueRows, ...apptRows].map(item => item.patient_id).filter(Boolean));
    patientRows.filter(item => !patientsWithVisits.has(item.id)).forEach(item => processItem(item, 'patient'));

    res.json(Array.from(itemsMap.values()));
  } catch (err) {
    console.error('[queue-completed error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/payments', '/api/student-payments'], (req, res) => {
  try {
    const b = req.body;
    const config = readClinicConfig(db);
    const aliases = { 'Carte Bancaire': 'Carte bancaire', 'Virement': 'Virement bancaire' };
    b.payment_method = aliases[b.payment_method] || b.payment_method || config.payments.find(p => p.active)?.name;
    if (!config.payments.some(p => p.active && p.name === b.payment_method)) return res.status(400).json({ error: 'Ce moyen de paiement est désactivé. Choisissez un autre moyen.' });
    const now = new Date();
    const dateTimeStr = b.date || `${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const today = now.toISOString().split('T')[0];

    const patientId = Number(b.patient_id ?? b.student_id);
    const patient = Number.isInteger(patientId) && patientId > 0 ? db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) : null;
    if (!patient) return res.status(400).json({ error: 'Sélectionnez le dossier patient associé à ce règlement.' });
    const queueId = b.queue_id == null ? null : Number(b.queue_id);
    const queue = queueId === null ? null : db.prepare('SELECT * FROM waiting_queue WHERE id = ?').get(queueId);
    if (queueId !== null && (!queue || queue.patient_id !== patientId)) return res.status(400).json({ error: 'Ce passage ne correspond pas au patient.' });
    const appointmentId = b.appointment_id == null ? queue?.appointment_id || null : Number(b.appointment_id);
    if (appointmentId !== null && !db.prepare('SELECT id FROM exam_appointments WHERE id = ? AND patient_id = ?').get(appointmentId, patientId)) return res.status(400).json({ error: 'Ce rendez-vous ne correspond pas au patient.' });
    if (queue?.appointment_id && appointmentId !== queue.appointment_id) return res.status(400).json({ error: 'Ce rendez-vous ne correspond pas au passage.' });
    const pName = patient.name;
    const examType = b.exam_type || b.grade || 'IRM Cérébrale';
    const totalFee = Number(b.total_fee ?? b.price ?? 8500);
    const paidAmount = parseFloat(b.paid_amount !== undefined ? b.paid_amount : totalFee);
    if (!Number.isFinite(totalFee) || totalFee < 0 || !Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > totalFee) return res.status(400).json({ error: 'Montants de règlement invalides.' });
    const dueBalance = Math.max(0, totalFee - paidAmount);

    let status = 'Paid';
    if (dueBalance > 0 && paidAmount > 0) status = 'Partial';
    else if (paidAmount === 0 && dueBalance > 0) status = 'Overdue';

    const countRow = db.prepare('SELECT COUNT(*) as count FROM exam_payments').get();
    const receiptNo = b.receipt_no || `REC-${new Date().getFullYear()}-${String(countRow.count + 101).padStart(3, '0')}`;

    const stmt = db.prepare(`
      INSERT INTO exam_payments (receipt_no, patient_id, patient_name, exam_type, period, total_fee, paid_amount, due_balance, payment_status, payment_method, date, queue_id, appointment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      receiptNo,
      patientId,
      pName,
      examType,
      b.period || `${new Date().toLocaleString('fr-FR', { month: 'long' })} ${new Date().getFullYear()}`,
      totalFee,
      paidAmount,
      dueBalance,
      status,
      b.payment_method || 'Espèces',
      dateTimeStr, queueId, appointmentId
    );

    const tax = config.taxes.regime === 'Exonéré' ? null : config.taxes.items.find(t => t.default && t.active);
    const currency = config.currencies.find(c => c.code === config.clinic.currency && c.active);
    db.prepare('UPDATE exam_payments SET fiscal_json = ? WHERE id = ?').run(JSON.stringify({ currency: currency?.code || 'DZD', rate: currency?.rate || 1, tax_name: tax?.name || '', tax_rate: tax?.rate || 0, regime: config.taxes.regime }), info.lastInsertRowid);
    // Auto-create revenue transaction in finance
    if (paidAmount > 0) {
      db.prepare(`
        INSERT INTO transactions (type, date, category, description, amount, method, party, reference, note, status, source, source_id, created_at)
        VALUES ('revenue', ?, ?, ?, ?, ?, ?, ?, 'Encaissement règlement patient', 'completed', 'payment', ?, ?)
      `).run(
        today,
        examType.includes('IRM') ? 'IRM' : examType.includes('Scanner') ? 'Scanner' : 'Radiographie',
        `Encaissement ${examType} — ${pName}`,
        paidAmount,
        b.payment_method || 'Espèces',
        pName,
        receiptNo,
        info.lastInsertRowid,
        now.toISOString()
      );
    }

    const created = db.prepare('SELECT * FROM exam_payments WHERE id = ?').get(info.lastInsertRowid);
    const result = {
      ...created,
      student_id: created.patient_id,
      student_name: created.patient_name,
      grade: created.exam_type,
    };
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Tariffs API
app.get('/api/tariffs', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM tariffs ORDER BY price DESC').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tariffs', (req, res) => {
  try {
    const { code, label, modality, price } = req.body;
    if (!label || price === undefined) return res.status(400).json({ error: 'Libellé et prix requis' });

    const generatedCode = code || `${modality || 'EXAM'}-${Math.floor(100 + Math.random() * 900)}`;

    const info = db.prepare(`
      INSERT INTO tariffs (code, label, modality, price)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET label=excluded.label, modality=excluded.modality, price=excluded.price
    `).run(generatedCode, label, modality || 'Imagerie', parseFloat(price));

    const item = db.prepare('SELECT * FROM tariffs WHERE code = ?').get(generatedCode);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/tariffs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { label, modality, price } = req.body;
    const current = db.prepare('SELECT * FROM tariffs WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Tarif non trouvé' });

    db.prepare('UPDATE tariffs SET label = ?, modality = ?, price = ? WHERE id = ?').run(
      label !== undefined ? label : current.label,
      modality !== undefined ? modality : current.modality,
      price !== undefined ? parseFloat(price) : current.price,
      id
    );

    const updated = db.prepare('SELECT * FROM tariffs WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/tariffs/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tariffs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Tarif supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Finance API =====
app.get('/api/finance/summary', (req, res) => {
  try {
    const revRow = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'revenue'").get();
    const expRow = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense'").get();
    const dueRow = db.prepare("SELECT SUM(due_balance) as total FROM exam_payments").get();

    const revenue = revRow ? revRow.total || 0 : 0;
    const expenses = expRow ? expRow.total || 0 : 0;
    const profit = revenue - expenses;
    const unpaid = dueRow ? dueRow.total || 0 : 0;

    const series = [
      { period: 'Lun', revenue: 24000, expenses: 8000 },
      { period: 'Mar', revenue: 32000, expenses: 12000 },
      { period: 'Mer', revenue: 28000, expenses: 9000 },
      { period: 'Jeu', revenue: 45000, expenses: 15000 },
      { period: 'Ven', revenue: 38000, expenses: 11000 },
      { period: 'Sam', revenue: 19000, expenses: 5000 },
    ];

    const byExam = [
      { name: 'IRM', value: 145000 },
      { name: 'Scanner', value: 98000 },
      { name: 'Radiographie', value: 45000 },
      { name: 'Échographie', value: 38000 },
      { name: 'Mammographie', value: 24000 },
    ];

    res.json({ revenue, expenses, profit, unpaid, series, by_exam: byExam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', (req, res) => {
  try {
    const { type, search } = req.query;
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (search) {
      sql += ' AND (description LIKE ? OR party LIKE ? OR category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY date DESC, id DESC';
    const items = db.prepare(sql).all(...params);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const b = req.body;
    const now = new Date().toISOString();
    const dateStr = b.date || now.split('T')[0];
    const ref = b.reference || `FAC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const stmt = db.prepare(`
      INSERT INTO transactions (type, date, category, description, amount, method, party, reference, note, status, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      b.type || 'revenue',
      dateStr,
      b.category || 'IRM',
      b.description || 'Transaction financière',
      parseFloat(b.amount) || 0,
      b.method || 'Espèces',
      b.party || '',
      ref,
      b.note || '',
      'completed',
      'manual',
      now
    );

    const newTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newTx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/finance/goals', (req, res) => {
  const goals = db.prepare('SELECT * FROM monthly_goals ORDER BY id ASC').all();
  res.json(goals);
});

app.get('/api/finance/export.csv', (req, res) => {
  try {
    const txs = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
    let csv = 'ID;Type;Date;Catégorie;Description;Montant;Mode;Partie;Référence\n';
    txs.forEach(t => {
      csv += `${t.id};"${t.type}";"${t.date}";"${t.category}";"${t.description}";${t.amount};"${t.method}";"${t.party}";"${t.reference}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Notifications API =====
app.get('/api/notifications', (req, res) => {
  try {
    if (!req.account) return res.status(401).json({ error: 'Choisissez un compte.' });
    const config = readClinicConfig(db), now = new Date(), items = [];
    if (!config.notifications.channels.application) return res.json({ total: 0, items });
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: config.clinic.timezone }).format(now);
    const enabled = id => config.notifications.items.find(n => n.id === id && n.active);
    const add = (id, type, title, count, description) => { if (count) items.push({ id, type, title, description, time: 'Actuellement', count }); };
    const waiting = enabled('waiting');
    if (waiting && req.account.features.queue_calls) {
      const n = db.prepare("SELECT COUNT(*) AS n FROM waiting_queue WHERE status = 'waiting' AND created_at <= ?").get(new Date(now.getTime() - waiting.threshold * 60000).toISOString()).n;
      add('waiting', 'urgent', 'Attente prolongée', n, `${n} patient(s) en attente depuis plus de ${waiting.threshold} minutes`);
    }
    if (enabled('appointment')) { const n = db.prepare("SELECT COUNT(*) AS n FROM exam_appointments WHERE priority = 'urgent' AND substr(date_time, 1, 10) = ? AND status NOT IN ('done', 'completed', 'cancelled', 'canceled')").get(today).n; add('appointment', 'urgent', 'Rendez-vous urgent', n, `${n} rendez-vous urgent(s) aujourd’hui`); }
    if (enabled('unpaid') && req.account.role !== 'radiologist') {
      const threshold = enabled('unpaid').threshold;
      const n = db.prepare('SELECT date FROM exam_payments WHERE due_balance > 0').all().filter(p => { const fr = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(p.date); const timestamp = Date.parse(fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : p.date); return Number.isFinite(timestamp) && now.getTime() - timestamp >= threshold * 86400000; }).length;
      add('unpaid', 'payment', 'Règlements en attente', n, `${n} reliquat(s) à régler depuis au moins ${threshold} jours`);
    }
    for (const [id, target, type, title] of [['patient', '/api/patients', 'message', 'Nouveau patient'], ['payment', '/api/payments', 'payment', 'Paiement reçu'], ['backup', '/api/clinic-config/backup', 'message', 'Sauvegarde effectuée']]) {
      if (!enabled(id) || (id === 'payment' && req.account.role === 'radiologist') || (id === 'backup' && req.account.role !== 'admin')) continue;
      const n = db.prepare("SELECT COUNT(*) AS n FROM clinic_audit_logs WHERE (target = ? OR (? = 'backup' AND action = 'Sauvegarde créée')) AND created_at >= ? AND (action = 'POST' OR action = 'Sauvegarde créée')").get(target, id, today).n;
      add(id, type, title, n, `${n} opération(s) aujourd’hui`);
    }
    if (enabled('daily')) { const n = db.prepare('SELECT COUNT(*) AS n FROM waiting_queue WHERE substr(created_at, 1, 10) = ?').get(today).n; add('daily', 'message', 'Activité du jour', n, `${n} patient(s) accueillis aujourd’hui`); }
    res.json({ total: items.reduce((total, item) => total + item.count, 0), items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

if (process.env.NODE_ENV === 'production') serveProductionApp(app, path.join(__dirname, '..', 'dist'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[RadioMed OS Backend] Express SQLite Server running on http://localhost:${PORT}`);
});
