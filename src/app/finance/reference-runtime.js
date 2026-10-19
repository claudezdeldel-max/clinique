import Alpine from 'alpinejs';
import Chart from 'chart.js/auto';
import { createClientId, copyText } from '@/lib/utils';

// Keep the supplied HTML and Alpine bindings intact; connect only Finance.
let fluxChart, modeChart;
// The reference's breakpoints use the full app viewport, including its sidebar.
// Match those same breakpoints when the copied document sits inside our layout.
const mediaRules = [];
function syncReferenceViewport() {
  if (!mediaRules.length) {
    for (const sheet of document.styleSheets) {
      if (!sheet.href?.includes('finance-reference.css')) continue;
      for (const rule of sheet.cssRules) {
        const match = rule instanceof CSSMediaRule && /^\(min-width:\s*(\d+)px\)$/.exec(rule.conditionText);
        if (match) mediaRules.push({ rule, width: Number(match[1]) });
      }
    }
  }
  const width = window.parent.innerWidth;
  for (const entry of mediaRules) entry.rule.media.mediaText = width >= entry.width ? 'all' : 'not all';
}
const emptySummary = { treasury: 0, revenue: 0, expenses: 0, unpaid: 0, revenue_count: 0, expense_count: 0, unpaid_count: 0, variation: null };
const token = () => {
  try { return JSON.parse(localStorage.getItem('radiomed-account') || '{}').state?.token; } catch { return null; }
};
async function api(path, options = {}) {
  const session = token();
  const response = await fetch('/api' + path, { ...options, headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossible de terminer cette opération.');
  if (options.method === 'POST') window.parent.postMessage({ type: 'finance-data-changed' }, window.location.origin);
  return data;
}

Alpine.data('financeComptaApp', () => ({
  module: 'finance', periode: 'mois', tabFinance: 'paiements', loading: true, error: '', saving: false,
  summary: { ...emptySummary }, paiements: [], impayes: [], echeances: [], depenses: [], exams: [], paymentMethods: [], today: '',
  toast: { show: false, message: '' }, collectionOpen: false, expenseOpen: false, reminderOpen: false,
  collection: {}, expense: {}, reminder: '', formError: '', timer: null, toastTimer: null, sequence: 0,
  init() {
    syncReferenceViewport();
    window.addEventListener('resize', syncReferenceViewport);
    this.$watch('periode', () => this.reload());
    this.$watch('module', () => this.$nextTick(() => { fluxChart?.resize(); modeChart?.resize(); }));
    this.onRefresh = event => {
      if (event.origin === window.location.origin && event.source === window.parent && event.data?.type === 'finance-refresh') this.reload();
    };
    this.onFocus = () => this.reload();
    window.addEventListener('message', this.onRefresh);
    window.addEventListener('focus', this.onFocus);
    this.timer = setInterval(() => { if (!document.hidden) this.reload(); }, 15000);
    this.reload();
  },
  destroy() {
    window.removeEventListener('resize', syncReferenceViewport);
    clearInterval(this.timer); clearTimeout(this.toastTimer);
    window.removeEventListener('message', this.onRefresh); window.removeEventListener('focus', this.onFocus);
    fluxChart?.destroy(); modeChart?.destroy(); fluxChart = modeChart = undefined;
  },
  async reload() {
    const sequence = ++this.sequence;
    try {
      const data = await api('/finance/dashboard?period=' + this.periode);
      if (sequence !== this.sequence) return;
      this.summary = data.summary; this.paiements = data.paiements; this.impayes = data.impayes;
      this.echeances = data.echeances; this.depenses = data.depenses; this.exams = data.exams;
      this.paymentMethods = data.payment_methods; this.today = data.today; this.error = '';
      this.$nextTick(() => this.drawCharts(data));
    } catch (error) { if (sequence === this.sequence) this.error = error.message; }
    finally { if (sequence === this.sequence) this.loading = false; }
  },
  drawCharts(data) {
    if (!fluxChart) fluxChart = new Chart(document.getElementById('fluxChart'), {
      type: 'bar', data: { labels: [], datasets: [
        { label: 'Encaissements', data: [], backgroundColor: '#10b981', borderRadius: 6, barPercentage: 0.6 },
        { label: 'Décaissements', data: [], backgroundColor: '#ef4444', borderRadius: 6, barPercentage: 0.6 },
      ] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: value => (value / 1000) + 'k' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
      } },
    });
    fluxChart.data.labels = data.chart.labels;
    fluxChart.data.datasets[0].data = data.chart.revenue; fluxChart.data.datasets[1].data = data.chart.expenses;
    fluxChart.update('none');
    if (!modeChart) modeChart = new Chart(document.getElementById('modePaiementChart'), {
      type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 8 }] },
      options: { responsive: true, cutout: '68%', plugins: { legend: { display: false } } },
    });
    modeChart.data.labels = data.exams.map(exam => exam.name);
    modeChart.data.datasets[0].data = data.exams.map(exam => exam.amount);
    modeChart.data.datasets[0].backgroundColor = data.exams.map(exam => exam.color);
    modeChart.update('none');
  },
  openCollection(invoice) {
    this.collection = { ...invoice, amount: invoice.montant, method: this.paymentMethods[0] || '', request_id: createClientId() };
    this.formError = ''; this.collectionOpen = true;
  },
  async saveCollection() {
    if (this.saving) return;
    this.saving = true; this.formError = '';
    try {
      await api(`/finance/payments/${this.collection.id}/collect`, { method: 'POST', body: JSON.stringify({ amount: Number(this.collection.amount), method: this.collection.method, request_id: this.collection.request_id }) });
      this.collectionOpen = false; this.showToast('Règlement enregistré'); await this.reload();
    } catch (error) { this.formError = error.message; }
    finally { this.saving = false; }
  },
  openExpense() {
    this.expense = { date: this.today, description: '', category: 'Fournitures', party: '', amount: '', method: this.paymentMethods[0] || '', request_id: createClientId() };
    this.formError = ''; this.expenseOpen = true;
  },
  async saveExpense() {
    if (this.saving) return;
    this.saving = true; this.formError = '';
    try {
      await api('/finance/expenses', { method: 'POST', body: JSON.stringify({ ...this.expense, amount: Number(this.expense.amount) }) });
      this.expenseOpen = false; this.showToast('Dépense enregistrée'); await this.reload();
    } catch (error) { this.formError = error.message; }
    finally { this.saving = false; }
  },
  openReminder(invoice) {
    this.reminder = `Bonjour ${invoice.client},\nLe solde de votre facture ${invoice.ref} (${invoice.exam_type}) est de ${this.formatMoney(invoice.montant)}. Merci de contacter le secrétariat pour votre règlement.\nCordialement.`;
    this.formError = ''; this.reminderOpen = true;
  },
  async copyReminder() {
    try { await copyText(this.reminder); this.showToast('Texte de relance copié'); }
    catch { this.formError = 'Sélectionnez le texte pour le copier.'; }
  },
  number(value) { return new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(value || 0); },
  formatMoney(value) { return this.number(value) + ' DZD'; },
  showToast(message) {
    clearTimeout(this.toastTimer); this.toast = { show: true, message };
    this.toastTimer = setTimeout(() => { this.toast.show = false; }, 3000);
  },
}));

Alpine.start();
