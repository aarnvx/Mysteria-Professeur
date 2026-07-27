# 🎭 POUDLARD RP - Configuration Discord OAuth

## ✅ Fichiers Créés

### 1. **discord-auth.js** 
   - Gestion de l'OAuth Discord
   - Ouverture du popup de connexion
   - Liaison Discord-Email

### 2. **setup-profile.html** 
   - Formulaire de configuration profil
   - Champs: Nom RP, Maison
   - **Bouton Discord obligatoire** 🔗
   - Après login première fois

### 3. **discord-callback.html**
   - Page de redirection Discord OAuth
   - Récupère l'authentification
   - Communique avec le popup principal

### 4. **discord-link-popup.html**
   - Popup pour utilisateurs existants sans Discord
   - Affichée au login s'il manque Discord
   - "Se Connecter" ou "Plus tard"

---

## 🔧 Configuration Étapes

### Étape 1: Créer l'App Discord

1. Allez à [Discord Developer Portal](https://discord.com/developers/applications)
2. **New Application** → Nommez-la "Poudlard RP"
3. Allez à **OAuth2** → **General**
4. Copiez votre **CLIENT ID**
5. **Reset Secret** et copiez le **CLIENT SECRET**

### Étape 2: Ajouter l'URL de Redirection

Dans **OAuth2** → **Redirects**, ajoutez:
```
http://localhost:5000/discord-callback.html       (développement)
https://votredomaine.com/discord-callback.html     (production)
```

### Étape 3: Mettre à Jour discord-auth.js

```javascript
CONFIG: {
  clientId: 'VOTRE_CLIENT_ID_ICI',           // ← Remplacer
  redirectUri: 'http://localhost:5000/discord-callback.html', // ← Adapter
  ...
}
```

### Étape 4: Créer la Table Supabase

Exécutez dans [Supabase SQL Editor](https://app.supabase.com/):

```sql
CREATE TABLE user_discord_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL,
  linked_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_discord_links_email ON user_discord_links(email);
```

### Étape 5: Ajouter à index.html

```html
<!-- Avant le </body> -->
<script src="js/discord-auth.js"></script>
```

### Étape 6: Backend OAuth (Nécessaire!)

Vous DEVEZ créer un endpoint backend `/api/discord-callback` qui:
1. Échange le code contre un token
2. Récupère les infos Discord
3. Retourne l'user Discord

**Voir DISCORD_OAUTH_SETUP.md pour le code backend complet**

---

## 🔄 Flux Utilisateur

### 🆕 Première Connexion (Nouveau Utilisateur)

```
1. Va sur https://site.com
2. Rentre son email (@mysteria.prof ou @mysteria.club)
3. Rentre son mot de passe
4. ↓
5. Voit le formulaire setup-profile.html
6. ↓
7. Remplit:
   - Nom RP
   - Maison (optionnel)
   - Clique "Connecter mon compte Discord"
8. ↓
9. Popup OAuth Discord s'ouvre
10. Se connecte à Discord ou autorise
11. ↓
12. Revient au formulaire (Discord lié ✅)
13. Clique "Continuer"
14. ↓
15. Compte créé ✅
16. Redirigé vers dashboard
```

### 👤 Utilisateur Existant (Pas Discord)

```
1. Va sur https://site.com
2. Rentre ses identifiants
3. ↓
4. JavaScript détecte: discordRequired: true
5. ↓
6. Ouvre popup discord-link-popup.html
7. ↓
8. Utilisateur clique "Se Connecter"
9. Popup OAuth Discord
10. Se connecte
11. ↓
12. Discord lié ✅
13. Popup se ferme
14. Redirigé vers dashboard
```

### 🔄 Utilisateur Déjà Connecté à Discord

```
1. Va sur https://site.com
2. Rentre ses identifiants
3. ↓
4. Pas de popup (Discord déjà lié)
5. ↓
6. Redirigé vers dashboard directement
```

---

## 📋 Checklist Implémentation

- [ ] Créer application Discord
- [ ] Copier CLIENT_ID dans discord-auth.js
- [ ] Configurer redirectUri
- [ ] Créer table Supabase
- [ ] Créer backend `/api/discord-callback`
- [ ] Ajouter discord-auth.js à index.html
- [ ] Ajouter check Discord au login (dans auth.js)
- [ ] Tester première connexion
- [ ] Tester login utilisateur existant
- [ ] Tester popup Discord

---

## 🧪 Tester Localement

### Configuration .env (Backend)
```env
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
DISCORD_REDIRECT_URI=http://localhost:5000/discord-callback.html
SUPABASE_URL=xxx
SUPABASE_KEY=xxx
```

### Lancer le serveur
```bash
npm install express dotenv cors
node server.js
```

### Accéder à l'app
```
http://localhost:5000
```

---

## 🔐 Variables d'Environnement

À garder **secret** et jamais committer:
- `DISCORD_CLIENT_SECRET` ← Ne JAMAIS mettre en frontend!
- `SUPABASE_KEY` (admin) ← À sécuriser

À mettre en frontend (public):
- `DISCORD_CLIENT_ID` ← Ok en public

---

## 🐛 Troubleshooting

### OAuth redirect URI mismatch
→ Vérifier que l'URL dans Discord Dev Portal == celle en code

### Popup bloquée
→ Vérifier les paramètres du navigateur (blocage popup)

### "Missing Scopes"
→ Ajouter `identify email` dans Discord App OAuth2

### Backend retourne erreur 401
→ Vérifier les credentials Discord (CLIENT_ID, SECRET)

---

## 📚 Ressources

- [Discord OAuth2 Docs](https://discord.com/developers/docs/topics/oauth2)
- [Discord API Reference](https://discord.com/developers/docs/reference)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

## 🚀 Prêt?

1. Suivez la **checklist** ci-dessus
2. Testez en local
3. Déployez en production
4. Profitez! 🎭
