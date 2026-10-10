# Stockage durable — preuve isolée

État au 10 octobre 2026 : Blob privé est l'option à tester. Le service est créé ; la preuve distante n'est pas encore réalisée.

## Configuration

Projet Vercel : `pierre-dillard-portfolio`. Branche : `dev/portfolio-storage`.
Store privé : `portfolio-storage-preview`, `store_I4iHU5cmpkJnlTR3`, région `iad1`, disponible.
Connecter ce store à **Preview uniquement**, avec les variables injectées par Vercel pour l'authentification OIDC. La vérification API du 10 octobre confirme maintenant Preview uniquement, après correction par Pierre.

## Preuve à exécuter

`npm run build` exécute `scripts/verify-storage.mjs` avant Next.js.
Le script ne contacte Blob que si `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF=dev/portfolio-storage` et `STORAGE_PROBE_RUN` est renseigné. En local, en production ou sur une autre branche, il est inactif.

1. Sur la branche Preview, définir `STORAGE_PROBE_RUN=initial`. Le build écrit un petit JSON synthétique privé dans `proof/persistence.json`, sans importer de contenu réel.
2. Le build relit sans cache, lance deux écritures avec le même ETag et exige une réussite unique et un refus `BlobPreconditionFailedError`. Il restaure le document de référence par écriture conditionnelle.
3. Une requête sans identité au fichier privé doit répondre 401, 403 ou 404.
4. Pour le deuxième déploiement, définir `STORAGE_PROBE_RUN=redeployed` et `STORAGE_PROBE_EXPECT_PREVIOUS_RUN=initial`. Le build doit retrouver le marqueur initial avant de réexécuter la preuve. Garder ce run et son SHA dans la validation de la tâche.

La preuve emploie l'accès du build Vercel au store privé, pas une session de l'éditeur. La connexion GitHub propriétaire, le refus d'autres comptes, l'édition et la publication restent à prouver dans 04. Aucun endpoint d'écriture supplémentaire n'est exposé.

Un build échoue si une assertion échoue. Les messages `[storage-proof]` ne contiennent ni credentials ni contenu éditorial réel. Un build local réussi avec « skipped » ne prouve pas le stockage distant.

## Quotas et reprise

Hobby inclut 1 Go de stockage moyen mensuel, 10 Go de transfert par mois, 10 000 opérations simples et 2 000 avancées. Un dépassement suspend l'accès sans facturation supplémentaire. Les quotas disponibles totaux ne sont pas connus ; le store de test est vide à la dernière vérification. [Tarifs Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing).

L'application finale devra distinguer brouillon et état publié, versionner les documents privés, détecter les conflits par ETag et permettre des exports relus. Ne pas migrer de données réelles avant la réussite de la preuve. Le disque local Vercel ne sera pas une source persistante.

Après validation, désactiver `STORAGE_PROBE_RUN` et `STORAGE_PROBE_EXPECT_PREVIOUS_RUN` sur Preview ; conserver les preuves dans la tâche. La tâche 04 remplacera les écritures locales par l'adaptateur retenu et utilisera la session GitHub existante. La tâche 05 traitera la politique des médias privés/publics et des uploads. Aucune suppression cloud ni intégration sur master n'est réalisée par ce document.

[SDK Blob : ETags, lecture sans cache et authentification](https://vercel.com/docs/vercel-blob/using-blob-sdk).
