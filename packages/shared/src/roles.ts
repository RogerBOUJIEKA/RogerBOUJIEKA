/**
 * Un même compte peut cumuler plusieurs rôles : un locataire peut être chercheur
 * aujourd'hui et sortant dans un an.
 */
export const USER_ROLES = [
  'seeker', // Chercheur
  'landlord', // Bailleur (propriétaire ou gérant)
  'outgoing_tenant', // Sortant
  'tenant', // Locataire en place
  'ambassador', // Ambassadeur terrain
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Rôles de l'équipe Klé dans le back-office. */
export const STAFF_ROLES = ['moderator', 'supervisor', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<UserRole | StaffRole, string> = {
  seeker: 'Chercheur',
  landlord: 'Bailleur',
  outgoing_tenant: 'Sortant',
  tenant: 'Locataire',
  ambassador: 'Ambassadeur terrain',
  moderator: 'Modérateur',
  supervisor: 'Superviseur',
  admin: 'Administrateur',
};

/**
 * Droits du back-office : le modérateur valide ou refuse ; le superviseur suspend,
 * bannit et rembourse ; l'administrateur gère les prix, les pays et les comptes de l'équipe.
 */
const STAFF_RANK: Record<StaffRole, number> = { moderator: 1, supervisor: 2, admin: 3 };

export function staffCan(role: StaffRole | null | undefined, required: StaffRole): boolean {
  if (!role) return false;
  return STAFF_RANK[role] >= STAFF_RANK[required];
}

export const ACCOUNT_STATUSES = [
  'active',
  'frozen', // Alerte de contournement : gelé jusqu'à un nouveau selfie
  'blocked_unpaid', // Frais de réussite non réglés après 30 jours
  'suspended',
  'banned',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Rôles qui exigent une preuve de propriété, de gestion ou d'occupation. */
export function roleRequiresProof(role: UserRole): boolean {
  return role === 'landlord' || role === 'outgoing_tenant';
}
