import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AccountStatus, StaffRole, UserRole } from '@kle/shared';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string | null;
  roles: UserRole[];
  staffRole: StaffRole | null;
  status: AccountStatus;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  deviceId: string;
  /** Double authentification validée (obligatoire pour le back-office). */
  mfa: boolean;
}

export interface JwtPayload {
  sub: string;
  did: string;
  mfa?: boolean;
}

export const IS_PUBLIC = 'kle:public';
export const STAFF_ROLE = 'kle:staff-role';

/** Route accessible sans compte ; l'utilisateur est quand même reconnu s'il envoie un jeton. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route du back-office : rôle minimal requis et double authentification. */
export const Staff = (role: StaffRole = 'moderator') => SetMetadata(STAFF_ROLE, role);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user,
);
