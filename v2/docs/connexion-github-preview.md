# Connexion propriétaire GitHub — Preview

La tâche 04 commence par une vraie session propriétaire, avant ouverture de l'éditeur et adaptation du stockage.

## Application OAuth à créer

Ouvrir https://github.com/settings/applications/new avec le compte PierreDillard.
- Application name : `Portfolio Dillard — Preview`.
- Homepage URL : `https://pierre-dillard-portfolio-git-dev-d872a9-pierredillards-projects.vercel.app`.
- Authorization callback URL : `https://pierre-dillard-portfolio-git-dev-d872a9-pierredillards-projects.vercel.app/api/auth/callback/github`.
- Device Flow inutile pour ce parcours web.

Enregistrer l'application puis générer un Client Secret.
Dans Vercel → projet `pierre-dillard-portfolio` → Settings → Environment Variables, ajouter :
- `AUTH_GITHUB_ID` : Client ID de l'application.
- `AUTH_GITHUB_SECRET` : Client Secret de l'application (valeur sensible côté serveur).

Limiter ces deux variables à **Preview**, branche `dev/portfolio-admin-online`. Ne pas ajouter les secrets en production ou les copier dans le chat.

Déjà préparés par l'agent, sur cette même branche Preview : `AUTH_SECRET` aléatoire sensible, `ADMIN_GITHUB_ID=110824159`, `ADMIN_AUTH_PREVIEW=true`, `AUTH_URL` égal à l'URL stable ci-dessus. Aucun secret dans ce document.

## Validation à effectuer après configuration

Redéployer la branche avec les nouvelles variables, puis ouvrir :
`https://pierre-dillard-portfolio-git-dev-d872a9-pierredillards-projects.vercel.app/admin/connexion`.

Si Vercel demande une connexion à la Preview, utiliser le compte propriétaire Vercel avant le test GitHub.
Se connecter avec GitHub : la page doit afficher « Tu es connecté avec le compte propriétaire. » puis permettre la déconnexion. Un autre compte GitHub doit être refusé. Après déconnexion, la page doit proposer à nouveau la connexion et `/api/auth/session` ne doit plus retourner de session propriétaire.

L'éditeur `/admin` et ses API restent fermés dans cette première tranche. E2 adaptera leurs lecteurs et écritures à Blob après la réussite d'E1. Ne pas confondre le succès de cette page de connexion avec une sauvegarde persistante du portfolio.

## Contrôles existants et limites

`npm run build` vérifie types et compilation. `node scripts/verify-auth-preview.mjs` lance cinq serveurs Next.js construits : production fermée, autre branche fermée, flag désactivé fermé, secrets absents fermés, Preview configurée limitée à la connexion. Les routes éditeur restent 404. Une action légitime redirige vers GitHub et une action d'origine étrangère est refusée.

Les identifiants OAuth du test local sont fictifs ; ce contrôle n'authentifie aucun compte GitHub réel. Session propriétaire, autre compte, expiration et cookies HTTPS doivent encore être vérifiés sur l'URL Preview réelle. Les secrets manquants ferment la connexion avec 404.

Sources : [GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), [Auth.js](https://authjs.dev/getting-started/providers/github).
