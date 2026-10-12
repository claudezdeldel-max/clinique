# Déployer CIMA sur Railway

Le dépôt contient le frontend Vite et le serveur Express/SQLite. Le Dockerfile
compile le frontend puis lance les deux sur le port fourni par Railway.

## Installation

1. Dans Railway, créer un projet et un service depuis le dépôt GitHub
   `claudezdeldel-max/clinique`, branche `main`, dossier racine `/`.
2. Ajouter un volume au service, avec le point de montage **`/data`**.
   SQLite, les photos et les sauvegardes sont conservés sur ce volume.
3. Ajouter les variables du service :

   | Variable | Valeur |
   | --- | --- |
   | `APP_ACCESS_USERNAME` | `clinique` |
   | `APP_ACCESS_PASSWORD` | Mot de passe aléatoire de 16 caractères minimum |
   | `DB_PATH` | `/data/clinic.db` |
   | `UPLOADS_PATH` | `/data/uploads` |
   | `SEED_DEMO_DATA` | `false` |

4. Déployer. Railway détecte le Dockerfile et utilise `/api/health` pour vérifier
   le démarrage. Conserver **une seule réplique** pour cette base SQLite.
5. Dans les paramètres réseau du service, générer un domaine public. Ouvrir son
   URL HTTPS et saisir les identifiants `APP_ACCESS_*` dans la fenêtre du navigateur.
6. Choisir le compte de la clinique dans le menu latéral.

La protection du site s'applique au frontend, aux API et aux fichiers médicaux.
Seule la sonde de disponibilité `/api/health` reste accessible sans mot de passe.
Les valeurs secrètes se configurent dans Railway, jamais dans GitHub.

## Données

Une nouvelle installation de production démarre sans patients de démonstration.
Les bases locales, les photos déposées et les sauvegardes ne sont pas publiées
dans ce dépôt. Pour reprendre des dossiers existants, utiliser l'outil de
sauvegarde/restauration de la clinique via une connexion privée et autorisée.

Ne pas supprimer le volume lors des mises à jour. Un redéploiement reconstruit
le code et conserve les fichiers du volume.

## Documents et impression

Railway fonctionne sous Linux et propose **Télécharger PDF**. Les documents sont
préparés par Chromium dans le conteneur, puis téléchargés sur le poste utilisateur.
L'impression directe Windows reste disponible pour l'installation locale.

## Vérifications

```sh
npm ci
npm run build
npm start
```

Pour lancer en production, définir `NODE_ENV=production`,
`DB_PATH` et `UPLOADS_PATH`. Le serveur écoute sur `0.0.0.0:$PORT`.
