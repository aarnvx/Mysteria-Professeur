/**
 * discord-auth.js - Gestion de l'authentification Discord
 * OAuth2 Discord pour Poudlard RP
 */

const DiscordAuth = {
  // Configuration Discord OAuth (à remplir avec vos données)
  CONFIG: {
    clientId: 'VOTRE_CLIENT_ID_DISCORD', // À récupérer depuis Discord Developer Portal
    redirectUri: window.location.origin + '/discord-callback.html',
    scope: 'identify email',
    authorizationEndpoint: 'https://discord.com/api/oauth2/authorize'
  },

  /**
   * Génère l'URL de connexion Discord
   */
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.CONFIG.clientId,
      redirect_uri: this.CONFIG.redirectUri,
      response_type: 'code',
      scope: this.CONFIG.scope
    });
    return `${this.CONFIG.authorizationEndpoint}?${params.toString()}`;
  },

  /**
   * Ouvre le popup de connexion Discord
   */
  openDiscordLogin() {
    const authUrl = this.getAuthUrl();
    const width = 500;
    const height = 700;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    window.discordAuthWindow = window.open(
      authUrl,
      'Discord Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Écouter les messages du popup
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'DISCORD_AUTH_SUCCESS') {
        this.handleDiscordSuccess(event.data.user);
      } else if (event.data.type === 'DISCORD_AUTH_ERROR') {
        this.handleDiscordError(event.data.error);
      }
    });
  },

  /**
   * Vérifie si l'utilisateur a son compte Discord lié
   */
  async isDiscordLinked(email) {
    try {
      const { data } = await window.supabaseClient
        .from('user_discord_links')
        .select('discord_id')
        .eq('email', email)
        .maybeSingle();
      
      return !!data?.discord_id;
    } catch (err) {
      console.error('Erreur vérification Discord:', err);
      return false;
    }
  },

  /**
   * Stocke le lien Discord-Supabase
   */
  async linkDiscordToUser(email, discordId, discordUsername) {
    try {
      const { error } = await window.supabaseClient
        .from('user_discord_links')
        .insert([{
          email: email,
          discord_id: discordId,
          discord_username: discordUsername,
          linked_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.error('Erreur liaison Discord:', err);
      return { ok: false, error: err.message };
    }
  },

  /**
   * Appel après succès Discord
   */
  handleDiscordSuccess(user) {
    console.log('Discord auth success:', user);
    // Sera gérée par la page appelante
    window.discordAuthData = user;
    if (window.discordAuthWindow) window.discordAuthWindow.close();
  },

  /**
   * Appel après erreur Discord
   */
  handleDiscordError(error) {
    console.error('Discord auth error:', error);
    showToast('Erreur de connexion Discord: ' + error, 'error');
  }
};
