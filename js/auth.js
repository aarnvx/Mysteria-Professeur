/**
 * auth.js - Gestion de l'authentification avec Supabase Auth
 */

const AUTH_KEY = 'Mysteria_auth';
const SESSION_KEY = 'Mysteria_session';

const Auth = {
  normalizeMysteriaId(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') return rawValue;
    let normalized = rawValue.trim();
    if (normalized.startsWith('^')) normalized = normalized.slice(1);
    if (normalized.startsWith('@')) normalized = normalized.slice(1);
    return normalized.toLowerCase();
  },

  async login(email, password, preferredArea = null) {
    try {
      const rawEmail = email.trim();
      const normalizedEmail = this.normalizeMysteriaId(rawEmail);
      const candidates = [rawEmail];
      if (normalizedEmail !== rawEmail) candidates.push(normalizedEmail);

      let authData = null;
      let lastError = null;
      for (const candidateEmail of candidates) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email: candidateEmail,
          password: password
        });
        if (!error) {
          authData = data;
          break;
        }
        lastError = error;
      }

      if (!authData) throw lastError;

      // 2. Récupérer le profil dans la table professors ou club_members selon la page de connexion.
      const normalizedAuthEmail = this.normalizeMysteriaId(authData.user.email);
      const normalizedLoginEmail = normalizedAuthEmail;

      const { data: clubProfile, error: clubError } = await window.supabaseClient
        .from('club_members')
        .select('*')
        .ilike('email', normalizedLoginEmail)
        .maybeSingle();
      if (clubError) console.error("Erreur récupération profil club_members:", clubError);

      const { data: profProfile, error: profError } = await window.supabaseClient
        .from('professors')
        .select('*')
        .ilike('email', normalizedLoginEmail)
        .maybeSingle();
      if (profError) console.error("Erreur récupération profil professeurs:", profError);

      let profile = null;
      if (preferredArea === 'prof') {
        profile = profProfile || clubProfile;
      } else if (preferredArea === 'club') {
        profile = clubProfile || profProfile;
      } else {
        profile = clubProfile || profProfile;
      }

      const emailRole = this.getEmailRoleFromAddress(authData.user.email);
      if (!profile) {
        const pendingSession = {
          id: authData.user.id,
          email: authData.user.email,
          name: emailRole?.defaultName || 'Membre de club',
          rank: emailRole?.rank || 'Membre de club',
          role: emailRole?.role || 'club',
          house: null,
          avatar: emailRole?.avatar || '🎭',
          loggedAt: new Date().toISOString(),
          setupPending: true
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(pendingSession));
        return {
          ok: true,
          requireSetup: true,
          email: authData.user.email,
          emailRole
        };
      }

      const userSession = {
        id: authData.user.id,
        email: authData.user.email,
        name: profile.name || emailRole?.defaultName || 'Membre',
        rank: profile.rank || emailRole?.rank || 'Professeur Apprenti',
        role: profile.role || emailRole?.role || 'Aucune',
        house: profile.house || null,
        avatar: profile.avatar || emailRole?.avatar || '🎓',
        loggedAt: new Date().toISOString()
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(userSession));
      
      // Vérifier si Discord est lié
      const discordLinked = await this.isDiscordLinked(authData.user.email);
      if (!discordLinked) {
        return { ok: true, user: userSession, discordRequired: true };
      }
      
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

  async setupProfile(email, name, rank = null, role = null, house = null, password = null) {
    try {
      const normalizedEmail = this.normalizeMysteriaId(email);
      const emailRole = this.getEmailRoleFromAddress(normalizedEmail);
      let finalName = name.trim();
      if (!finalName.toLowerCase().startsWith('professeur') && !finalName.toLowerCase().startsWith('prof.')) {
        finalName = 'Professeur ' + finalName;
      }

      const finalRank = rank || emailRole?.rank || 'Professeur Apprenti';
      const finalRole = role || emailRole?.role || 'Aucune';
      const finalAvatar = emailRole?.avatar || '🎓';

      if (password) {
        const passwordResult = await this.changePassword(password);
        if (!passwordResult.ok) throw new Error(passwordResult.error || 'Erreur de changement de mot de passe.');
      }

      const { data, error } = await window.supabaseClient.from('professors').insert([
        { email: normalizedEmail, name: finalName, rank: finalRank, role: finalRole, house, avatar: finalAvatar }
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

  async changePassword(newPassword) {
    try {
      if (!newPassword || newPassword.length < 6) {
        return { ok: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' };
      }
      const { data, error } = await window.supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { ok: true, data };
    } catch (err) {
      console.error('Erreur changePassword:', err);
      return { ok: false, error: err.message || 'Erreur lors du changement de mot de passe.' };
    }
  },

  async setupClubProfile(email, name, rank = null, role = null, house = null, password = null) {
    try {
      const normalizedEmail = this.normalizeMysteriaId(email);
      const emailRole = this.getEmailRoleFromAddress(normalizedEmail);
      const finalName = name.trim();
      const finalRank = rank || emailRole?.rank || 'Membre de club';
      const finalRole = role || emailRole?.role || 'Club';
      const finalAvatar = emailRole?.avatar || '🎭';

      if (password) {
        const passwordResult = await this.changePassword(password);
        if (!passwordResult.ok) throw new Error(passwordResult.error || 'Erreur de changement de mot de passe.');
      }
      // Ensure we use the authenticated user's email for the INSERT so RLS (jwt.claims.email) matches
      const { data: authData } = await window.supabaseClient.auth.getUser();
      if (!authData?.user) return { ok: false, error: 'Session expirée, veuillez vous reconnecter.' };
      const insertEmail = authData.user.email || normalizedEmail;

      const { data, error } = await window.supabaseClient.from('club_members').insert([
        { email: insertEmail, name: finalName, rank: finalRank, role: finalRole, house, avatar: finalAvatar }
      ]).select().single();
      if (error) throw error;

      const userSession = {
        id: authData.user.id,
        email: insertEmail,
        name: data.name,
        rank: data.rank,
        role: data.role,
        house: data.house,
        avatar: data.avatar,
        loggedAt: new Date().toISOString()
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(userSession));
      return { ok: true, member: data, user: userSession };
    } catch (err) {
      console.error('Erreur setupClubProfile:', err);
      return { ok: false, error: 'Erreur lors de la création : ' + (err.message || JSON.stringify(err)) };
    }
  },

  getEmailRoleFromAddress(email) {
    if (!email || typeof email !== 'string') return null;
    const normalized = this.normalizeMysteriaId(email);
    if (normalized.endsWith('.staff') || normalized.includes('mysteria.staff')) {
      return { role: 'staff', rank: 'Staff', defaultName: 'Membre Staff', avatar: '🛡️' };
    }
    if (normalized.endsWith('.prof') || normalized.includes('mysteria.prof')) {
      return { role: 'prof', rank: 'Professeur', defaultName: 'Professeur', avatar: '🎓' };
    }
    if (normalized.endsWith('.club') || normalized.includes('mysteria.club')) {
      return { role: 'club', rank: 'Membre de club', defaultName: 'Membre de club', avatar: '🎭' };
    }
    return null;
  },

  normalizeRoleValue(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  },

  getRoleSignals(user) {
    return {
      role: this.normalizeRoleValue(user?.role),
      rank: this.normalizeRoleValue(user?.rank)
    };
  },

  hasRoleSignal(user, candidates) {
    const { role, rank } = this.getRoleSignals(user);
    const normalizedCandidates = (Array.isArray(candidates) ? candidates : [candidates])
      .map(value => this.normalizeRoleValue(value));

    return normalizedCandidates.some(candidate => {
      if (!candidate) return false;
      return role === candidate || rank === candidate || role.includes(candidate) || rank.includes(candidate);
    });
  },

  isClubContextUser(user) {
    const { role, rank } = this.getRoleSignals(user);
    return this.hasRoleSignal(user, ['club', 'club_member', 'club_manager', 'gerant de club', 'gerant d\'un club', 'gérant de club', 'gérant d\'un club']) || role.includes('club') || rank.includes('club');
  },

  isClubManagerUser(user) {
    return this.hasRoleSignal(user, ['club_manager', 'gerant de club', 'gerant d\'un club', 'gérant de club', 'gérant d\'un club']);
  },

  canAccessClubConfiguration(user) {
    return this.isClubManagerUser(user) || this.hasRoleSignal(user, ['prof_manager', 'gp', 'directeur', 'co_directeur']);
  },

  isProfessorContextUser(user) {
    const { role, rank } = this.getRoleSignals(user);
    return role.includes('prof') || rank.includes('professeur') || role === 'staff' || rank.includes('staff') || this.hasRoleSignal(user, ['prof_manager', 'gp', 'directeur', 'co_directeur']);
  },

  async isDiscordLinked(email) {
    try {
      const { data } = await window.supabaseClient
        .from('user_discord_links')
        .select('discord_id')
        .eq('email', email)
        .maybeSingle();
      return !!data?.discord_id;
    } catch (err) {
      console.warn('Erreur vérification Discord:', err);
      return false;
    }
  },

  hasPermission(action) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const rank = (user.rank || '').toString();
    const role = (user.role || '').toString();
    const isHighRank = rank.includes('Grand Professeur') || rank.includes('Directeur') || role.includes('Directeur');
    const isWriter = rank.includes('Rédacteur') || role.includes('Rédacteur');
    const isProfessor = role === 'prof' || rank.toLowerCase().includes('professeur');
    const isStaff = role === 'staff';

    if (action === 'manage_roles') {
      return isHighRank;
    }
    
    if (action === 'create_content') {
      return isHighRank || isWriter || isProfessor || isStaff;
    }

    if (action === 'club_access') {
      const isClubRole = ['club', 'prof', 'staff'].some(key => role.toLowerCase().includes(key) || rank.toLowerCase().includes(key));
      const isProfessor = rank.toLowerCase().includes('professeur');
      return isClubRole || isProfessor || isHighRank;
    }

    if (action === 'manage_club_roles') {
      const isClubManager = role.toLowerCase().includes('gérant de club') || rank.toLowerCase().includes('gérant de club') || role.toLowerCase().includes('gérant club') || rank.toLowerCase().includes('gérant club');
      return isClubManager || isHighRank;
    }

    if (action === 'staff_access') {
      return isStaff || isHighRank;
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
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      if (!user || typeof user !== 'object') throw new Error('Invalid auth session');
      return user;
    } catch (err) {
      console.warn('Session de connexion invalide détectée, suppression du localStorage :', err);
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = '../index.html';
      return null;
    }
    return user;
  },

  async checkSessionCode(code) {
    try {
      const { data, error } = await window.supabaseClient
        .from('session_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, joinedAt: new Date().toISOString() }));
        return { ok: true, session: data };
      }
      
      return { ok: false, error: 'Code de session invalide.' };
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
