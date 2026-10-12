import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { renderPrintPdf, detectInstalledPrinters } from '../server/printing.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cima-production-'));
const origin = 'http://127.0.0.1:3993';
const child = spawn(process.execPath, ['server/index.js'], {
  windowsHide: true, env: { ...process.env, NODE_ENV: 'production', PORT: '3993', DB_PATH: path.join(directory, 'nested/clinic.db'), UPLOADS_PATH: path.join(directory, 'uploads'), SEED_DEMO_DATA: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin + '/api/health')).ok) { ready = true; break; } } catch { /* Server is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, logs);
  for (const route of ['/', '/patients']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('www-authenticate'), null);
    assert.match(await response.text(), /<html/);
  }
  assert.equal((await fetch(origin + '/api/patients')).status, 200);
  assert.equal((await fetch(origin + '/api/uploads/qa.png')).status, 404);
  assert.equal((await fetch(origin + '/api/not-real')).status, 404);
  const directoryData = await (await fetch(origin + '/api/auth/accounts')).json();
  const admin = directoryData.accounts.find(account => account.role === 'admin');
  const login = await fetch(origin + '/api/auth/select-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: admin.id }) });
  assert.equal(login.status, 200);
  const session = await login.json();
  const authorized = { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' };
  const patients = await fetch(origin + '/api/patients', { headers: authorized });
  assert.equal(patients.status, 200);
  assert.equal((await patients.json()).total, 0);
  const create = await fetch(origin + '/api/patients', { method: 'POST', headers: authorized, body: JSON.stringify({ first_name: 'Production', last_name: 'QA' }) });
  assert.equal(create.status, 201);
  assert.equal((await create.json()).age, null);
  const asset = fs.readdirSync('dist/assets').find(file => file.endsWith('.js'));
  assert.equal((await fetch(origin + '/assets/' + asset, { headers: authorized })).status, 200);
  assert.equal((await fetch(origin + '/api/index.html', { headers: authorized })).status, 404);
  if (process.platform !== 'win32') {
    assert.equal((await detectInstalledPrinters())[0].kind, 'pdf');
    const pdf = await renderPrintPdf('<h1>Vérification PDF CIMA</h1>');
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  }
  console.log('Production verified: SPA, static assets, healthcheck, direct access without extra login, Bearer sessions, empty persistent database, minimal patient creation and missing API routes.' + (process.platform !== 'win32' ? ' Linux PDF export verified.' : ' Linux PDF export is covered by Docker CI.'));
} finally { child.kill(); }
