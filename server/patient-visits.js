function dossierAccess(req, res, next) {
  const account = req.account;
  if (!account) return res.status(401).json({ error: 'Choisissez un compte pour accéder au suivi des visites.' });
  if (!account.active || !['reports', 'prescriptions', 'images'].some(feature => account.features[feature])) {
    return res.status(403).json({ error: 'Votre compte ne peut pas accéder aux dossiers patients.' });
  }
  next();
}

function optionalNumber(value, label, integer = false) {
  if (value === undefined || value === null || value === '') return null;
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
    throw new Error(`${label} doit être un nombre positif${integer ? ' entier' : ''}.`);
  }
  return number;
}

export function registerPatientVisits(app, db) {
  app.get('/api/patients/:id/visits', dossierAccess, (req, res) => {
    if (!db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Patient non trouvé.' });
    res.json(db.prepare('SELECT * FROM patient_visit_measurements WHERE patient_id = ? ORDER BY visit_date DESC, id DESC').all(req.params.id));
  });

  app.post('/api/patients/:id/visits', dossierAccess, (req, res) => {
    const patientId = Number(req.params.id);
    if (!db.prepare('SELECT id FROM patients WHERE id = ?').get(patientId)) return res.status(404).json({ error: 'Patient non trouvé.' });
    try {
      const body = req.body || {};
      const date = body.visit_date;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
        throw new Error('Saisissez une date de visite valide.');
      }
      const weight = optionalNumber(body.weight, 'Le poids');
      const systolic = optionalNumber(body.systolic, 'La tension systolique', true);
      const diastolic = optionalNumber(body.diastolic, 'La tension diastolique', true);
      if ((systolic === null) !== (diastolic === null)) throw new Error('Renseignez les deux valeurs de la tension (systolique et diastolique).');
      if (weight === null && systolic === null) throw new Error('Renseignez au moins le poids ou la tension pour cette visite.');
      const notes = body.notes ?? '';
      if (typeof notes !== 'string' || notes.length > 4000) throw new Error('L’observation doit contenir au maximum 4 000 caractères.');
      const queueId = optionalNumber(body.queue_id, 'Le numéro du passage', true);
      let appointmentId = optionalNumber(body.appointment_id, 'Le numéro du rendez-vous', true);
      if (queueId !== null) {
        const queue = db.prepare('SELECT patient_id, appointment_id FROM waiting_queue WHERE id = ?').get(queueId);
        if (!queue || queue.patient_id !== patientId) throw new Error('Ce passage ne correspond pas au patient.');
        if (appointmentId !== null && queue.appointment_id && queue.appointment_id !== appointmentId) throw new Error('Ce rendez-vous ne correspond pas au passage.');
        appointmentId ??= queue.appointment_id;
      }
      if (appointmentId != null) {
        const appointment = db.prepare('SELECT patient_id FROM exam_appointments WHERE id = ?').get(appointmentId);
        if (!appointment || appointment.patient_id !== patientId) throw new Error('Ce rendez-vous ne correspond pas au patient.');
      }
      const visit = db.transaction(() => {
        const inserted = db.prepare(`INSERT INTO patient_visit_measurements
          (patient_id, visit_date, weight, systolic, diastolic, notes, queue_id, appointment_id, recorded_by, recorded_by_name, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(patientId, date, weight, systolic, diastolic, notes.trim(), queueId, appointmentId ?? null, req.account.id, req.account.name, new Date().toISOString());
        const latestWeight = db.prepare('SELECT weight FROM patient_visit_measurements WHERE patient_id = ? AND weight IS NOT NULL ORDER BY visit_date DESC, id DESC LIMIT 1').get(patientId);
        if (latestWeight) db.prepare('UPDATE patients SET weight = ? WHERE id = ?').run(latestWeight.weight, patientId);
        return db.prepare('SELECT * FROM patient_visit_measurements WHERE id = ?').get(inserted.lastInsertRowid);
      })();
      res.status(201).json(visit);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}
