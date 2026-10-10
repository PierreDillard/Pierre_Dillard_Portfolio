# Workflow local du portfolio

Cette politique complète les [règles du kit](PROJECT_RULES.md). Elle est chargée depuis
`AGENTS.md` et `CLAUDE.md`. Les skills canoniques restent dans `.claude/skills/` ; les copies
`.codex/skills/` sont générées. Ce fichier est une personnalisation locale, pas une modification
du kit source ni une preuve qu'une action Git a été exécutée.

## Autorités et périmètre

- `.workflow-kit.env` définit `master`, la stratégie `flat` et le préfixe `dev/`.
- `branch-router` lit l'état Git réel et détermine la branche correspondant à l'intention.
- `project-workflow` choisit les capacités effectivement installées : tasks, memory, continuity.
- Le frontmatter de la tâche définit sa branche cible et son statut ; l'index est dérivé.
- Les instructions de Pierre priment sur les règles du kit. Son abandon explicite des questions
  de compréhension reste applicable au portfolio ; les contrôles techniques restent obligatoires.
- Seuls le portfolio et son kit installé sont concernés. Une amélioration du dépôt source
  `agent-workflow-kit` nécessite un effort distinct ; ne pas y propager silencieusement les changements.

## Routage obligatoire avant une modification

1. Lire `.workflow-kit.env`, exécuter `git status -sb`, `git branch --show-current` et vérifier
   l'existence de `HEAD`. Lire l'index de l'effort puis la tâche concernée.
2. Appliquer `branch-router` en classant l'intention : question/audit, planification,
   implémentation d'une feature, intégration Git ou publication.
3. Avant implémentation, annoncer la tâche, la branche actuelle, la cible, les fichiers/scope,
   les dépendances, le signal de validation et le sens de fusion `dev/<feature> → master`.
4. Si la branche actuelle ne correspond pas, arrêter les modifications d'implémentation.
   Vérifier l'autorisation de création/changement de branche, puis router vers la cible exacte.
   Ne pas remplacer ce contrôle par le seul fait d'avoir lu le skill.

## Une feature = une branche

- Une branche `dev/<feature>` porte un résultat cohérent pour l'utilisateur. Plusieurs étapes
  ou tâches peuvent la partager uniquement si elles livrent ce même résultat.
- Déploiement, persistance, administration en ligne, médias et typographie sont ici des features
  distinctes. Une branche globale de publication ne doit pas les regrouper.
- La fiche 01 est un suivi global, pas une branche de développement.
- Créer chaque branche depuis `master` à jour, après intégration et validation de ses prérequis.
  Une dépendance entre tâches n'autorise pas une branche empilée ou une fusion entre features.
- Si une dépendance change pendant le travail, vérifier l'écart avec `master` et le traiter avant
  d'annoncer une validation ; ne pas réutiliser une ancienne preuve sur un nouveau contenu.

## Planification et amorçage du dépôt

Rédiger/corriger les tâches et les règles locales peut se faire sur la branche courante avec
autorisation, sans créer une branche d'implémentation. Cette exception couvre la planification
demandée ici ; elle ne permet pas de modifier l'application ou d'exécuter une release.

Si `HEAD` n'existe pas, annoncer « dépôt sans premier commit ». Inventorier l'état existant,
préparer un amorçage concret et obtenir l'autorisation du commit initial. Ne pas lancer de commande
qui suppose un SHA, prétendre qu'une branche cible existe ou réaliser une feature sur `master`
comme solution de contournement. La création des branches vient après cet amorçage.

`/tasks/` est actuellement ignoré par Git. Sa présence locale ne prouve donc pas qu'une tâche
appartient à un commit ou change lors d'un checkout. Garder le chemin d'effort stable et sa branche
cible dans le frontmatter ; décider au bootstrap quelles tâches/preuves doivent être versionnées,
sans publier automatiquement des éléments privés ni contourner l'ignore par un ajout forcé.

## Étapes et preuves

| Phase | Travail attendu | Critère de sortie |
|---|---|---|
| Cadrage | Tâche, scope, branche cible, dépendances et invariants | Résultat indépendant et signal observable définis |
| Planification | Étapes ANTS et preuves attendues | Frontmatter, index et branches cohérents ; statut pending |
| Implémentation | Une étape sur la branche de la feature | Signal observé ; validation consignée avant expansion |
| Validation | Vérifications adaptées, UI réelle et services réels si nécessaires | Preuves datées, erreurs/limites explicites ; aucun succès déduit d'un mock |
| Intégration | Vérifier les dépendances intégrées, le diff et le SHA source | Fusion autorisée vers master ; nouvelle validation si le résultat change |
| Publication | Déployer le SHA intégré et vérifier l'URL réelle | SHA Git/Vercel concordants, parcours production et reprise prouvés |

`implemented` ne signifie ni relu indépendamment, ni fusionné, ni publié. Les modules Quality et
Deployment ne sont pas installés : ne pas invoquer leurs gates comme obligations ou résultats.
Les vérifications techniques prévues dans les tâches restent nécessaires. Une autorisation déjà
donnée pour une action précise reste valable ; vérifier sa portée sans redemander mécaniquement.

## Maintenance du workflow

- Personnaliser les règles du portfolio dans ce fichier et garder les deux points d'entrée
  `AGENTS.md`/`CLAUDE.md` identiques. Ne pas modifier directement `PROJECT_RULES.md` composé.
- Ne pas modifier les fichiers gérés non éditables ou leurs hashes pour faire passer un contrôle.
  Une évolution du kit/skill canonique doit suivre son mécanisme d'installation ou un effort source
  distinct ; les copies Codex se synchronisent via `.claude/scripts/sync-skills.sh`.
- Après maintenance, exécuter `.claude/scripts/workflow-doctor.sh` et vérifier aussi les liens,
  branches et dépendances des tâches. Le doctor contrôle l'intégrité du kit ; il ne prouve pas que
  l'agent a exécuté `branch-router`, suivi une branche ou validé une feature.
- Ne charger que les compétences nécessaires. Conserver les écarts observés dans la validation
  de la tâche concernée ; éviter d'ajouter des gates ou des outils sans besoin identifié.

## Carte actuelle des branches proposées

| Tâche | Branche cible | Intégration |
|---|---|---|
| 02 — Déploiement initial | `dev/portfolio-deployment` | `master` après validation |
| 03 — Persistance | `dev/portfolio-storage` | `master` après 02 et preuve distante |
| 04 — Administration en ligne | `dev/portfolio-admin-online` | `master` après 03 |
| 05 — Médiathèque distante | `dev/portfolio-media` | `master` après 03/04 |
| 06 — Typographie | `dev/portfolio-typography` | `master` ; vérifier 04 pour la sauvegarde en ligne |
| 07 — Validation/publication finale | `master` intégré, contrôles de release | Corrections sur la branche de leur feature |

Ces branches sont proposées et non créées. La validation finale 07 n'est pas une nouvelle feature :
elle vérifie le SHA intégré. Si elle découvre un défaut, revenir à la tâche/branche qui le possède,
valider la correction puis intégrer avant de reprendre la publication.
