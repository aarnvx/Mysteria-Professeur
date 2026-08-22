/**
 * dashboardRouter.js - Routeur pour les deux dashboards
 * 
 * CATÉGORIE 1 - Professeurs → dashboard.html
 * CATÉGORIE 2 - Membres de club → club_dashboard.html
 * SPÉCIAL    - Prof gestionnaire → Accès aux DEUX
 */

const DashboardRouter = {
  /**
   * Détermine quel dashboard l'utilisateur doit voir
   * @param {Object} user - L'utilisateur connecté
   * @returns {Object} { dashboard: 'professor' | 'club' | 'both', redirectUrl: string }
   */
  getDashboardForUser(user) {
    if (!user) {
      return { dashboard: 'none', redirectUrl: '../index.html' };
    }

    // Récupérer le rôle réel
    const userRole = Auth.getEmailRoleFromAddress(user.email);
    
    // Cas 1 : Professeur simple
    if (userRole?.role === 'prof') {
      return {
        dashboard: 'professor',
        redirectUrl: './dashboard.html',
        description: '📚 Dashboard Professeur'
      };
    }

    // Cas 2 : Membre de club simple
    if (userRole?.role === 'club') {
      return {
        dashboard: 'club',
        redirectUrl: './club_dashboard.html',
        description: '🎭 Dashboard Club'
      };
    }

    // Cas 3 : Professeur gestionnaire de club
    // ⚠️ À implémenter : vérifier dans la table si ce prof est gestionnaire
    if (userRole?.role === 'prof' && user.rank?.includes('Gérant')) {
      return {
        dashboard: 'both',
        redirectUrl: './dashboard.html',  // Commencer par le dashboard prof
        description: '👑 Dashboard Multi-Rôle (Prof + Gérant Club)',
        canAccessClub: true
      };
    }

    // Par défaut
    return {
      dashboard: 'club',
      redirectUrl: './club_dashboard.html',
      description: '🎭 Dashboard Club'
    };
  },

  /**
   * Redirige l'utilisateur vers le bon dashboard au login
   */
  redirectToDashboard(user) {
    const route = this.getDashboardForUser(user);
    if (route.redirectUrl) {
      window.location.href = route.redirectUrl;
    }
  },

  /**
   * Affiche le choix des dashboards si l'utilisateur a les deux rôles
   */
  showDashboardSelector(user) {
    const route = this.getDashboardForUser(user);
    
    if (route.dashboard !== 'both') {
      this.redirectToDashboard(user);
      return;
    }

    // Afficher une page de sélection
    const selector = document.getElementById('dashboard-selector');
    if (selector) {
      selector.innerHTML = `
        <div class="dashboard-choice">
          <h2>Choisissez votre espace de travail</h2>
          <button class="btn btn-primary" onclick="window.location.href='./dashboard.html'">
            📚 Dashboard Professeur
          </button>
          <button class="btn btn-secondary" onclick="window.location.href='./club_dashboard.html'">
            🎭 Dashboard Club (Gestion)
          </button>
        </div>
      `;
    }
  }
};
