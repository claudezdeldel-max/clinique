import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { migratePatientSchema } from './patient-schema.js';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'radio_clinic.db');

mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      change TEXT,
      trend TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      age INTEGER,
      gender TEXT DEFAULT 'Homme',
      social_sec_no TEXT,
      phone TEXT,
      prescribing_doctor TEXT,
      created_at TEXT,
      first_name TEXT,
      last_name TEXT,
      birth_date TEXT,
      nationality TEXT DEFAULT 'Algérienne',
      marital_status TEXT DEFAULT 'Marié(e)',
      address TEXT,
      profession TEXT,
      emergency_contact TEXT,
      insurance_type TEXT DEFAULT 'CNAS',
      insurance_number TEXT,
      blood_group TEXT DEFAULT 'A+',
      weight REAL DEFAULT 70,
      height REAL DEFAULT 170,
      allergies_json TEXT,
      allergies_notes TEXT,
      history_json TEXT,
      history_notes TEXT,
      requested_exam TEXT,
      notes TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'Actif',
      last_visit TEXT
    );

    CREATE TABLE IF NOT EXISTS radiologists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      specialization TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT DEFAULT 'Actif',
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS exam_modalities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      doctor TEXT NOT NULL,
      room TEXT NOT NULL,
      patient_count INTEGER DEFAULT 0,
      schedule TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      period TEXT NOT NULL,
      total_fee REAL NOT NULL,
      paid_amount REAL NOT NULL,
      due_balance REAL NOT NULL,
      payment_status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      patient_name TEXT NOT NULL,
      modality_id INTEGER,
      modality_name TEXT NOT NULL,
      date_time TEXT NOT NULL,
      radiologist TEXT NOT NULL,
      time TEXT,
      duration TEXT DEFAULT '30 min',
      type TEXT DEFAULT 'event',
      location TEXT,
      description TEXT,
      color TEXT DEFAULT '#0ea5e9',
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      room TEXT,
      exam_type TEXT,
      patient_phone TEXT,
      emergency_contact TEXT,
      notes TEXT,
      arrived_at TEXT,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_volume_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      present_count INTEGER NOT NULL,
      absent_count INTEGER NOT NULL,
      percentage REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS waiting_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      modality_name TEXT,
      doctor_name TEXT,
      room_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      priority TEXT NOT NULL DEFAULT 'normal',
      created_at TEXT NOT NULL,
      called_at TEXT,
      completed_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      patient_age INTEGER NOT NULL,
      phone TEXT,
      exam_type TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      date TEXT NOT NULL,
      weight REAL NOT NULL,
      height REAL NOT NULL,
      bmi REAL NOT NULL,
      blood_pressure TEXT NOT NULL,
      heart_rate INTEGER NOT NULL,
      temperature REAL NOT NULL,
      spo2 INTEGER NOT NULL,
      blood_sugar REAL,
      clinical_notes TEXT,
      radiology_report TEXT,
      scans_json TEXT,
      prescription_json TEXT,
      medical_history TEXT,
      status TEXT NOT NULL DEFAULT 'Planifié'
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'secretary',
      email TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS patient_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patient_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS patient_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      kind TEXT DEFAULT 'pdf',
      uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patient_visit_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      visit_date TEXT NOT NULL,
      weight REAL,
      systolic INTEGER,
      diastolic INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      queue_id INTEGER,
      appointment_id INTEGER,
      recorded_by INTEGER NOT NULL,
      recorded_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS patient_visit_measurements_date
      ON patient_visit_measurements(patient_id, visit_date DESC, id DESC);

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      modality TEXT NOT NULL,
      room TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      usage_pct INTEGER DEFAULT 0,
      next_maintenance TEXT
    );

    CREATE TABLE IF NOT EXISTS tariffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      modality TEXT NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_no TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      consultation_id INTEGER,
      appointment_id INTEGER,
      exam_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content_html TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER DEFAULT 1,
      author TEXT NOT NULL,
      severity TEXT DEFAULT 'Normal',
      diagnosis TEXT,
      recommendations TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      validated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS report_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      content_html TEXT NOT NULL,
      author TEXT NOT NULL,
      saved_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'direct',
      participants_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_flags (
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      starred INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      body TEXT NOT NULL,
      attachment_url TEXT,
      attachment_name TEXT,
      urgent INTEGER DEFAULT 0,
      read_by_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller TEXT NOT NULL,
      phone TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'incoming',
      reason TEXT,
      notes TEXT,
      patient_id INTEGER,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      party TEXT,
      reference TEXT,
      note TEXT,
      status TEXT DEFAULT 'completed',
      source TEXT DEFAULT 'manual',
      source_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      label TEXT NOT NULL,
      target REAL NOT NULL,
      current REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_no TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      date TEXT NOT NULL,
      medications_json TEXT NOT NULL,
      instructions TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Migrations for missing columns
  migrateTableColumns();
  migratePatientSchema(db);

  // Seed default admin users and settings
  seedBaseSystem();

  // Seed initial data if tables are empty
  const count = db.prepare('SELECT COUNT(*) as count FROM patients').get();
  if (count.count === 0 && (process.env.SEED_DEMO_DATA === 'true' || process.env.NODE_ENV !== 'production')) {
    seedDatabase();
  }
}

