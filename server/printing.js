import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sanitizeHtml from 'sanitize-html';
import { chromium } from 'playwright';
import { readClinicConfig } from './clinic-settings.js';
import { PRINT_TYPES, effectivePrintRule, canPrintType, assertPrintAccess } from './printing-policy.js';

const runFile = promisify(execFile);
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function savedReportDocument(config, report) {
  const clinic = config.clinic, documents = config.documents;
  const header = `<header>${clinic.logo ? `<img src="${escape(clinic.logo)}" alt="Logo" style="max-width:70px;max-height:70px;float:right">` : ''}<h1>${escape(clinic.name)}</h1><p>${[clinic.address, clinic.city, clinic.phone, clinic.email].filter(Boolean).map(escape).join(' · ')}</p>${clinic.nif ? `<small>NIF : ${escape(clinic.nif)}</small>` : ''}</header>`;
  const footer = [documents.conditions, documents.footer].filter(Boolean).map(t => `<p>${escape(t).replace(/\n/g, '<br>')}</p>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(report.report_no)}</title><style>body{font-family:"${documents.font === 'Inter' ? 'CimaInter' : escape(documents.font)}",sans-serif;color:#111}header{border-bottom:2px solid ${documents.color};padding-bottom:12px;margin-bottom:20px}h1{font-size:22px;color:${documents.color}}h2{font-size:16px}p,li{line-height:1.6}footer{border-top:1px solid #ddd;margin-top:25px;font-size:11px}</style></head><body>${header}<h1>Compte rendu médical</h1><p>${escape(report.patient_name)} · ${escape(report.report_no)} · ${escape(report.author)}</p>${report.content_html || ''}${footer ? `<footer>${footer}</footer>` : ''}</body></html>`;
}

// Query the Windows installation running THIS app. No printer names are bundled or seeded.
export async function detectInstalledPrinters() {
  if (process.platform !== 'win32') return [{ name: 'Télécharger PDF', driver: 'Chromium PDF', kind: 'pdf', managed: true, offline: false, is_default: true, supports_color: true, supports_duplex: false, note: 'Télécharge le document ; imprimez-le depuis votre poste.' }];
  const script = `
    $ErrorActionPreference = 'Stop'
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    Add-Type -AssemblyName System.Drawing
    $items = @(Get-CimInstance Win32_Printer | ForEach-Object {
      $device = $_
      $caps = New-Object System.Drawing.Printing.PrinterSettings
      $caps.PrinterName = $device.Name
      [pscustomobject]@{
        name = $device.Name; driver = $device.DriverName; port = $device.PortName
        is_default = [bool]$device.Default; offline = [bool]$device.WorkOffline
        network = [bool]$device.Network; status = [int]$device.PrinterStatus
        supports_color = [bool]$caps.SupportsColor; supports_duplex = [bool]$caps.CanDuplex
      }
    })
    ConvertTo-Json -InputObject $items -Compress -Depth 4
  `;
  const { stdout } = await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20000, maxBuffer: 2_000_000, encoding: 'utf8' });
  const list = JSON.parse(stdout.replace(/^\uFEFF/, '').trim() || '[]');
  return list.map(p => {
    const pdf = /microsoft print to pdf/i.test(p.driver);
    const interactive = /onenote|fax|xps/i.test(`${p.driver} ${p.name}`) || (p.port === 'PORTPROMPT:' && !pdf);
    return { ...p, kind: pdf ? 'pdf' : interactive ? 'external' : 'physical', managed: !interactive,
      supports_color: pdf || p.supports_color, supports_duplex: !pdf && p.supports_duplex,
      note: interactive ? 'Ce pilote ouvre une application externe. Impression contrôlée indisponible.' : pdf ? 'Crée un PDF à télécharger.' : '',
    };
  }).sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name, 'fr'));
}

function browserExecutable() {
  const candidates = [process.env.PRINT_BROWSER_PATH,
    path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    chromium.executablePath()];
  const executable = candidates.find(p => p && existsSync(p));
  if (!executable) throw new Error('Installez Microsoft Edge ou Google Chrome sur ce poste pour préparer les documents.');
  return executable;
}

