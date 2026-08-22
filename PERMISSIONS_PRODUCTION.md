# 🔒 Guide: Appliquer les RLS Policies pour la Production GitHub Pages

## ⚠️ Problème en Production

Quand le code est publié sur GitHub Pages ou en production, les permissions (Directeur, Grand Professeur, etc.) **ne fonctionnent pas** car:

1. La table `professors` a RLS activé
2. **Aucune policy de lecture** n'existe → les utilisateurs ne peuvent pas lire leur propre profil
3. Le code révert à `rank` depuis le suffixe de l'email (ex: .prof → "Professeur")
4. Les permissions avancées (Directeur, Grand Professeur) échouent

## ✅ Solution

Appliquer les RLS policies suivantes **dans Supabase SQL Editor**:

### Étape 1: Appliquer la policy PROFESSORS

1. Va à **https://app.supabase.com → Ton Projet → SQL Editor**
2. Clique sur **"New Query"**
3. **Copie-colle ce code:**

```sql
-- RLS Policy for professors table
ALTER TABLE IF EXISTS public.professors ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all professor profiles
CREATE POLICY IF NOT EXISTS "professors_read_all_authenticated" ON public.professors
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update their own profile
CREATE POLICY IF NOT EXISTS "professors_update_own" ON public.professors
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);

-- Policy: Authenticated users can insert their own profile
CREATE POLICY IF NOT EXISTS "professors_insert_own" ON public.professors
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);

-- Policy: Only allow delete of own profile
CREATE POLICY IF NOT EXISTS "professors_delete_own" ON public.professors
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);
```

4. Clique sur **RUN** ✅

### Étape 2: Appliquer la policy CLUB_MEMBERS

Si tu utilises la table `club_members`, ajoute aussi cette policy:

```sql
-- RLS Policy for club_members table
ALTER TABLE IF EXISTS public.club_members ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all club members
CREATE POLICY IF NOT EXISTS "club_members_read_all" ON public.club_members
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update their own membership
CREATE POLICY IF NOT EXISTS "club_members_update_own" ON public.club_members
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);

-- Policy: Authenticated users can insert their own membership
CREATE POLICY IF NOT EXISTS "club_members_insert_own" ON public.club_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);
```

### Étape 3: Vérifier les données

Assure-toi que tes utilisateurs dans Supabase ont les bons champs:

**Table `professors`:**
- ✅ `id` (UUID)
- ✅ `user_id` (UUID) - doit correspondre à l'ID Supabase Auth
- ✅ `email`
- ✅ `name`
- ✅ `rank` (ex: "Directeur", "Grand Professeur", "Professeur")
- ✅ `role` (ex: "prof", "staff")

Si les champs `rank` et `role` sont **vides**, le code n'aura que le rank par défaut du suffixe email.

## 🧪 Test en Production

Après avoir appliqué les policies:

1. **Accède à GitHub Pages** (ou ton domaine en production)
2. **Connecte-toi** avec un compte Directeur
3. **Vérifies que**:
   - ✅ Le bouton "🔑 Créer un identifiant" apparaît dans la navbar
   - ✅ Tu peux accéder aux paramètres de rôles
   - ✅ Les permissions fonctionnent correctement

## 📚 Fichiers Relevants

- [`supabase/policies/professors_rls.sql`](../policies/professors_rls.sql) - Policy pour la table professors
- [`supabase/policies/club_members_rls.sql`](../policies/club_members_rls.sql) - Policy pour la table club_members (si appliquée)
- [`js/auth.js`](../../js/auth.js#L276) - Fonction `hasPermission()` qui vérifie les permissions

## 🔍 Troubleshooting

**Q: J'ai appliqué la policy mais les permissions ne marchent pas**
- Vérifies que `user_id` dans Supabase correspond à l'ID Auth (pas à l'email!)
- Vérifies que le champ `rank` n'est pas vide
- Teste dans la console du navigateur: `Auth.getCurrentUser()` doit retourner l'utilisateur avec `rank` et `role`

**Q: Pourquoi les permissions marchent en local mais pas en production?**
- En local, les RLS policies ne s'appliquent pas (ou sont désactivées)
- En production, les policies s'appliquent → les données ne sont pas accessibles sans les bonnes policies
- Solution: Appliquer cette page RLS en Supabase Dashboard

**Q: Puis-je laisser les tables sans RLS?**
- ❌ Non! C'est un risque de sécurité
- ✅ Oui, si tu désactives RLS complètement (à tes risques)
- Solution recommandée: Garder RLS + appliquer les policies

## 📖 Ressources

- Docs Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- JWT Claims: https://supabase.com/docs/guides/auth/jwts
- Test RLS Policies: https://supabase.com/docs/guides/auth/row-level-security/policy-templates
