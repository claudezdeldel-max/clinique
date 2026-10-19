import { createServer } from 'node:http';
import { networkInterfaces, hostname } from 'node:os';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
export const networkSettingsPath = process.env.NETWORK_CONFIG_PATH || path.join(directory, 'network-settings.local.json');

export function readNetworkSettings() {
  if (!existsSync(networkSettingsPath)) return { enabled: true, port: 3001 };
  const value = JSON.parse(readFileSync(networkSettingsPath, 'utf8'));
  if (typeof value.enabled !== 'boolean' || !Number.isInteger(value.port) || value.port < 1024 || value.port > 65535) throw new Error('Configuration réseau invalide.');
  return { enabled: value.enabled, port: value.port };
}

const isLoopback = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);

export function createLocalNetwork(app) {
  let settings = readNetworkSettings();
  let server, activePort = Number(process.env.PORT) || settings.port, changing = false;
  const addresses = () => Object.entries(networkInterfaces()).flatMap(([name, entries]) => (entries || [])
    .filter(ip => !ip.internal && ip.family === 'IPv4')
    .map(ip => ({ name, address: ip.address, url: `http://${ip.address}:${activePort}` })));
  const information = () => ({ settings, computer: hostname(), active_port: activePort, port_managed_by_environment: !!process.env.PORT,
    local_url: `http://localhost:${activePort}`, addresses: addresses(), frontend_ready: existsSync(path.join(directory, '../dist/index.html')),
    clients: 'Les autres postes ouvrent une adresse du serveur dans leur navigateur. La base reste sur ce serveur.',
  });
  app.use((req, res, next) => {
    if (!settings.enabled && !isLoopback(req.socket.remoteAddress)) return res.status(403).json({ error: 'L’accès au réseau local est désactivé sur le serveur.' });
    if (req.headers.origin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      try {
        const origin = new URL(req.headers.origin);
        const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', hostname().toLowerCase(), ...addresses().map(ip => ip.address), new URL(`http://${req.headers.host}`).hostname.toLowerCase()]);
        if (!['http:', 'https:'].includes(origin.protocol) || !allowedHosts.has(origin.hostname.toLowerCase())) return res.status(403).json({ error: 'Origine de la demande non autorisée.' });
      } catch { return res.status(403).json({ error: 'Origine de la demande invalide.' }); }
    }
    next();
  });
  const listen = (instance, port) => new Promise((resolve, reject) => {
    instance.once('error', reject);
    instance.listen(port, '0.0.0.0', () => { instance.removeListener('error', reject); resolve(); });
  });
  return {
    register() {
      const owner = (req, res, next) => req.account?.is_super_admin ? next() : res.status(403).json({ error: 'La configuration réseau est réservée au super administrateur.' });
      app.get('/api/network-settings', owner, (req, res) => res.json(information()));
      app.put('/api/network-settings', owner, async (req, res) => {
        const next = req.body;
        if (!next || typeof next.enabled !== 'boolean' || !Number.isInteger(next.port) || next.port < 1024 || next.port > 65535 || [5173, 5174].includes(next.port)) return res.status(400).json({ error: 'Choisissez un port entre 1024 et 65535, différent du port de développement 5173 ou 5174.' });
        if (process.env.PORT && next.port !== activePort) return res.status(409).json({ error: 'Le port est défini au lancement du serveur. Modifiez la variable PORT pour le changer.' });
        if (changing) return res.status(409).json({ error: 'Une modification du réseau est déjà en cours.' });
        if (!next.enabled && !isLoopback(req.socket.remoteAddress)) return res.status(409).json({ error: 'Désactivez le réseau depuis le poste serveur pour conserver l’accès aux paramètres.' });
        changing = true;
        let replacement;
        try {
          if (next.port !== activePort) {
            replacement = createServer(app);
            await listen(replacement, next.port);
          }
          const updated = { enabled: next.enabled, port: next.port };
          writeFileSync(`${networkSettingsPath}.tmp`, `${JSON.stringify(updated, null, 2)}\n`, { mode: 0o600 });
          renameSync(`${networkSettingsPath}.tmp`, networkSettingsPath);
          const previous = server;
          settings = updated; activePort = updated.port;
          if (replacement) server = replacement;
          res.on('finish', () => {
            if (replacement) {
              // Let already open pages display the new address, then close the old listener.
              const timer = setTimeout(() => { previous.close(); previous.closeIdleConnections(); }, 5000);
              timer.unref();
            }
          });
          res.json({ ...information(), port_changed: !!replacement });
        } catch (err) {
          if (replacement) replacement.close();
          res.status(err.code === 'EADDRINUSE' ? 409 : 500).json({ error: err.code === 'EADDRINUSE' ? 'Ce port est déjà utilisé. Choisissez-en un autre.' : 'Impossible d’enregistrer la configuration réseau.' });
        } finally { changing = false; }
      });
      app.get('/api/network-settings/firewall.ps1', owner, (req, res) => {
        const script = `$ErrorActionPreference = 'Stop'\r\n# Exécuter sur le poste serveur avec PowerShell en administrateur.\r\n$ruleName = 'CIMA-Local-Network'\r\nGet-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule\r\nNew-NetFirewallRule -Name $ruleName -DisplayName 'CIMA - Reseau local' -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${activePort} -Profile Private,Domain -RemoteAddress LocalSubnet\r\n`;
        res.type('text/plain; charset=utf-8').attachment('autoriser-cima-reseau.ps1').send(script);
      });
    },
    async start() {
      server = createServer(app);
      await listen(server, activePort);
      console.log(`[CIMA] Application : http://localhost:${activePort}`);
      if (settings.enabled) for (const item of addresses()) console.log(`[CIMA] Réseau local : ${item.url}`);
      return server;
    },
  };
}
