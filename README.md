# Clinique CIMA

Application de gestion de clinique : patients, rendez-vous, file d’attente, dossiers médicaux, prescriptions, images, suivi des visites, caisse et comptabilité.

## Développement

Node.js 24.

```sh
npm ci
npm run dev
```

Interface : http://localhost:5173. API : http://localhost:3001.

## Déploiement

Voir [RAILWAY.md](RAILWAY.md). Le Dockerfile lance le frontend et l’API sur un même service, avec SQLite et les fichiers sur un volume persistant.

Les bases et fichiers patients locaux sont exclus du dépôt.

Interface construite à partir du template ShadcnStore (licence MIT incluse).
