# Stockage durable — preuve isolée

Décision du 10 octobre 2026 : retenir Vercel Blob pour la persistance. Deux builds Preview réels ont validé la relecture après redéploiement, les conflits d'écriture, la restauration depuis un snapshot privé et le refus anonyme. L'éditeur en ligne reste à réaliser dans 04.

## Configuration

Projet Vercel : `pierre-dillard-portfolio`. Branche : `dev/portfolio-storage`.
Store privé : `portfolio-storage-preview`, `store_I4iHU5cmpkJnlTR3`, région `iad1`, disponible.
Connecter ce store à **Preview uniquement**, avec les variables injectées par Vercel pour l'authentification OIDC. La vérification API du 10 octobre confirme maintenant Preview uniquement, après correction par Pierre.

## Preuve reproductible

`npm run build` exécute `scripts/verify-storage.mjs` avant Next.js.
Le script ne contacte Blob que si `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF=dev/portfolio-storage` et `STORAGE_PROBE_RUN` est renseigné. En local, en production ou sur une autre branche, il est inactif.

1. Sur la branche Preview, définir `STORAGE_PROBE_RUN=initial`. Le build écrit un petit JSON synthétique privé dans `proof/persistence.json`, sans importer de contenu réel.
2. Le build relit sans cache, lance deux écritures avec le même ETag et exige une réussite unique. Le refus concurrent peut être un conflit d’opérations conditionnelles ; une nouvelle écriture avec l’ETag périmé doit ensuite échouer avec `BlobPreconditionFailedError`. Il restaure le document de référence par écriture conditionnelle.
3. Une requête sans identité au fichier privé doit répondre 401, 403 ou 404.
4. Pour le deuxième déploiement, définir `STORAGE_PROBE_RUN=redeployed` et `STORAGE_PROBE_EXPECT_PREVIOUS_RUN=initial`. Le build doit retrouver le marqueur initial avant de réexécuter la preuve. Garder ce run et son SHA dans la validation de la tâche.

La preuve emploie l'accès du build Vercel au store privé, pas une session de l'éditeur. La connexion GitHub propriétaire, le refus d'autres comptes, l'édition et la publication restent à prouver dans 04. Aucun endpoint d'écriture supplémentaire n'est exposé.

Un build échoue si une assertion échoue. Les messages `[storage-proof]` ne contiennent ni credentials ni contenu éditorial réel. Un build local réussi avec « skipped » ne prouve pas le stockage distant.

## Quotas et reprise

Hobby inclut 1 Go de stockage moyen mensuel, 10 Go de transfert par mois, 10 000 opérations simples et 2 000 avancées. Un dépassement suspend l'accès sans facturation supplémentaire. Les quotas disponibles totaux ne sont pas connus ; seuls de petits documents synthétiques ont été stockés pour la preuve. [Tarifs Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing).

## Source de vérité retenue et reprise

Retenir un document JSON privé distant contenant l'état brouillon et l'état publié distincts, mis à jour conditionnellement avec l'ETag attendu. La publication modifie cet état dans une même écriture ; les visiteurs ne recevront que sa partie publiée via un lecteur serveur. La validation et la migration locale existantes seront réutilisées en 04. Le cache des lecteurs publics sera explicitement défini en 04 ; les lectures d'édition utilisent `useCache: false` et `no-store`.

Avant un changement, sauvegarder une version privée immuable. Relire un snapshot avant restauration, puis restaurer par écriture conditionnelle afin de ne pas écraser une édition plus récente. Un snapshot créé avant un conflit peut rester orphelin : prévoir une rétention bornée et une purge contrôlée en 04, sans suppression silencieuse de données réelles.

Exporter le document et les versions avant migration ; tester leur relecture. En cas de panne/quota, refuser la sauvegarde et conserver le brouillon dans l'éditeur ; ne jamais afficher une réussite fictive ni utiliser le disque Vercel comme source persistante. Pour les médias, conserver d'abord les fichiers Git actuels ; 05 définira les uploads, états privés/publiés et leur distribution. Blob reste le service retenu pour les deux types de ressources, sans base Supabase supplémentaire.

