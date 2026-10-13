# Guide éditorial de la V2

## Éditer le portfolio sur cet ordinateur

Depuis `v2/`, lancer `npm ci` une première fois, puis `npm run dev -- -p 3017`. Ouvrir `http://127.0.0.1:3017/`, puis cliquer sur **Éditeur ↗** dans la navigation. L'adresse directe reste `http://127.0.0.1:3017/admin`.

Pour exiger une connexion GitHub sur cet éditeur local, copier `.env.example` dans `.env.local`, renseigner `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` et l'identifiant **numérique** `ADMIN_GITHUB_ID`, puis redémarrer le serveur. L'application OAuth GitHub doit avoir pour URL d'accueil `http://127.0.0.1:3017` et pour URL de rappel `http://127.0.0.1:3017/api/auth/callback/github`. Générer `AUTH_SECRET` avec `openssl rand -base64 32`. `ADMIN_REQUIRE_AUTH=true` ferme l'administration si une valeur manque ou si l'identifiant GitHub n'est pas valide. Seul le compte GitHub dont l'identifiant numérique correspond peut ouvrir une session ; chaque requête de lecture ou d'écriture à l'API d'administration vérifie cette session. Pour les écritures, l'origine doit aussi correspondre au serveur local. Les secrets de `.env.local` sont ignorés par Git.

L'onglet **Accueil & profil** modifie les textes, les expertises, le portrait et le CV. **Projets** et **Articles** permettent de choisir une fiche, d'en créer une, de modifier ses sections, liens et médias, puis de l'enregistrer. **Médiathèque** importe une capture, une image, une vidéo ou un PDF et affiche son chemin. Les médias existants sont proposés directement dans les formulaires.

Pour les six grands titres de l'accueil, écrire la phrase entière dans le champ, sélectionner les mots voulus dans cette phrase, puis cliquer sur **Colorer le texte sélectionné**. L'aperçu montre la couleur avant enregistrement. La sélection peut être au début, au milieu ou à la fin ; **Retirer la couleur** l'efface sans changer le texte. Modifier un titre de façon à supprimer les mots colorés retire aussi leur couleur. Une ancienne sauvegarde au format des deux champs « avant / couleur » est convertie lors du chargement.

Une nouvelle fiche commence en **brouillon**. Elle n'apparaît pas sur le site public tant que sa visibilité n'est pas passée à **Publié** et que les changements ne sont pas enregistrés. Un projet publié doit avoir au moins un média. Les liens « Voir la page » ouvrent la version enregistrée ; enregistrer avant de vérifier l'aperçu. Le site recharge les changements en mode développement.

Les boutons **Monter** et **Descendre** changent l'ordre des projets et des articles. Le premier projet publié est mis en avant sur l'accueil ; le premier article publié apparaît dans l'appel à lire le journal.

Le bouton **Exporter JSON** télécharge une copie du contenu courant. Chaque enregistrement conserve aussi l'état précédent dans `content/backups/`. Le contenu actif est `content/site.json` ; les images, vidéos et PDF importés sont dans `public/media/uploads/`. Les sauvegardes et les fichiers importés restent sur cet ordinateur. Pour restaurer une version, arrêter le serveur, copier le JSON voulu de `content/backups/` vers `content/site.json`, puis relancer le serveur.

Chaque capture doit décrire l'interface réelle avec un texte alternatif et une légende. Une illustration synthétique doit être annoncée comme telle. Conserver les preuves des chiffres et des contributions dans `content-evidence.md` et `wiki-contributions-inventory.md`.

## Administration sur la Preview Vercel

La première version du site est publiée. L'édition distante de la tâche 04 est limitée à la Preview `dev/portfolio-admin-online`, avec `ADMIN_AUTH_PREVIEW=true`, `ADMIN_CONTENT_PREVIEW=true`, les variables OAuth serveur et le store Blob privé connecté à Preview. La production conserve le contenu Git et son administration fermée ; l'activation en production relève de la validation/publication 07.

Ouvrir `/admin/connexion`, se connecter avec le compte propriétaire, puis ouvrir l'éditeur. Modifier le profil, les projets, les articles et leur ordre. **Enregistrer les changements** sauvegarde uniquement le brouillon privé. **Publier** copie le brouillon enregistré dans la version publique de cette Preview, après confirmation. Les fiches dont la visibilité est encore « brouillon » restent exclues de cette version publique.

**Aperçu du brouillon enregistré** ouvre le même rendu que le portfolio avec un cookie d'aperçu. La session propriétaire est revérifiée à chaque lecture ; un cookie d'aperçu seul ne donne pas accès au brouillon. L'aperçu inclut aussi les fiches brouillon et montre un bandeau avec **Quitter l'aperçu**. Enregistrer avant de l'ouvrir. Quitter l'aperçu pour vérifier la version publique ; le cookie concerne les onglets de ce navigateur.

Dans **Historique**, **Restaurer** récupère une sauvegarde dans le brouillon sans modifier la version publique. Vérifier l'aperçu puis publier explicitement. **Exporter JSON** exporte les champs affichés, y compris les changements non enregistrés. **Exporter la sauvegarde** exporte le document distant (brouillon, publié, révision et index des versions). Chaque version a son propre export ; télécharger ceux qu'on veut conserver avant de les retirer. L'export du document courant ne contient pas les fichiers des snapshots, seulement leur index.

Deux onglets peuvent charger la même révision ; seule une écriture avec la révision actuelle réussit. En cas de conflit, exporter ses changements avant de recharger, puis reporter les modifications voulues. Une panne de stockage ou une session expirée ne doit pas afficher de réussite. Utiliser **Se reconnecter sans fermer cet onglet**, puis réessayer. Les modifications non enregistrées sont conservées dans la mémoire de l'éditeur et, si disponible, dans le stockage de session de cet onglet. Une récupération peut être proposée après rechargement. Exporter régulièrement ; la fermeture de l'onglet efface ce stockage de session.

L'historique actif est limité à 50 versions. Une nouvelle sauvegarde est refusée à cette limite : exporter une ancienne version puis **Retirer**, avec confirmation, pour libérer une place. Les écritures réussies sont espacées d'au moins 500 ms côté document distant ; réessayer après une seconde si la limite est atteinte. Les médias existants peuvent être sélectionnés ; l'import distant appartient à la tâche 05. Les originaux locaux sont conservés.

La source serveur est `portfolio/content.json` dans le store privé. Les versions sont dans `portfolio/versions/`. Les pages et métadonnées sont dynamiques, les lectures Blob contournent son cache, les réponses admin sont privées/no-store. Une publication est lue à la requête suivante, sans push de contenu ; recharger une page déjà ouverte. Si le stockage configuré devient indisponible, les pages échouent plutôt que de masquer la panne avec une ancienne copie Git. Aucun brouillon n'est servi comme remplacement.

Pour une reprise hors interface, exporter le document et les versions séparément, vérifier leurs JSON, puis restaurer via une intervention propriétaire contrôlée. Un rollback de code Vercel ne restaure pas les contenus. La V1 reste à la racine ; la racine du projet Next.js est `v2/`. Les résultats réellement observés sont consignés dans la tâche 04 ; la présence de ce guide ne constitue pas une validation distante.
