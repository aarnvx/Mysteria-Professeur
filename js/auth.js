/**
 * auth.js - Gestion de l'authentification avec Supabase Auth
 */

const AUTH_KEY = 'poudlard_auth';
const SESSION_KEY = 'poudlard_session';

const Auth = {
  async login(email, password) {
    try {
      // 1. Connexion via Supabase Auth
      const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) throw authError;

      // 2. Récupérer le profil dans la table professors (basé sur l'email)
      const { data: profile, error: profileError } = await window.supabaseClient
        .from('professors')
        .select('*')
        .eq('email', authData.user.email)
        .maybeSingle();

      if (profileError) console.error("Erreur récupération profil:", profileError);
      
      if (!profile) {
        return { ok: true, requireSetup: true };
      }

      const userSession = {
        id: authData.user.id,
        email: authData.user.email,
        name: profile ? profile.name : 'Professeur',
        rank: profile ? (profile.rank || 'Professeur Apprenti') : 'Professeur Apprenti',
        role: profile ? (profile.role || 'Aucune') : 'Aucune',
        house: profile ? profile.house : null,
        avatar: profile ? profile.avatar : '🎓',
        loggedAt: new Date().toISOString()
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(userSession));
      return { ok: true, user: userSession };

    } catch (err) {
      console.error('Erreur de connexion:', err);
      // Messages d'erreur personnalisés selon l'erreur retournée par Supabase Auth
      if (err.message === 'Invalid login credentials') {
        return { ok: false, error: 'Identifiants incorrects. Vérifiez votre email et mot de passe.' };
      } else if (err.message === 'Email not confirmed') {
        return { ok: false, error: 'Veuillez confirmer votre adresse email.' };
      }
      return { ok: false, error: 'Erreur réseau ou identifiants incorrects.' };
    }
  },

  async setupProfile(email, name, rank = 'Professeur Apprenti', role = 'Aucune', house = null) {
    try {
      let finalName = name.trim();
      if (!finalName.toLowerCase().startsWith('professeur') && !finalName.toLowerCase().startsWith('prof.')) {
        finalName = 'Professeur ' + finalName;
      }

      const { data, error } = await window.supabaseClient.from('professors').insert([
        { email, name: finalName, rank, role, house, avatar: '🎓' }
      ]).select().single();
      
      if (error) throw error;
      
      const { data: authData } = await window.supabaseClient.auth.getUser();
      if (!authData.user) return { ok: false, error: "Session expirée, veuillez vous reconnecter." };

      const userSession = {
        id: authData.user.id,
        email: email,
        name: data.name,
        rank: data.rank,
        role: data.role,
        house: data.house,
        avatar: data.avatar,
        loggedAt: new Date().toISOString()
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(userSession));
      return { ok: true, user: userSession };
    } catch (err) {
      console.error('Erreur setupProfile:', err);
      return { ok: false, error: 'Erreur lors de la création : ' + (err.message || JSON.stringify(err)) };
    }
  },

  hasPermission(action) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const rank = user.rank || '';
    const role = user.role || '';
    
    const isHighRank = rank.includes('Grand Professeur') || rank.includes('Directeur') || role.includes('Directeur');
    const isWriter = rank.includes('Rédacteur') || role.includes('Rédacteur');

    if (action === 'manage_roles') {
      return isHighRank;
    }
    
    if (action === 'create_content') {
      return isHighRank || isWriter;
    }

    return false;
  },

  async logout() {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (err) {
      console.error("Erreur lors de la déconnexion Supabase", err);
    }
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '../index.html';
  },

  getCurrentUser() {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '../index.html';
      return null;
    }
    return this.getCurrentUser();
  },

  async checkSessionCode(code) {
    try {
      const { data, error } = await window.supabaseClient
        .from('session_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('active', true)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, joinedAt: new Date().toISOString() }));
        return { ok: true, session: data };
      }
      
      return { ok: false, error: 'Code de session invalide ou expiré.' };
    } catch (err) {
      console.error('Erreur session:', err);
      return { ok: false, error: 'Erreur réseau avec Supabase.' };
    }
  }
};

// Guard: redirect si pas connecté (appeler sur chaque page protégée)
function requireAuthOrRedirect() {
  const user = Auth.getCurrentUser();
  if (!user) {
    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    if (!isIndex) {
      window.location.href = '../index.html';
    }
    return null;
  }
  return user;
}

// Toast utilitaire
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// Global shortcut to close the site: Windows + Shift + C
document.addEventListener('keydown', function(e) {
  // metaKey corresponds to the Windows key (or Command on Mac)
  if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    // window.close() might be blocked by browsers if the script didn't open the window
    // so we change the location to about:blank as a fallback.
    window.location.href = "about:blank";
    window.close();
  }
});

