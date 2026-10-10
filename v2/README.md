# Portfolio V2 — React / Next.js

La V1 statique reste à la racine. La V2 contient le portfolio, quatre études de cas, le journal et un éditeur local.

```bash
cd v2
npm ci
npm run dev -- -p 3017
```

Ouvrir `http://127.0.0.1:3017/` pour le site et `http://127.0.0.1:3017/admin` pour modifier les textes, captures, vidéos, projets et articles. Après chaque modification, cliquer sur **Enregistrer les changements**. Les brouillons ne sont pas publics. [Guide pas à pas](docs/editorial-workflow.md).

Le contenu est dans `content/site.json`, les médias livrés dans `public/media/` et les nouveaux imports dans `public/media/uploads/`. Le registre des affirmations est dans [content-evidence.md](docs/content-evidence.md) et les contributions wiki dans [wiki-contributions-inventory.md](docs/wiki-contributions-inventory.md).

`npm run build` construit la V2 ; `npx tsc --noEmit --incremental false` vérifie les types sans écrire de cache. L'éditeur local est désactivé en production. L'administration du site publié nécessite encore un projet Vercel, une connexion sécurisée et un stockage persistant pour contenus et médias. Aucun déploiement n'a été fait.
