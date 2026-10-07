import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { staffCan, type StaffRole } from '@kle/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { Request } from 'express';
import { DB, type Database } from '../db/db.module.js';
import { devices, users } from '../db/schema.js';
import { IS_PUBLIC, STAFF_ROLE, type AuthUser, type JwtPayload } from './auth.decorators.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(DB) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const staffRole = this.reflector.getAllAndOverride<StaffRole>(STAFF_ROLE, targets);
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    const user = await this.authenticate(request);
    if (user) request.user = user;

    if (isPublic && !staffRole) return true;
    if (!user) {
      throw new UnauthorizedException({ code: 'unauthenticated', message: 'Connecte-toi pour continuer.' });
    }
    if (user.status === 'banned') {
      throw new ForbiddenException({ code: 'account_banned', message: 'Ce compte a été banni.' });
    }
    if (staffRole) {
      if (!staffCan(user.staffRole, staffRole)) {
        throw new ForbiddenException({ code: 'staff_only', message: 'Accès réservé à l’équipe Klé.' });
      }
      if (!user.mfa) {
        throw new ForbiddenException({
          code: 'mfa_required',
          message: 'Valide la double authentification pour accéder au back-office.',
        });
      }
    }
    return true;
  }

  private async authenticate(request: Request): Promise<AuthUser | null> {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7));
    } catch {
      return null;
    }
    const [row] = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        fullName: users.fullName,
        roles: users.roles,
        staffRole: users.staffRole,
        status: users.status,
        kycStatus: users.kycStatus,
      })
      .from(users)
      .innerJoin(
        devices,
        and(eq(devices.userId, users.id), eq(devices.deviceId, payload.did), isNull(devices.revokedAt)),
      )
      .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
      .limit(1);
    if (!row) return null;
    return { ...row, deviceId: payload.did, mfa: payload.mfa === true };
  }
}