export async function renderPrintPdf(html, paper = 'A4', options = {}) {
  const safeHtml = sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'html', 'head', 'body', 'title', 'meta', 'style', 'img', 'header', 'footer'],
    allowedAttributes: { '*': ['style', 'class'], meta: ['charset'], img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
    allowedSchemes: ['data'], allowedSchemesByTag: { img: ['data'] }, allowVulnerableTags: true,
  });
  const fontCss = readFileSync(path.join(root, 'public/cima/inter.css'), 'utf8').replace(/url\(\.\/webfonts\/([^\)]+)\)/g, (_, name) => `url(data:font/woff2;base64,${readFileSync(path.join(root, 'public/cima/webfonts', path.basename(name))).toString('base64')})`);
  const paperCss = paper === 'A4' ? '@page{size:A4;margin:15mm}body{margin:0}' : `@page{size:${paper === '80mm' ? '80' : '58'}mm 297mm;margin:3mm}body{margin:0;font-size:10px}h1{font-size:15px}h2{font-size:12px}table{font-size:9px}td,th{padding:3px}`;
  const browser = await chromium.launch({ headless: true, executablePath: browserExecutable() });
  try {
    const page = await browser.newPage();
    // Never load scripts, remote images, or external fonts supplied in a print document.
    await page.route('**/*', route => route.abort());
    await page.setContent(safeHtml, { waitUntil: 'load', timeout: 15000 });
    await page.addStyleTag({ content: `${fontCss}\n${paperCss}\n${options.color === false ? 'body{filter:grayscale(1)}' : ''}` });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({ printBackground: true, preferCSSPageSize: true, timeout: 30000 });
  } finally { await browser.close(); }
}

export async function submitNativePrint(pdf, printer, options) {
  const pdfPath = path.join(tmpdir(), `cima-print-${randomUUID()}.pdf`);
  const executable = path.join(path.dirname(require.resolve('pdf-to-printer')), 'SumatraPDF-3.4.6-32.exe');
  if (!existsSync(executable)) throw new Error('Le composant d’impression est absent. Réinstallez les dépendances de l’application.');
  try {
    await writeFile(pdfPath, pdf, { mode: 0o600 });
    // Pass an explicit printer and options as arguments. Never change the Windows default.
    await runFile(executable, ['-print-to', printer.name, '-silent', '-print-settings', ['fit', options.color ? 'color' : 'monochrome', options.duplex ? 'duplexlong' : 'simplex', `${options.copies}x`].join(','), pdfPath], { windowsHide: true, timeout: 60000 });
  } finally { await unlink(pdfPath).catch(() => {}); }
}

