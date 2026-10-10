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

## Publication sur Vercel

Le projet Vercel n'est pas encore créé. L'éditeur local n'est pas exposé dans la version de production : sa page, ses API et les routes de connexion répondent 404. Les fonctions Vercel ne peuvent pas conserver durablement les modifications dans `content/site.json` ou `public/media/uploads/`. Avant de publier une administration utilisable depuis n'importe quel appareil, il faut connecter ce dépôt à Vercel, adapter la connexion GitHub à l'URL publique, ajouter un stockage persistant des contenus et versions, et un stockage média (avec import direct pour les grosses vidéos). Il faudra valider la session réelle, la restriction au compte autorisé, les cookies sécurisés et les requêtes d'écriture depuis le domaine publié avant d'ouvrir ces routes. Le site public pourra alors lire ces données sans reconstruction manuelle.

La V1 statique reste à la racine ; seule la V2 doit être configurée comme projet Vercel, avec `v2/` comme répertoire racine. Ne pas publier l'éditeur local comme solution de production.

Le [plan de livraison complet](../../tasks/todo/portfolio-v2/README.md) détaille le premier push, l'évaluation de Vercel Blob et Supabase, la connexion et les contenus persistants, la médiathèque distante et la validation finale. Il inclut aussi les réglages de tailles des titres, sous-titres et paragraphes depuis l'administration. Ces travaux sont planifiés ; ils ne sont pas encore implémentés.
