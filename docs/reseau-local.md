# Réseau local et connexion

1. Choisir le PC qui conserve les dossiers et la base. Lancer `LANCER_CLINIQUE.bat` sur ce poste. Le lanceur prépare l’interface si nécessaire et ouvre l’application sur le serveur local.
2. Se connecter en saisissant uniquement le mot de passe **admin**. Ce mot de passe est réservé au super administrateur.
3. Ouvrir **Paramètres → Réseau local**. Activer l’accès réseau, choisir le port et copier une adresse affichée.
4. Sur les autres PC du même réseau, ouvrir cette adresse dans le navigateur. Les autres PC utilisent la base du serveur : il n’est pas nécessaire d’y lancer une autre base locale.
5. Si le pare-feu bloque l’accès, télécharger le fichier d’autorisation proposé dans les paramètres et l’exécuter avec PowerShell en administrateur sur le serveur. L’autorisation se limite au sous-réseau local, sur les profils privé et domaine.

Le serveur doit rester allumé. Un changement de port prend effet immédiatement ; ouvrir la nouvelle adresse et se reconnecter. Le fichier d’autorisation Windows doit être téléchargé à nouveau si le port change.

Les mots de passe des utilisateurs se définissent dans **Paramètres → Utilisateurs**. Chaque compte doit avoir un mot de passe distinct afin que la connexion puisse identifier son rôle sans demander d’identifiant. La migration invalide les anciennes sessions du sélecteur de comptes. Le compte super administrateur conserve son accès.

La configuration réseau est locale au serveur (`server/network-settings.local.json`). Une variable `PORT` définie au lancement reste prioritaire. En développement, `npm run dev` sert l’éditeur via Vite ; les adresses réseau des paramètres utilisent l’interface compilée sur le port du serveur.

Les appels API utilisent l’adresse de la page ouverte. Les documents, salles, paiements et files d’attente proviennent ainsi du même serveur. Les imprimantes proposées correspondent aux pilotes installés sur le serveur, dont le nom figure dans les paramètres des imprimantes.
