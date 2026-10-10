# write-a-skill conservé localement

2026-10-10 — Décision de Pierre : « je veux la conserver en local ».
Migration explicite de propriété, sans changement de contenu ni de droits des huit fichiers.

Le skill reste dans .claude/skills/write-a-skill/ et son miroir .codex/skills/write-a-skill/.
Ses quatre anciens fichiers de runtime restent sur place comme ressources locales ; ils ne
sont plus détenus par le kit. Aucun module ajouté, aucune provenance source inventée.
released-files.json conserve les anciens enregistrements et leurs hashes/modes.
inventory-before.json sauvegarde l'inventaire complet avant la migration.

Les futures mises à jour du kit ignorent ces fichiers locaux. Le catalogue composé ne les
répertoriera plus après update ; leur découverte dépend de leur présence dans les dossiers skills.
Pour toute modification locale, maintenir explicitement les deux copies identiques :
la synchronisation des skills gérés par le kit ne les prend plus en charge après update.

Validation : intégrité des huit fichiers et égalité des deux copies vérifiées ; retrait des
huit propriétaires testé sur une copie temporaire, aperçu update réussi.
L'ancien guide référence scripts/skill-proposals.mjs dans le kit source : ce lanceur est absent
du kit courant. Conservation des fichiers ne prouve pas que cet ancien parcours fonctionne.
Ne pas présenter une activation native ou l'ancien outil comme testés.

Cette sauvegarde précède update. Après update, ne pas restaurer cet inventaire seul : il ne
correspondrait plus aux nouveaux fichiers gérés. Aucune mise à jour appliquée par cette migration.
