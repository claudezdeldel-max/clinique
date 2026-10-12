import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { renderPrintPdf, detectInstalledPrinters } from '../server/printing.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cima-production-'));
const password = 'local-qa-password-not-a-production-secret';
const origin = 'http://127.0.0.1:3993';
const child = spawn(process.execPath, ['server/index.js'], {
  windowsHide: true, env: { ...process.env, NODE_ENV: 'production', PORT: '3993', APP_ACCESS_USERNAME: 'clinic-qa', APP_ACCESS_PASSWORD: password, DB_PATH: path.join(directory, 'nested/clinic.db'), UPLOADS_PATH: path.join(directory, 'uploads'), SEED_DEMO_DATA: 'false' },
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
  for (const route of ['/', '/patients', '/api/patients', '/api/uploads/qa.png']) assert.equal((await fetch(origin + route)).status, 401);
  const headers = { Authorization: 'Basic ' + Buffer.from('clinic-qa:' + password).toString('base64') };
  const response = await fetch(origin + '/patients', { headers });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<html/);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal((await fetch(origin + '/api/not-real', { headers: { Cookie: cookie } })).status, 404);
  const directoryData = await (await fetch(origin + '/api/auth/accounts', { headers: { Cookie: cookie } })).json();
  const admin = directoryData.accounts.find(account => account.role === 'admin');
  const login = await fetch(origin + '/api/auth/select-account', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: admin.id }) });
  assert.equal(login.status, 200);
  const session = await login.json();
  const authorized = { Cookie: cookie, Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' };
  const patients = await fetch(origin + '/api/patients', { headers: authorized });
  assert.equal(patients.status, 200);
  assert.equal((await patients.json()).total, 0);
  const create = await fetch(origin + '/api/patients', { method: 'POST', headers: authorized, body: JSON.stringify({ first_name: 'Production', last_name: 'QA' }) });
  assert.equal(create.status, 201);
  assert.equal((await create.json()).age, null);
  const tampered = cookie.slice(0, -1) + (cookie.endsWith('0') ? '1' : '0');
  assert.equal((await fetch(origin + '/api/patients', { headers: { ...authorized, Cookie: tampered } })).status, 401);
  const asset = fs.readdirSync('dist/assets').find(file => file.endsWith('.js'));
  assert.equal((await fetch(origin + '/assets/' + asset, { headers: authorized })).status, 200);
  assert.equal((await fetch(origin + '/api/index.html', { headers: authorized })).status, 404);
  if (process.platform !== 'win32') {
    assert.equal((await detectInstalledPrinters())[0].kind, 'pdf');
    const pdf = await renderPrintPdf('<h1>Vérification PDF CIMA</h1>');
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  }
  console.log('Production verified: SPA, static assets, healthcheck, access protection, cookie + Bearer sessions, empty persistent database, minimal patient creation and missing API routes.' + (process.platform !== 'win32' ? ' Linux PDF export verified.' : ' Linux PDF export is covered by Docker CI.'));
} finally { child.kill(); }