function migrateTableColumns() {
  db.exec(`CREATE TABLE IF NOT EXISTS account_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );
  INSERT OR IGNORE INTO account_roles (id, name) VALUES
    ('admin', 'Administrateur'), ('radiologist', 'Médecin'), ('secretary', 'Secrétariat');
  INSERT OR IGNORE INTO account_roles (id, name) SELECT DISTINCT role, role FROM users;`);
  const additions = {
    users: { phone: "TEXT DEFAULT ''", active: 'INTEGER NOT NULL DEFAULT 1', is_super_admin: 'INTEGER NOT NULL DEFAULT 0', features_json: "TEXT DEFAULT '{}'", call_exam_types_json: "TEXT DEFAULT '[\"IRM\",\"Scanner\",\"Echo\",\"Radio\",\"Mammo\",\"Other\"]'" },
    sessions: { last_activity_at: 'TEXT', auth_method: "TEXT NOT NULL DEFAULT 'legacy'" },
    exam_payments: { fiscal_json: 'TEXT', queue_id: 'INTEGER', appointment_id: 'INTEGER' },
    waiting_queue: { patient_id: 'INTEGER', appointment_id: 'INTEGER' },
    reports: { queue_id: 'INTEGER', print_started_at: 'TEXT', delivery_status: 'TEXT', patient_informed_at: 'TEXT', delivered_at: 'TEXT' },
  };
  for (const [table, columns] of Object.entries(additions)) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    for (const [column, type] of Object.entries(columns)) {
      if (!existing.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }
  // Backfill only unambiguous patient identities in legacy tickets.
  db.exec(`UPDATE waiting_queue SET patient_id = (SELECT MIN(id) FROM patients WHERE name = waiting_queue.patient_name)
    WHERE patient_id IS NULL AND (SELECT COUNT(*) FROM patients WHERE name = waiting_queue.patient_name) = 1;
    CREATE UNIQUE INDEX IF NOT EXISTS report_queue_unique ON reports(queue_id) WHERE queue_id IS NOT NULL;`);
  const patientCols = db.prepare("PRAGMA table_info(patients)").all().map(c => c.name);
  const addPatientCol = (col, type) => {
    if (!patientCols.includes(col)) db.exec(`ALTER TABLE patients ADD COLUMN ${col} ${type}`);
  };

  addPatientCol('first_name', 'TEXT');
  addPatientCol('last_name', 'TEXT');
  addPatientCol('birth_date', 'TEXT');
  addPatientCol('nationality', "TEXT DEFAULT 'Algérienne'");
  addPatientCol('marital_status', "TEXT DEFAULT 'Marié(e)'");
  addPatientCol('address', 'TEXT');
  addPatientCol('profession', 'TEXT');
  addPatientCol('emergency_contact', 'TEXT');
  addPatientCol('insurance_type', "TEXT DEFAULT 'CNAS'");
  addPatientCol('insurance_number', 'TEXT');
  addPatientCol('blood_group', "TEXT DEFAULT 'A+'");
  addPatientCol('weight', 'REAL DEFAULT 70');
  addPatientCol('height', 'REAL DEFAULT 170');
  addPatientCol('allergies_json', 'TEXT');
  addPatientCol('allergies_notes', 'TEXT');
  addPatientCol('history_json', 'TEXT');
  addPatientCol('history_notes', 'TEXT');
  addPatientCol('requested_exam', 'TEXT');
  addPatientCol('notes', 'TEXT');
  addPatientCol('photo_url', 'TEXT');
  addPatientCol('status', "TEXT DEFAULT 'Actif'");
  addPatientCol('last_visit', 'TEXT');

  const apptCols = db.prepare("PRAGMA table_info(exam_appointments)").all().map(c => c.name);
  const addApptCol = (col, type) => {
    if (!apptCols.includes(col)) db.exec(`ALTER TABLE exam_appointments ADD COLUMN ${col} ${type}`);
  };
  addApptCol('status', "TEXT DEFAULT 'pending'");
  addApptCol('priority', "TEXT DEFAULT 'normal'");
  addApptCol('room', 'TEXT');
  addApptCol('exam_type', 'TEXT');
  addApptCol('patient_phone', 'TEXT');
  addApptCol('emergency_contact', 'TEXT');
  addApptCol('notes', 'TEXT');
  addApptCol('created_by', 'TEXT');
  addApptCol('arrived_at', 'TEXT');
}

function seedBaseSystem() {
  try {
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
    if (settingsCount.count === 0) {
      const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      insertSetting.run('admin_first_name', 'Admin');
      insertSetting.run('admin_last_name', 'RadioMed');
      insertSetting.run('admin_email', 'admin@radiomed.fr');
      insertSetting.run('admin_username', 'admin');
      insertSetting.run('clinic_name', 'RadioMed OS — Clinique de Radiologie');
      insertSetting.run('currency', 'DA');
      insertSetting.run('queue_paused', '0');
    }

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
      db.prepare(`INSERT INTO users (username, password, name, role, email, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run('admin', 'admin', 'Administrateur RadioMed', 'admin', 'admin@radiomed.fr', '2026-09-01');
      db.prepare(`INSERT INTO users (username, password, name, role, email, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run('radiologue', 'radiologue', 'Dr. Rahmane', 'radiologist', 'd.rahmane@radiomed.fr', '2026-09-01');
      db.prepare(`INSERT INTO users (username, password, name, role, email, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run('secretaire', 'secretaire', 'Salima (Secrétariat)', 'secretary', 'salima@radiomed.fr', '2026-09-01');
    }
  } catch (err) {
    console.error("Base system seed error:", err);
  }
}

export function seedDatabase() {
  const insertMetric = db.prepare(`
    INSERT OR REPLACE INTO metrics (key, label, value, change, trend, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertMetric.run('total_students', 'Patients Traités', '5', '5 enregistrés', 'up', 'Patients actifs dans le système');
  insertMetric.run('active_teachers', 'Radiologues & Staff', '3', '3 actifs', 'neutral', 'Médecins radiologues référents');
  insertMetric.run('active_classes', 'Salles d Imagerie', '4', '4 salles', 'neutral', 'IRM, Scanner, Écho, Radio');
  insertMetric.run('avg_attendance', 'Taux d Occupation IRM', '94%', 'Optimal', 'up', 'Calculé sur les salles actives');

  // Seed Equipment
  const insertEquipment = db.prepare(`
    INSERT OR IGNORE INTO equipment (id, name, modality, room, status, usage_pct, next_maintenance)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertEquipment.run(1, 'IRM Siemens 3T', 'IRM', 'Salle A - IRM', 'available', 85, '2026-10-15');
  insertEquipment.run(2, 'Scanner CT 128 Coupes', 'Scanner (CT)', 'Salle B - Scanner', 'busy', 92, '2026-10-20');
  insertEquipment.run(3, 'Échographe GE Voluson', 'Échographie', 'Salle C - Échographie', 'available', 60, '2026-11-01');
  insertEquipment.run(4, 'Mammographe Numérique Hologic', 'Mammographie', 'Salle D - Mammographie', 'available', 45, '2026-11-10');

  // Seed Tariffs
  const insertTariff = db.prepare(`
    INSERT OR REPLACE INTO tariffs (code, label, modality, price) VALUES (?, ?, ?, ?)
  `);
  insertTariff.run('IRM-CER', 'IRM Cérébrale 3T', 'IRM', 8500);
  insertTariff.run('CT-ABD', 'Scanner CT Abdomen', 'Scanner (CT)', 7000);
  insertTariff.run('RAD-THO', 'Radiographie Thorax', 'Radiographie', 2500);
  insertTariff.run('ECH-VAS', 'Échographie Doppler', 'Échographie', 6000);
  insertTariff.run('MAM-BIL', 'Mammographie Bilatérale', 'Mammographie', 5500);

  // Patients (5 records matching CIMA mockups)
  const insertPatient = db.prepare(`
    INSERT OR IGNORE INTO patients (
      id, name, first_name, last_name, email, age, gender, social_sec_no, phone, prescribing_doctor,
      created_at, birth_date, nationality, marital_status, address, profession, emergency_contact,
      insurance_type, insurance_number, blood_group, weight, height, allergies_json, allergies_notes,
      history_json, history_notes, requested_exam, notes, status, last_visit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPatient.run(
    1, 'Amine Benali', 'Amine', 'Benali', 'a.benali@email.com', 35, 'Homme', '1 91 05 16 123 456 78', '+213 555 123 456', 'Dr. Rahmane',
    '2026-09-01', '1991-05-16', 'Algérienne', 'Marié(e)', '12 Rue Didouche Mourad, Alger', 'Ingénieur', 'Kamel Benali (+213 555 999 000)',
    'CNAS', '1234567890', 'A+', 75, 175, JSON.stringify(['Pénicilline', 'Iode']), 'Réaction érythémateuse à l injection de produit de contraste',
    JSON.stringify(['Diabète', 'Hypertension']), 'Suivi médical régulier', 'IRM Cérébrale', 'Patient ponctuel', 'Actif', '2026-09-25'
  );

  insertPatient.run(
    2, 'Sarah Mansouri', 'Sarah', 'Mansouri', 's.mansouri@email.com', 28, 'Femme', '2 98 03 22 234 567 89', '+213 555 234 567', 'Dr. Kaci',
    '2026-09-05', '1998-03-22', 'Algérienne', 'Célibataire', 'Cité 1000 Logements, Bab Ezzouar', 'Architecte', 'Nadia Mansouri (+213 555 888 111)',
    'CASNOS', '9876543210', 'O+', 62, 168, JSON.stringify([]), '',
    JSON.stringify(['Asthme']), 'Traitement de fond par inhalateur', 'Radiographie Thorax', 'Aucune remarque', 'Actif', '2026-09-26'
  );

  insertPatient.run(
    3, 'Yacine Kadri', 'Yacine', 'Kadri', 'y.kadri@email.com', 42, 'Homme', '1 84 11 10 345 678 90', '+213 555 345 678', 'Dr. Meriem',
    '2026-09-10', '1984-11-10', 'Algérienne', 'Marié(e)', 'Hydra, Alger', 'Commerçant', 'Fatima Kadri (+213 555 777 222)',
    'Mutuelle', '4567890123', 'B+', 82, 180, JSON.stringify(['Aspirine']), 'Brûlures d estomac',
    JSON.stringify(['Chirurgie antérieure']), 'Appendicectomie en 2018', 'Scanner Abdomen', 'Urgence abdominale', 'Actif', '2026-09-27'
  );

  insertPatient.run(
    4, 'Lina Fares', 'Lina', 'Fares', 'l.fares@email.com', 31, 'Femme', '2 95 07 04 456 789 01', '+213 555 456 789', 'Dr. Rahmane',
    '2026-09-15', '1995-07-04', 'Algérienne', 'Marié(e)', 'Ben Aknoun, Alger', 'Enseignante', 'Omar Fares (+213 555 666 333)',
    'CNAS', '6543210987', 'AB+', 58, 165, JSON.stringify([]), '',
    JSON.stringify([]), 'RAS', 'Échographie', 'Examen de contrôle', 'Actif', '2026-09-28'
  );

  insertPatient.run(
    5, 'Karim Haddad', 'Karim', 'Haddad', 'k.haddad@email.com', 50, 'Homme', '1 76 09 19 567 890 12', '+213 555 567 890', 'Dr. Kaci',
    '2026-09-20', '1976-09-19', 'Algérienne', 'Marié(e)', 'Kouba, Alger', 'Cadre bancaire', 'Samia Haddad (+213 555 555 444)',
    'CNAS', '3210987654', 'O-', 88, 178, JSON.stringify(['Latex']), 'Irritation cutanée',
    JSON.stringify(['Cardiopathie']), 'Hypertension artérielle sous traitement', 'Mammographie', 'Bilan global', 'Actif', '2026-09-29'
  );

  // Patient Notes
  const insertNote = db.prepare(`INSERT OR IGNORE INTO patient_notes (id, patient_id, author, content, created_at) VALUES (?, ?, ?, ?, ?)`);
  insertNote.run(1, 1, 'Dr. Rahmane', 'Patient bien coopératif lors de l examen IRM. Pas de réaction indésirable.', '2026-09-25 10:30');
  insertNote.run(2, 1, 'Salima (Secrétariat)', 'Dossier CNAS validé. Tiers payant appliqué.', '2026-09-25 09:15');

  // Appointments (Matching RDV.html mockups)
  const insertAppt = db.prepare(`
    INSERT OR IGNORE INTO exam_appointments (
      id, patient_id, patient_name, modality_id, modality_name, date_time, radiologist, time, duration,
      type, location, description, color, status, priority, room, exam_type, patient_phone, emergency_contact, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date().toISOString().split('T')[0];

  insertAppt.run(1, 1, 'Amine Benali', 1, 'IRM Cérébrale', `${today}T09:30:00`, 'Dr. Rahmane', '09:30', '45 min', 'event', 'Salle A - IRM', 'IRM Cérébrale sans injection', '#0ea5e9', 'confirmed', 'normal', 'Salle A - IRM', 'IRM Cérébrale', '+213 555 123 456', 'Kamel Benali', 'A jeun depuis minuit', 'Salima');
  insertAppt.run(2, 2, 'Sarah Mansouri', 3, 'Radiographie Thorax', `${today}T10:15:00`, 'Dr. Kaci', '10:15', '20 min', 'event', 'Salle C - Échographie', 'Radiographie Thoracique Face', '#10b981', 'pending', 'normal', 'Salle Radio 1', 'Radiographie Thorax', '+213 555 234 567', 'Nadia Mansouri', 'Vérifier antécédents asthme', 'Salima');
  insertAppt.run(3, 3, 'Yacine Kadri', 2, 'Scanner Abdomen', `${today}T11:00:00`, 'Dr. Meriem', '11:00', '30 min', 'event', 'Salle B - Scanner', 'Scanner CT Abdomino-pelvien', '#ef4444', 'urgent', 'urgent', 'Salle B - Scanner', 'Scanner Abdomen', '+213 555 345 678', 'Fatima Kadri', 'Urgence douleur vive', 'Salima');
  insertAppt.run(4, 4, 'Lina Fares', 4, 'Échographie', `${today}T11:45:00`, 'Dr. Rahmane', '11:45', '30 min', 'event', 'Salle C - Échographie', 'Échographie abdominale', '#8b5cf6', 'done', 'normal', 'Salle C - Échographie', 'Échographie', '+213 555 456 789', 'Omar Fares', 'Examen terminé à 12:15', 'Salima');
  insertAppt.run(5, 5, 'Karim Haddad', 5, 'Mammographie', `${today}T12:30:00`, 'Dr. Kaci', '12:30', '30 min', 'event', 'Salle D - Mammographie', 'Mammographie numérique', '#ec4899', 'confirmed', 'normal', 'Salle D - Mammographie', 'Mammographie', '+213 555 567 890', 'Samia Haddad', 'Bilan systématique', 'Salima');

  // Waiting Queue initial records
  const insertQueue = db.prepare(`
    INSERT OR IGNORE INTO waiting_queue (id, ticket_number, patient_name, modality_name, doctor_name, room_name, status, priority, created_at, called_at, completed_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  insertQueue.run(1, '01', 'Amine Benali', 'IRM Cérébrale', 'Dr. Rahmane', 'Salle A - IRM', 'called', 'normal', now, now, null, 'Examen en cours');
  insertQueue.run(2, '02', 'Sarah Mansouri', 'Radio Thorax', 'Dr. Kaci', 'Salle Radio 1', 'waiting', 'normal', now, null, null, 'En attente salle d attente');
  insertQueue.run(3, '03', 'Yacine Kadri', 'Scanner Abdomen', 'Dr. Meriem', 'Salle B - Scanner', 'waiting', 'urgent', now, null, null, 'Urgence priorité 1');
  insertQueue.run(4, '04', 'Lina Fares', 'Échographie', 'Dr. Rahmane', 'Salle C - Échographie', 'completed', 'normal', now, now, now, 'Terminé');

  // Payments (DA)
  const insertPayment = db.prepare(`
    INSERT OR IGNORE INTO exam_payments (id, receipt_no, patient_id, patient_name, exam_type, period, total_fee, paid_amount, due_balance, payment_status, payment_method, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPayment.run(1, 'REC-2026-001', 1, 'Amine Benali', 'IRM Cérébrale', 'Septembre 2026', 8500, 8500, 0, 'Paid', 'Espèces', today);
  insertPayment.run(2, 'REC-2026-002', 2, 'Sarah Mansouri', 'Radiographie Thorax', 'Septembre 2026', 2500, 2500, 0, 'Paid', 'Carte bancaire', today);
  insertPayment.run(3, 'REC-2026-003', 3, 'Yacine Kadri', 'Scanner Abdomen', 'Septembre 2026', 7000, 4000, 3000, 'Partial', 'Espèces', today);

  // Transactions (Finance)
  const insertTx = db.prepare(`
    INSERT OR IGNORE INTO transactions (id, type, date, category, description, amount, method, party, reference, note, status, source, source_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run(1, 'revenue', today, 'IRM', 'Encaissement IRM Cérébrale - Amine Benali', 8500, 'Espèces', 'Amine Benali', 'REC-2026-001', 'Quittance réglée', 'completed', 'payment', 1, now);
  insertTx.run(2, 'revenue', today, 'Radiographie', 'Encaissement Radio Thorax - Sarah Mansouri', 2500, 'Carte bancaire', 'Sarah Mansouri', 'REC-2026-002', 'Carte bancaire validée', 'completed', 'payment', 2, now);
  insertTx.run(3, 'expense', today, 'Maintenance', 'Maintenance préventive IRM Siemens 3T', 15000, 'Virement', 'Siemens Healthineers', 'FAC-SIE-992', 'Contrat trimestriel', 'completed', 'manual', null, now);
  insertTx.run(4, 'expense', today, 'Fournitures', 'Achat produit de contraste Iode (50 flacons)', 12500, 'Chèque', 'Pharmacie Centrale', 'FAC-PC-102', 'Stock radiologie', 'completed', 'manual', null, now);

  // Monthly Goals
  const insertGoal = db.prepare(`INSERT OR IGNORE INTO monthly_goals (id, month, label, target, current) VALUES (?, ?, ?, ?, ?)`);
  insertGoal.run(1, '2026-09', 'Objectif Encaissements', 500000, 345000);
  insertGoal.run(2, '2026-09', 'Examens IRM Cibles', 120, 98);

  // Radiology Reports
  const insertReport = db.prepare(`
    INSERT OR IGNORE INTO reports (id, report_no, patient_id, patient_name, exam_type, title, content_html, status, version, author, severity, diagnosis, recommendations, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReport.run(1, 'CR-2026-001', 1, 'Amine Benali', 'IRM Cérébrale', 'Compte-Rendu IRM Cérébrale 3T', '<p>Absence de lésion parenchymateuse évolutive.</p>', 'validated', 1, 'Dr. Rahmane', 'Normal', 'Examen normal', 'Contrôle à 1 an', today, today);
  insertReport.run(2, 'CR-2026-002', 2, 'Sarah Mansouri', 'Radiographie Thorax', 'Compte-Rendu Radio Thoracique', '<p>Silhouette cardiaque normale. Pas de foyer parenchymateux.</p>', 'draft', 1, 'Dr. Kaci', 'Normal', 'Examen normal', 'Aucune', today, today);

  // Prescriptions
  const insertPrescription = db.prepare(`
    INSERT OR IGNORE INTO prescriptions (id, prescription_no, patient_id, patient_name, doctor_name, date, medications_json, instructions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPrescription.run(
    1,
    'ORD-2026-001',
    1,
    'Amine Benali',
    'Dr. Rahmane',
    today,
    JSON.stringify([
      { name: 'Paracétamol 1000mg', dosage: '1 comprimé', posology: '3 fois par jour', duration: '5 jours' },
      { name: 'Spasfon 80mg', dosage: '2 comprimés', posology: 'En cas de douleur', duration: '3 jours' }
    ]),
    'Prendre les comprimés au milieu des repas.',
    now
  );

  // Conversations & Messages (Internal messaging)
  const insertConv = db.prepare(`INSERT OR IGNORE INTO conversations (id, title, type, participants_json, created_at) VALUES (?, ?, ?, ?, ?)`);
  insertConv.run(1, 'Dr. Rahmane & Salima', 'direct', JSON.stringify(['Dr. Rahmane', 'Salima (Secrétariat)']), now);

  const insertMsg = db.prepare(`
    INSERT OR IGNORE INTO messages (id, conversation_id, sender_id, sender_name, sender_role, body, urgent, read_by_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMsg.run(1, 1, 2, 'Salima (Secrétariat)', 'secretary', 'Bonjour Docteur, le patient Amine Benali est arrivé pour son IRM.', 0, JSON.stringify(['Salima (Secrétariat)']), now);
  insertMsg.run(2, 1, 1, 'Dr. Rahmane', 'radiologist', 'Merci Salima, je le prends dans 5 minutes en Salle A.', 0, JSON.stringify(['Dr. Rahmane', 'Salima (Secrétariat)']), now);
}

export function resetDatabase() {
  db.exec(`
    DELETE FROM metrics;
    DELETE FROM patient_visit_measurements;
    DELETE FROM patients;
    DELETE FROM radiologists;
    DELETE FROM exam_modalities;
    DELETE FROM exam_payments;
    DELETE FROM exam_appointments;
    DELETE FROM waiting_queue;
    DELETE FROM consultations;
    DELETE FROM patient_notes;
    DELETE FROM patient_history;
    DELETE FROM patient_documents;
    DELETE FROM equipment;
    DELETE FROM tariffs;
    DELETE FROM reports;
    DELETE FROM report_versions;
    DELETE FROM prescriptions;
    DELETE FROM conversations;
    DELETE FROM conversation_flags;
    DELETE FROM messages;
    DELETE FROM calls;
    DELETE FROM transactions;
    DELETE FROM monthly_goals;
  `);
  seedBaseSystem();
  seedDatabase();
}

export default db;
