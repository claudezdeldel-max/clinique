// Shared, persisted clinic resources for administration and scheduling.
export function registerClinicResources(app, db) {
  app.get('/api/doctors', (req, res) => res.json(db.prepare("SELECT id, name, email FROM users WHERE role = 'radiologist' AND active = 1 ORDER BY name").all()));
  app.get('/api/secretaries', (req, res) => res.json(db.prepare("SELECT id, name, email FROM users WHERE role = 'secretary' AND active = 1 ORDER BY name").all()));
  app.get('/api/rooms', (req, res) => res.json(db.prepare('SELECT id, room AS name, modality AS type, status FROM equipment ORDER BY room').all()));
  const admin = (req, res, next) => req.account?.role === 'admin' ? next() : res.status(403).json({ error: 'Choisissez un compte administrateur.' });
  app.post('/api/rooms', admin, (req, res) => {
    const name = String(req.body.name || '').trim();
    const type = String(req.body.type || '').trim();
    if (!name || !type) return res.status(400).json({ error: 'Renseignez la salle et le type d’examen.' });
    if (db.prepare('SELECT id FROM equipment WHERE room = ? COLLATE NOCASE').get(name)) return res.status(409).json({ error: 'Cette salle existe déjà.' });
    const info = db.prepare("INSERT INTO equipment (name, modality, room, status) VALUES (?, ?, ?, 'available')").run(name, type, name);
    res.status(201).json({ id: Number(info.lastInsertRowid), name, type, status: 'available' });
  });
  app.put('/api/rooms/:id', admin, (req, res) => {
    const current = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Salle introuvable.' });
    if (!['available', 'maintenance'].includes(req.body.status)) return res.status(400).json({ error: 'Statut invalide.' });
    db.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(req.body.status, current.id);
    res.json({ id: current.id, name: current.room, type: current.modality, status: req.body.status });
  });
}