export function registerPrinting(app, db, dependencies = {}) {
  const detect = dependencies.detect || detectInstalledPrinters;
  const render = dependencies.render || renderPrintPdf;
  const submit = dependencies.submit || submitNativePrint;
  db.exec(`CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL, user_id INTEGER NOT NULL, actor TEXT NOT NULL,
    printer TEXT NOT NULL, document_type TEXT NOT NULL, title TEXT NOT NULL, copies INTEGER NOT NULL,
    color INTEGER NOT NULL, duplex INTEGER NOT NULL, status TEXT NOT NULL, error TEXT,
    report_id INTEGER, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL, finished_at TEXT,
    UNIQUE(user_id, request_id)
  )`);
  db.prepare("UPDATE print_jobs SET status = 'failed', error = 'Application redémarrée pendant la préparation. Vérifiez la file Windows avant de relancer.', finished_at = ? WHERE status = 'preparing'").run(new Date().toISOString());
  const session = (req, res, next) => req.account ? next() : res.status(401).json({ error: 'Choisissez un compte pour imprimer.' });
  const admin = (req, res, next) => req.account?.role === 'admin' ? next() : res.status(403).json({ error: 'Seul un administrateur peut modifier les accès aux imprimantes.' });
  const inventory = async () => ({ computer: hostname(), printers: await detect(), detected_at: new Date().toISOString() });
  app.get('/api/printing/settings', admin, async (req, res) => {
    try { res.json({ ...await inventory(), policy: readClinicConfig(db).printing,
      accounts: db.prepare('SELECT id, name, role, active FROM users ORDER BY name').all(), roles: db.prepare('SELECT id, name FROM account_roles ORDER BY rowid').all() }); }
    catch (err) { res.status(503).json({ error: `Impossible de détecter les imprimantes de ce poste. ${err.message}` }); }
  });
  app.get('/api/printing/choices', session, async (req, res) => {
    const config = readClinicConfig(db), type = req.query.type;
    if (!PRINT_TYPES.includes(type)) return res.status(400).json({ error: 'Type de document inconnu.' });
    if (!canPrintType(config, req.account, type)) return res.status(403).json({ error: 'L’impression de ce document est désactivée pour votre compte.' });
    try {
      const list = await inventory(), rule = effectivePrintRule(config, req.account);
      const printers = list.printers.filter(p => p.managed && config.printing.printers[p.name]?.enabled !== false && (rule.printers === null || rule.printers.includes(p.name)));
      const defaultPrinter = printers.find(p => p.name === rule.default_printer && !p.offline) || printers.find(p => p.is_default && !p.offline) || printers.find(p => !p.offline);
      res.json({ ...list, printers, rule, default_printer: defaultPrinter?.name || '' });
    } catch (err) { res.status(503).json({ error: `Détection des imprimantes indisponible. ${err.message}` }); }
  });
  app.get('/api/printing/jobs', session, (req, res) => {
    const columns = 'id, user_id, actor, printer, document_type, title, copies, color, duplex, status, error, created_at, finished_at';
    res.json(req.account.role === 'admin' ? db.prepare(`SELECT ${columns} FROM print_jobs ORDER BY created_at DESC LIMIT 100`).all() : db.prepare(`SELECT ${columns} FROM print_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).all(req.account.id));
  });
  app.post('/api/printing/jobs', session, async (req, res) => {
    const b = req.body, type = b.document_type;
    if (!PRINT_TYPES.includes(type) || typeof b.html !== 'string' || !b.html.trim() || b.html.length > 500000 || typeof b.title !== 'string' || !b.title.trim() || b.title.length > 200 || typeof b.printer !== 'string' || typeof b.request_id !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(b.request_id)) return res.status(400).json({ error: 'Document ou demande d’impression invalide.' });
    let job;
    try {
      const config = readClinicConfig(db);
      // Check document rights before any OS operation or rendering.
      if (!canPrintType(config, req.account, type)) return res.status(403).json({ error: 'L’impression de ce document est désactivée pour votre compte.' });
      const printers = await detect(), printer = printers.find(p => p.name === b.printer);
      if (!printer) return res.status(404).json({ error: 'Cette imprimante n’est plus installée sur ce poste. Actualisez la liste.' });
      assertPrintAccess(config, req.account, printer, type, b);
      let report;
      if (type === 'Compte rendu') {
        if (!Number.isInteger(b.report_id)) return res.status(400).json({ error: 'Sélectionnez un compte rendu enregistré.' });
        report = db.prepare('SELECT * FROM reports WHERE id = ?').get(b.report_id);
        if (!report || report.status !== 'validated') return res.status(409).json({ error: 'Finalisez le compte rendu avant de lancer l’impression.' });
      }
      const fingerprint = createHash('sha256').update(JSON.stringify([b.title, b.html, b.printer, type, b.copies, b.color, b.duplex, b.report_id])).digest('hex');
      const existing = db.prepare('SELECT * FROM print_jobs WHERE user_id = ? AND request_id = ?').get(req.account.id, b.request_id);
      if (existing) return existing.fingerprint === fingerprint ? res.json({ job: existing, duplicate: true }) : res.status(409).json({ error: 'Cette demande d’impression existe déjà avec un autre document.' });
      job = { id: randomUUID(), request_id: b.request_id, user_id: req.account.id, actor: req.account.name, printer: b.printer, document_type: type, title: b.title, copies: b.copies, color: b.color ? 1 : 0, duplex: b.duplex ? 1 : 0, report_id: report?.id || null, fingerprint, created_at: new Date().toISOString() };
      db.prepare("INSERT INTO print_jobs (id,request_id,user_id,actor,printer,document_type,title,copies,color,duplex,report_id,fingerprint,created_at,status) VALUES (@id,@request_id,@user_id,@actor,@printer,@document_type,@title,@copies,@color,@duplex,@report_id,@fingerprint,@created_at,'preparing')").run(job);
      const paper = config.printing.printers[printer.name]?.paper || (/pos[-\s]?80|receipt|thermal/i.test(`${printer.name} ${printer.driver}`) ? '80mm' : 'A4');
      const pdf = await render(report ? savedReportDocument(config, report) : b.html, paper, b);
      // A revoked permission or deactivated session must also stop an already prepared document.
      const token = req.headers.authorization?.replace('Bearer ', '');
      const current = db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ? AND u.active = 1').get(token);
      if (!current) throw Object.assign(new Error('Session expirée avant l’impression.'), { status: 401 });
      const { publicUser } = await import('./account-policy.js');
      const latest = readClinicConfig(db);
      assertPrintAccess(latest, publicUser(current), printer, type, b);
      if (printer.kind !== 'pdf') await submit(pdf, printer, b);
      const status = printer.kind === 'pdf' ? 'pdf' : 'submitted', finished = new Date().toISOString();
      db.transaction(() => {
        db.prepare('UPDATE print_jobs SET status = ?, finished_at = ? WHERE id = ?').run(status, finished, job.id);
        if (report && status === 'submitted') db.prepare("UPDATE reports SET print_started_at = COALESCE(print_started_at, ?), delivery_status = COALESCE(delivery_status, 'ready') WHERE id = ?").run(finished, report.id);
      })();
      res.status(201).json({ job: { ...job, status, finished_at: finished }, ...(printer.kind === 'pdf' ? { pdf: pdf.toString('base64') } : {}) });
    } catch (err) {
      if (job) db.prepare("UPDATE print_jobs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?").run(err.message, new Date().toISOString(), job.id);
      res.status(err.status || 503).json({ error: err.status ? err.message : 'L’impression n’a pas pu être envoyée au pilote. Vérifiez l’imprimante et réessayez.' });
    }
  });
}