Preview et Production doivent utiliser des stores séparés ; le store actuel reste Preview uniquement. La création du store de production et sa région seront des actions distinctes autorisées lors de leur préparation. L'authentification OIDC est utilisée côté Vercel ; ne pas transmettre de credentials au navigateur ni aux preuves. La région iad1 correspond aux fonctions observées.

En cas de migration future : exporter JSON/versions et inventaire des médias, vérifier les hashes/contenus importés, tester les droits/conflits/restauration sur le nouveau service puis basculer le lecteur ; garder l'ancienne source pour reprise jusqu'à validation. Supabase reste une alternative si les besoins deviennent relationnels ou si les quotas/maintenances Blob sont inadaptés.

Après validation, désactiver `STORAGE_PROBE_RUN` et `STORAGE_PROBE_EXPECT_PREVIOUS_RUN` sur Preview ; conserver les preuves dans la tâche. La tâche 04 remplacera les écritures locales par l'adaptateur retenu et utilisera la session GitHub existante. La tâche 05 traitera la politique des médias privés/publics et des uploads. Aucune suppression cloud ni intégration sur master n'est réalisée par ce document.

[SDK Blob : ETags, lecture sans cache et authentification](https://vercel.com/docs/vercel-blob/using-blob-sdk).

## Résultats vérifiés

Code testé : `3ee43735b16746b8fdd1d94fba5df6d5a5077e96`.
- Première preuve verte : `dpl_9vzS29VGEyfp3u4DPwmPb7xBcBnM`, run `initial`, READY.
- Redéploiement : `dpl_EXJ8ezbjG66itYPggBnbJdk9J9fL`, run `redeployed`, READY ; document précédent `initial` relu avant modification.
- Chaque preuve : une seule écriture concurrente réussie, version périmée refusée, snapshot privé relu, restauration vérifiée, accès anonyme 403.
- Deux premiers essais ont identifié le conflit concurrent réel ; le test distingue désormais ce conflit du refus d'un ETag périmé, sans accepter d'autres erreurs.
- Variables de preuve vidées après validation : futurs builds inactifs tant qu'on ne réactive pas explicitement les marqueurs Preview.
- Production toujours au commit `791b7c9438584d74e22f59dd529514147428064e`. La branche de stockage n'est pas fusionnée.

Limite : preuve au niveau du stockage depuis le build authentifié Vercel. Elle ne valide ni la session GitHub propriétaire ni l'édition distante de contenus réels ; ces parcours restent 04/05.

## Tranche d'édition 04 — 11 octobre 2026

L'adaptateur `lib/contentStorage.ts` réutilise le SDK validé. Document privé `portfolio/content.json`, brouillon/publié distincts, révision ETag obligatoire et snapshots immuables dans `portfolio/versions/`. Le document Git initial est conservé : avant la première sauvegarde distante, il sert de valeur initiale sans écriture implicite. La première sauvegarde crée aussi une version de cet état initial.

Une restauration remet uniquement le brouillon, suivie si souhaité d'une publication explicite. Au plus 50 versions référencées ; une sauvegarde supplémentaire est refusée, export et retrait confirmé d'une ancienne version nécessaires. Le retrait enlève d'abord la référence conditionnellement, puis essaie la suppression de ce snapshot ; un échec de suppression laisse un snapshot orphelin, sans faire échouer faussement la mise à jour déjà réussie.

Un snapshot écrit avant un conflit final ou une panne peut rester orphelin. La limite de 50 s'applique à l'historique référencé, pas à ces objets. Aucune purge automatique : maintenance propriétaire après export et vérification des références. Surveiller ces objets et les quotas du store ; ne pas affirmer que tout le stockage historique est borné.

Le lecteur public extrait seulement l'état publié et exclut les fiches brouillon. L'aperçu privé utilise le même rendu et revérifie la session propriétaire, sans cache partagé. Le flag d'édition est Preview uniquement, branche exacte. Le guide éditorial décrit sauvegarde/publication/export/restauration et reprise d'une session expirée. Vérifications locales simulées et runtime ne prouvent pas encore la persistance réelle de cette nouvelle route : voir la tâche 04 pour les résultats de Preview.
