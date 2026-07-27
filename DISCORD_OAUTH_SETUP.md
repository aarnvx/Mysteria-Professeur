# Configuration Discord OAuth2 - Poudlard RP

## 🔧 Configuration Requise

### 1. Créer une Application Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur "New Application"
3. Donnez-lui un nom: **Poudlard RP**
4. Acceptez les conditions et cliquez "Create"

### 2. Obtenir les Identifiants

1. Allez à l'onglet "OAuth2" -> "General"
2. Copiez votre **CLIENT ID**
3. Cliquez sur "Reset Secret" et copiez le **CLIENT SECRET**

### 3. Ajouter l'URL de Redirection

1. Dans "OAuth2" -> "Redirects"
2. Ajoutez l'URL: `http://localhost:5000/discord-callback.html` (développement)
3. Pour la production: `https://votredomaine.com/discord-callback.html`
4. Cliquez "Save"

### 4. Configurer les Scopes

1. Dans "OAuth2" -> "OAuth2 URL Generator"
2. Sélectionnez les scopes: `identify` et `email`
3. Cela génère une URL de test (optionnel pour tester)

---

## 📝 Implémenter dans Poudlard RP

### Étape 1: Mettre à jour `discord-auth.js`

```javascript
const DiscordAuth = {
  CONFIG: {
    clientId: 'VOTRE_CLIENT_ID_ICI',  // ← Remplacer
    redirectUri: 'http://localhost:5000/discord-callback.html', // ← Adapter l'URL
    scope: 'identify email',
    authorizationEndpoint: 'https://discord.com/api/oauth2/authorize'
  }
}
```

### Étape 2: Créer la Table Supabase

Exécutez le SQL dans [Supabase SQL Editor](https://app.supabase.com/):

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

### Étape 3: Backend OAuth (Node.js)

Vous devez créer un endpoint backend pour échanger le code contre un token:

```javascript
// Exemple avec Express
app.post('/api/discord-callback', async (req, res) => {
  const { code } = req.body;
  
  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    const tokenData = await response.json();
    
    // Récupérer les infos utilisateur
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    const user = await userResponse.json();

    res.json({
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 🧪 Tester Localement

1. Installez les dépendances:
   ```bash
   npm install express dotenv node-fetch
   ```

2. Créez un fichier `.env`:
   ```
   DISCORD_CLIENT_ID=votre_client_id
   DISCORD_CLIENT_SECRET=votre_client_secret
   DISCORD_REDIRECT_URI=http://localhost:5000/discord-callback.html
   ```

3. Lancez le serveur:
   ```bash
   node server.js
   ```

4. Accédez à `http://localhost:5000` et testez le login

---

## 📋 Intégration dans le Login

### Pour Première Connexion:
1. L'utilisateur se connecte avec son email
2. S'il n'existe pas, il voit `setup-profile.html`
3. Il remplit son nom RP, sa maison
4. Il clique "Connecter Discord" (obligatoire)
5. Popup OAuth Discord s'ouvre
6. Une fois confirmé, il peut créer son compte

### Pour Utilisateurs Existants:
1. L'utilisateur se connecte
2. Si Discord n'est pas lié, un popup demande de se connecter
3. Il peut cliquer "Plus tard" mais le reprompt à chaque login
4. Une fois Discord lié, accès normal

---

## 🔐 Sécurité

- ✅ Ne jamais exposer le CLIENT_SECRET en frontend
- ✅ Toujours utiliser HTTPS en production
- ✅ Valider l'email Discord du côté serveur
- ✅ Utiliser RLS dans Supabase pour protéger les données
- ✅ Stocker les tokens OAuth temporairement seulement

---

## 📚 Ressources

- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [OAuth2 Security Best Practices](https://tools.ietf.org/html/rfc6749)
