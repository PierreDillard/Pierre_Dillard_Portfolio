# Project context: Portfolio Pierre Dillard

## Purpose

Portfolio professionnel de Pierre Dillard, en français. Présenter CV, vidéo, monitoring, GPAC, documentation et recherches avec des faits vérifiables. L’audience recruteurs et clients est traitée à parts égales. Ne pas présenter une exploration comme une fonctionnalité livrée. La publication reste une décision séparée.

## Architecture map

La V1 statique reste à la racine (`index.html`, `styles.css`, `script.js`, `assets/`). La V2 React/Next.js est dans `v2/` : `content/site.json` est la source du contenu ; `app/` contient les routes publiques et l'éditeur local ; `components/` le rendu partagé ; `public/media/` les médias ; `docs/` le guide éditorial et la provenance. Modifier le contenu dans `/admin` en développement local. L'éditeur est fermé en production jusqu'à la mise en place de l'authentification et du stockage Vercel.

## Persisted data and external integrations

Aucune base de données ni stockage persistant distant pour la V2 à ce stade. L'éditeur local écrit `content/site.json`, sauvegarde l'état précédent dans `content/backups/` et importe les médias dans `public/media/uploads/`. Les liens externes mènent à GPAC/GitHub ; les polices viennent de Google Fonts. Valider avec `npx tsc --noEmit --incremental false`, `npm run build` dans `v2/` et inspecter les pages desktop/mobile. Les captures GPAC et wiki sont des sources visuelles réelles ; le schéma des skills est une illustration éditoriale.

## Documentation maintenance

Keep CLAUDE.md and AGENTS.md synchronized.

## Local workflow policy

Read [.workflow/portfolio-workflow.md](.workflow/portfolio-workflow.md) before planning or modifying this project. Apply `branch-router` before implementation: one feature per `dev/<feature>` branch, derived from and merged into `master`. Planning and corrections to task/workflow documents may stay on the current branch; this does not authorize application edits, commits, branch creation, merges or publication. With no initial commit, prepare the bootstrap before implementation. The policy defines dependencies, validation, integration and release separately. Keep managed kit files and skill mirrors intact.

<!-- workflow-kit:start -->
Workflow authority: [.workflow/PROJECT_RULES.md](.workflow/PROJECT_RULES.md).
Read `.workflow-kit.env` and the installed module rules; load only relevant context.
<!-- workflow-kit:end -->
