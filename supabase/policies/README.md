Appliquer les policies RLS pour `club_members`

But: ces instructions expliquent comment appliquer les SQL fournis dans `club_members_rls.sql`.

Options pour appliquer la SQL

1) Utiliser l'éditeur SQL du tableau de bord Supabase (recommandé)
- Ouvre ton projet Supabase → `SQL Editor` → `New query`
- Colle le contenu de `club_members_rls.sql`
- Exécute la requête

2) Utiliser psql / client SQL local
- Récupère l'URL de connexion Postgres depuis `Settings → Database → Connection string`
- Exécute (remplace la variable par ta chaîne de connexion):

```bash
export DATABASE_URL="postgres://user:pass@db.host:5432/dbname"
psql "$DATABASE_URL" -f supabase/policies/club_members_rls.sql
```

3) Notes de sécurité et vérification
- Assure-toi que la colonne `user_id` existe dans `club_members` et contient l'UUID du user Supabase.
- Après l'application, teste l'insert depuis le client (flow d'inscription) ; si l'erreur RLS disparaît, tout est bon.
- Si tu utilises email pour valider à la place de `user_id`, adapte la condition `WITH CHECK` comme indiqué dans le SQL.

Si tu veux, je peux générer une variante SQL qui valide par email (via `jwt.claims.email`) au lieu de `user_id`. Dis-moi laquelle tu préfères et je l'ajoute.

Missives (Hiboux)
------------------

Pour ajouter la fonctionnalité "hiboux" (missives), appliquez les deux fichiers SQL fournis dans ce dossier :

- `create_missives_table.sql` : crée la table `public.missives`.
- `missives_rls.sql` : active RLS et ajoute des policies permettant l'insertion aux utilisateurs authentifiés et la lecture seulement pour les destinataires/authors ou envoi global.

Exemples d'application (Supabase SQL editor ou psql) :

```bash
# Supabase SQL editor: collez le contenu et exécutez

# Ou avec psql (remplacez par votre DATABASE_URL):
psql "$DATABASE_URL" -f supabase/policies/create_missives_table.sql
psql "$DATABASE_URL" -f supabase/policies/missives_rls.sql
```

Après application, teste la page `pages/hiboux.html` en tant qu'utilisateur authentifié. La page utilise `DataStore.addMissive`, `DataStore.getMissives` et la souscription realtime `DataStore.subscribeMissives`.
