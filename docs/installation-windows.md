# Installer CIMA sur les postes Windows

Télécharger [CIMA-Setup-1.0.0-x64.exe](https://github.com/claudezdeldel-max/clinique/releases/download/desktop-v1.0.0/CIMA-Setup-1.0.0-x64.exe), puis l’ouvrir sur chaque PC Windows 64 bits. L’assistant installe CIMA pour l’utilisateur Windows courant et crée les raccourcis Bureau et menu Démarrer. Node.js n’est pas nécessaire sur les postes clients.

Lancer **CIMA** depuis le raccourci. Par défaut, l’application ouvre le serveur partagé https://cliniquecima.up.railway.app. La connexion utilise le mot de passe du compte ; le mot de passe **admin** identifie le super administrateur.

Pour utiliser le serveur de la clinique sur le réseau local :

1. Sur le PC serveur, suivre [la configuration réseau](reseau-local.md) et copier son adresse depuis **Paramètres → Réseau local**.
2. Sur chaque PC client, ouvrir le menu de l’application Windows **Application → Connexion au serveur…**.
3. Coller l’adresse du serveur, par exemple `http://192.168.1.10:3001`, puis choisir **Enregistrer et ouvrir**.
4. Se connecter avec le mot de passe du compte.

Tous les postes doivent utiliser la même adresse pour partager les patients, rendez-vous et paiements. L’installateur ne crée pas de base de données sur les PC clients. Le serveur doit rester accessible ; sans connexion, CIMA affiche une page permettant de retrouver les commandes de reconnexion.

L’adresse est conservée pour l’utilisateur Windows dans `%APPDATA%\CIMA\server.json`. Les documents téléchargés proposent une boîte d’enregistrement. Les autorisations d’impression restent celles de l’application et les imprimantes détectées sont celles du serveur configuré.

Pour revenir au serveur en ligne, choisir **CIMA en ligne** dans **Application → Connexion au serveur…**. Pour désinstaller CIMA, utiliser **Paramètres Windows → Applications → CIMA → Désinstaller**. Cela ne supprime pas les données de la clinique sur le serveur.

## Recréer l’installateur

Sur le poste de développement Windows avec Node.js installé :

```powershell
npm run desktop:build
```

Le fichier généré se trouve dans `output/cima-windows/CIMA-Setup-1.0.0-x64.exe`. Le numéro de version et les options d’installation sont définis dans `desktop/package.json`. Le paquet inclut uniquement le client Windows, sans base, documents patients ni fichier d’environnement du serveur. L’installateur est non signé tant qu’aucun certificat de signature n’est configuré.
