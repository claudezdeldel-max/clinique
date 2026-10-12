import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';

export function serveProductionApp(app, directory) {
  const index = path.join(directory, 'index.html');
  if (!existsSync(index)) throw new Error('Le dossier dist est absent. Exécutez npm run build avant npm start.');
  app.use('/api', (req, res) => res.status(404).json({ error: 'Route API introuvable.' }));
  app.use('/assets', express.static(path.join(directory, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(directory, { index: false }));
  app.get('/{*path}', (req, res, next) => {
    if (path.extname(req.path)) return res.status(404).send('Fichier introuvable.');
    if (!req.accepts('html')) return next();
    res.set('Cache-Control', 'no-store').sendFile(index);
  });
}
