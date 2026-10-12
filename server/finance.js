import { createHash, randomUUID } from 'node:crypto';
import { readClinicConfig } from './clinic-settings.js';

const cents = value => Math.round(Number(value || 0) * 100);
const money = value => value / 100;
const sum = rows => money(rows.reduce((total, row) => total + cents(row.amount), 0));
const dateKey = value => {
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(value || ''));
  return fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : String(value || '').slice(0, 10);
};
const displayDate = value => dateKey(value).split('-').reverse().join('/');
const days = (first, second) => Math.round((Date.parse(second) - Date.parse(first)) / 86400000);
const todayFor = config => new Intl.DateTimeFormat('sv-SE', { timeZone: config.clinic.timezone }).format(new Date());
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function registerFinance(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS finance_operations (
    request_id TEXT PRIMARY KEY, operation TEXT NOT NULL, payload_hash TEXT NOT NULL,
    result_json TEXT NOT NULL, created_at TEXT NOT NULL
  )`);

  function once(requestId, operation, payload, action) {
    if (typeof requestId !== 'string' || !/^[\w-]{8,100}$/.test(requestId)) throw new Error('Identifiant de règlement manquant.');
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return db.transaction(() => {
      const previous = db.prepare('SELECT * FROM finance_operations WHERE request_id = ?').get(requestId);
      if (previous) {
        if (previous.operation !== operation || previous.payload_hash !== hash) throw new Error('Cet identifiant correspond déjà à une autre opération.');
        return JSON.parse(previous.result_json);
      }
      const result = action();
      db.prepare('INSERT INTO finance_operations VALUES (?, ?, ?, ?, ?)').run(requestId, operation, hash, JSON.stringify(result), new Date().toISOString());
      return result;
    })();
  }

  function paymentMethod(method, config) {
    if (!config.payments.some(p => p.active && p.name === method)) throw new Error('Choisissez un mode de paiement actif.');
    return method;
  }

  app.get('/api/finance/dashboard', (req, res) => {
    try {
      const config = readClinicConfig(db), today = todayFor(config);
      const period = ['jour', 'semaine', 'mois', 'trimestre', 'annee'].includes(req.query.period) ? req.query.period : 'mois';
      const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7));
      const firstMonth = period === 'annee' ? 1 : period === 'trimestre' ? Math.floor((month - 1) / 3) * 3 + 1 : month;
      let start = `${year}-${String(firstMonth).padStart(2, '0')}-01`;
      if (period === 'jour') start = today;
      if (period === 'semaine') {
        const monday = new Date(today);
        monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
        start = monday.toISOString().slice(0, 10);
      }
      const all = db.prepare("SELECT * FROM transactions WHERE status = 'completed' ORDER BY date DESC, id DESC").all().map(t => ({ ...t, iso_date: dateKey(t.date) })).filter(t => validDate(t.iso_date) && t.iso_date <= today);
      const periodRows = all.filter(t => t.iso_date >= start);
      const revenues = periodRows.filter(t => t.type === 'revenue'), expenses = periodRows.filter(t => t.type === 'expense');
      const treasury = money(all.reduce((total, t) => total + cents(t.amount) * (t.type === 'revenue' ? 1 : -1), 0));
      const priorTreasury = money(all.filter(t => t.iso_date < start).reduce((total, t) => total + cents(t.amount) * (t.type === 'revenue' ? 1 : -1), 0));
      const unpaid = db.prepare('SELECT e.*, p.email FROM exam_payments e LEFT JOIN patients p ON p.id = e.patient_id WHERE e.due_balance > 0 ORDER BY e.id DESC').all();
      const impayes = unpaid.map(p => ({ id: p.id, patient_id: p.patient_id, ref: p.receipt_no, client: p.patient_name, email: p.email || '', date: displayDate(p.date), echeance: displayDate(p.date), retard: Math.max(0, days(dateKey(p.date), today) || 0), montant: p.due_balance, exam_type: p.exam_type }));
      const labels = [], buckets = [];
      if (['jour', 'semaine', 'mois'].includes(period)) {
        for (const day = new Date(start); day.toISOString().slice(0, 10) <= today; day.setUTCDate(day.getUTCDate() + 1)) {
          const key = day.toISOString().slice(0, 10);
          labels.push(period === 'jour' ? 'Aujourd’hui' : period === 'semaine' ? new Intl.DateTimeFormat('fr', { weekday: 'short', timeZone: 'UTC' }).format(day) : String(day.getUTCDate()));
          buckets.push(periodRows.filter(t => t.iso_date === key));
        }
      } else {
        for (let m = firstMonth; m <= month; m++) {
          const key = `${year}-${String(m).padStart(2, '0')}`;
          labels.push(new Intl.DateTimeFormat('fr', { month: 'short', timeZone: 'UTC' }).format(new Date(`${key}-01`)));
          buckets.push(periodRows.filter(t => t.iso_date.startsWith(key)));
        }
      }
      const examNames = new Map(db.prepare('SELECT id, exam_type FROM exam_payments').all().map(p => [p.id, p.exam_type]));
      const byExam = new Map();
      for (const t of revenues) {
        const exam = (t.source === 'payment' && examNames.get(t.source_id)) || t.category || 'Autres examens';
        byExam.set(exam, (byExam.get(exam) || 0) + cents(t.amount));
      }
      const totalExams = [...byExam.values()].reduce((a, b) => a + b, 0);
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#94a3b8', '#8b5cf6'];
      res.json({
        today, period, start, payment_methods: config.payments.filter(p => p.active).map(p => p.name),
        summary: { treasury, revenue: sum(revenues), expenses: sum(expenses), revenue_count: revenues.length, expense_count: expenses.length,
          unpaid: money(unpaid.reduce((total, p) => total + cents(p.due_balance), 0)), unpaid_count: unpaid.length,
          variation: priorTreasury ? (treasury - priorTreasury) / Math.abs(priorTreasury) * 100 : null },
        paiements: periodRows.map(t => ({ id: t.id, ref: t.reference || `TX-${t.id}`, tiers: t.party || t.description, facture: t.description, date: displayDate(t.date), mode: t.method, montant: t.amount, type: t.type === 'revenue' ? 'encaissement' : 'decaissement' })),
        impayes,
        echeances: [...impayes].sort((a, b) => b.retard - a.retard).map(p => ({ id: p.id, date: p.echeance, jours: p.retard ? `En retard de ${p.retard} jour(s)` : 'À régler', libelle: `${p.ref} — ${p.exam_type}`, tiers: p.client, type: 'entree', montant: p.montant })),
        depenses: expenses.map(t => ({ id: t.id, ref: t.reference || `DEP-${t.id}`, categorie: t.category, categorieClass: 'bg-purple-50 text-purple-700', fournisseur: t.party || t.description, date: displayDate(t.date), montant: t.amount, statut: 'Payé' })),
        chart: { labels, revenue: buckets.map(rows => sum(rows.filter(t => t.type === 'revenue'))), expenses: buckets.map(rows => sum(rows.filter(t => t.type === 'expense'))) },
        exams: [...byExam].map(([name, amount], i) => ({ name, amount: money(amount), percentage: totalExams ? Math.round(amount / totalExams * 100) : 0, color: colors[i % colors.length] })),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/finance/payments/:id/collect', (req, res) => {
    try {
      const config = readClinicConfig(db), b = req.body;
      const policy = req.account && config.permissions[req.account.role]?.payments;
      if (req.account?.role !== 'admin' && policy && (!policy.view || !policy.edit)) return res.status(403).json({ error: 'Le règlement des factures est désactivé pour votre rôle.' });
      const amount = Number(b.amount), method = String(b.method || '');
      if (!Number.isFinite(amount) || cents(amount) <= 0 || amount > 1e12 || Math.abs(amount * 100 - cents(amount)) > 0.00001) throw new Error('Saisissez un montant positif avec deux décimales maximum.');
      const result = once(b.request_id, 'collect', { id: Number(req.params.id), amount, method }, () => {
        paymentMethod(method, config);
        const p = db.prepare('SELECT * FROM exam_payments WHERE id = ?').get(req.params.id);
        if (!p) throw new Error('Facture introuvable.');
        if (cents(amount) > cents(p.due_balance)) throw new Error('Le montant dépasse le solde restant de cette facture.');
        const paid = money(cents(p.paid_amount) + cents(amount)), due = money(cents(p.total_fee) - cents(paid));
        if (due < 0) throw new Error('Le montant dépasse le solde de cette facture.');
        db.prepare('UPDATE exam_payments SET paid_amount = ?, due_balance = ?, payment_status = ?, payment_method = ? WHERE id = ?').run(paid, due, due === 0 ? 'Paid' : 'Partial', method, p.id);
        db.prepare(`INSERT INTO transactions (type, date, category, description, amount, method, party, reference, note, status, source, source_id, created_at)
          VALUES ('revenue', ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'payment', ?, ?)`).run(todayFor(config), p.exam_type, `Règlement ${p.exam_type} — ${p.patient_name}`, amount, method, p.patient_name, p.receipt_no, 'Encaissement du reliquat depuis Finance', p.id, new Date().toISOString());
        return db.prepare('SELECT * FROM exam_payments WHERE id = ?').get(p.id);
      });
      res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });

  app.post('/api/finance/expenses', (req, res) => {
    try {
      const config = readClinicConfig(db), b = req.body;
      const payload = { description: String(b.description || '').trim(), category: String(b.category || '').trim(), party: String(b.party || '').trim(), date: String(b.date || ''), method: String(b.method || ''), amount: Number(b.amount) };
      if (!payload.description || !payload.category || payload.description.length > 500 || payload.party.length > 200 || payload.category.length > 100) throw new Error('Saisissez le libellé et la catégorie de la dépense.');
      if (!validDate(payload.date) || payload.date > todayFor(config)) throw new Error('Choisissez la date de paiement, aujourd’hui ou une date passée.');
      if (!Number.isFinite(payload.amount) || cents(payload.amount) <= 0 || payload.amount > 1e12 || Math.abs(payload.amount * 100 - cents(payload.amount)) > 0.00001) throw new Error('Saisissez un montant positif avec deux décimales maximum.');
      const result = once(b.request_id, 'expense', payload, () => {
        paymentMethod(payload.method, config);
        const reference = `DEP-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        const row = db.prepare(`INSERT INTO transactions (type, date, category, description, amount, method, party, reference, note, status, source, created_at)
          VALUES ('expense', ?, ?, ?, ?, ?, ?, ?, '', 'completed', 'manual', ?)`).run(payload.date, payload.category, payload.description, payload.amount, payload.method, payload.party, reference, new Date().toISOString());
        return db.prepare('SELECT * FROM transactions WHERE id = ?').get(row.lastInsertRowid);
      });
      res.status(201).json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });
}
