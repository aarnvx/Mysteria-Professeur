# Bot Discord Mysteria

Le portail appelle `notify-missive`, qui transmet ensuite la missive a `bot.py`.

## Heberger sur Render

1. Cree un Web Service depuis ce depot.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn bot:app --host 0.0.0.0 --port $PORT`
4. Ajoute ces variables d'environnement:

```text
DISCORD_BOT_TOKEN=token-du-bot-discord
BOT_API_SECRET=un-secret-long-et-aleatoire
PORTAL_URL=https://aarnvx.github.io/Mysteria-Professeur/index.html
```

Une fois le service deploye, teste:

```text
https://TON-SERVICE.onrender.com/health
```

La reponse doit contenir `"discord_ready": true`.

## Configurer Supabase

Dans le terminal du projet, remplace les deux valeurs:

```powershell
npx.cmd supabase secrets set BOT_API_URL=https://TON-SERVICE.onrender.com BOT_API_SECRET=LE_MEME_SECRET --project-ref gapclzuljxzfeillsavz
```

`BOT_API_SECRET` doit etre strictement identique dans Render et Supabase.

## Important Discord

Le bot doit etre invite avec le scope `bot` et le destinataire doit partager un serveur avec lui. L'hebergement le garde connecte, mais ne supprime pas la regle Discord des serveurs communs.
