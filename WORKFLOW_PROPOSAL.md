# Proposition de workflow pour le portfolio

Source : checkout local `agent-workflow-kit`, branche `feat/agent-customization`, commit `c3dd88985d6240575c8f349a09a6ea68cfb`.
Cible : `/home/pierre/projets/perso/portfolio_dillard`.
État : **installé le 7 octobre 2026**, après accord de Pierre (« continue »). Le dry-run isolé s'est terminé par `DRY RUN: no target files were written`. Le contrôle `workflow-doctor.sh` a signalé 0 erreur et 0 avertissement.

## Sélection minimale

- `tasks` : tâches et changements atomiques (`ants`, `write-task`).
- `memory` : conserver seulement les décisions vérifiées (`memory-report`).
- `continuity` : suivre les captures attendues et reprendre le travail (`project-handoff`, `context-relay`).
- Le cœur du kit ajoute aussi `branch-router`, `project-workflow`, `workflow-doctor` et `write-a-skill`, avec des miroirs locaux Claude/Codex. Aucun export global.

## Règles ajoutées par cette sélection

Le cœur demande de lire `.workflow-kit.env`, de n'appliquer que les modules installés, de charger le plus petit contexte utile, de consigner les contrôles réels, et de ne créer ni branche, commit, push, merge ou mutation externe sans autorisation. Il désigne `.claude/skills/` comme source et `.codex/skills/` comme miroir généré.

`tasks` demande de reprendre une tâche existante à son emplacement, sinon de créer `tasks/todo/<effort>/`, de noter la branche lorsqu'elle est connue, et de suivre `ants` et `write-task` pour chaque changement significatif.

`memory` demande de lire `tasks/PROJECT_MEMORY.md` comme index, puis uniquement la mémoire pertinente ; `tasks/DECISIONS.md` indexe les décisions durables, et `memory-report` conserve seulement les connaissances vérifiées.

`continuity` demande de lire un handoff de branche seulement s'il a moins de 14 jours ; d'utiliser `project-handoff` avant de quitter un travail inachevé et `context-relay` avant saturation du contexte, en reliant le handoff à l'effort existant.

Les textes exacts sont dans le checkout de référence : `templates/project/.workflow/base-rules.md`, `modules/tasks/rules/main.md`, `modules/memory/rules/main.md`, `modules/continuity/rules/main.md`.

## Plan d'installation vérifié

L’installation a créé `.workflow-kit.json`, `.workflow/`, `.workflow-kit.env`, `CLAUDE.md`, `AGENTS.md`, les skills locaux `.claude/skills/` et `.codex/skills/`, les scripts/hook du kit et les index `tasks/PROJECT_MEMORY.md` et `tasks/DECISIONS.md`. Aucun fichier du site n’a été modifié par l’installation et aucun skill n’a été exporté dans les répertoires globaux.

Le contrat de la branche (`docs/agent-customization.md`) exige un accord explicite avant l'activation de règles ou d'étapes de workflow, même lorsqu'elles viennent des modules officiels. L’accord a été donné après présentation de cette proposition et de sa cible ; le dry-run, l’installation, `workflow-doctor.sh` et la vérification des liens du site ont été exécutés.
