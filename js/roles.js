/**
 * roles.js - Gestion des rôles et permissions
 * Définit clairement les deux catégories : PROFESSEURS et MEMBRES DE CLUB
 */

const ROLES = {
  // ============================================
  // CATÉGORIE 1 : PROFESSEURS
  // ============================================
  PROFESSOR: 'professor',
  
  // ============================================
  // CATÉGORIE 2 : MEMBRES DE CLUB
  // ============================================
  CLUB_MEMBER: 'club_member',
  
  // ============================================
  // CAS SPÉCIAL : Professeur gérant un club
  // ============================================
  PROFESSOR_CLUB_MANAGER: 'professor_club_manager'
};

const RANKS = {
  // Professeurs
  APPRENTICE_PROFESSOR: 'Professeur Apprenti',
  SENIOR_PROFESSOR: 'Professeur Senior',
  HEADMASTER: 'Directeur',
  
  // Membres de club
  CLUB_MEMBER: 'Membre de club',
  CLUB_OFFICER: 'Officier de club',
  CLUB_PRESIDENT: 'Président de club',
  
  // Gestionnaire de club
  CLUB_MANAGER: 'Gérant de club'
};

const RolePermissions = {
  /**
   * Professeur : Peut créer du contenu, gérer les cours, voir tous les tableaux de bord
   */
  [ROLES.PROFESSOR]: {
    canCreateContent: true,
    canManageCourses: true,
    canAccessDashboard: true,
    canManageClubRoles: false,  // ❌ Ne peut PAS gérer les rôles d'un club
    canAccessClubDashboard: false,  // ❌ N'a pas accès au dashboard du club (sauf s'il en est gestionnaire)
    canAccessProfessorTools: true,
    avatar: '🎓'
  },

  /**
   * Membre de club : Accès limité aux fonctionnalités du club
   */
  [ROLES.CLUB_MEMBER]: {
    canCreateContent: false,
    canManageCourses: false,
    canAccessDashboard: false,
    canManageClubRoles: false,  // ❌ Membre normal ne peut pas gérer les rôles
    canAccessClubDashboard: true,  // ✅ Accès au dashboard de SON club
    canAccessProfessorTools: false,
    avatar: '🎭'
  },

  /**
   * ⭐ CAS SPÉCIAL : Professeur qui gère un club
   * Combine les permissions des deux catégories
   */
  [ROLES.PROFESSOR_CLUB_MANAGER]: {
    canCreateContent: true,
    canManageCourses: true,
    canAccessDashboard: true,
    canManageClubRoles: true,  // ✅ PEUT gérer les rôles du club qu'il gère
    canAccessClubDashboard: true,  // ✅ PEUT accéder au dashboard du club
    canAccessProfessorTools: true,
    avatar: '👑'  // Avatar différent pour les identifier
  }
};

/**
 * Détermine le vrai rôle d'un utilisateur basé sur son profil
 * @param {Object} user - L'utilisateur connecté
 * @param {Object} clubManager - Info si c'est un gestionnaire de club (optionnel)
 * @returns {string} Le rôle réel (PROFESSOR, CLUB_MEMBER, ou PROFESSOR_CLUB_MANAGER)
 */
function getUserRealRole(user, clubManager = null) {
  // Si c'est un professeur ET gestionnaire de club
  if (user.role === 'prof' && clubManager) {
    return ROLES.PROFESSOR_CLUB_MANAGER;
  }
  
  // Si c'est un professeur simple
  if (user.role === 'prof' || user.rank?.includes('Professeur')) {
    return ROLES.PROFESSOR;
  }
  
  // Si c'est un membre de club
  if (user.role === 'club' || user.rank?.includes('Membre de club')) {
    return ROLES.CLUB_MEMBER;
  }
  
  // Par défaut
  return ROLES.CLUB_MEMBER;
}

/**
 * Vérifie si l'utilisateur a une permission spécifique
 * @param {Object} user - L'utilisateur connecté
 * @param {string} permission - La permission à vérifier
 * @param {Object} options - Options additionnelles
 * @returns {boolean}
 */
function hasPermission(user, permission, options = {}) {
  const role = getUserRealRole(user, options.clubManager);
  const permissions = RolePermissions[role];
  
  if (!permissions) return false;
  return permissions[permission] || false;
}

/**
 * Récupère l'avatar d'un rôle
 */
function getAvatarForRole(role) {
  return RolePermissions[role]?.avatar || '🎭';
}
