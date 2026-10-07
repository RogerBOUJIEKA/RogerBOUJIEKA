import { Inject, Injectable } from '@nestjs/common';
import { CHARTER_VERSION, PACKS, type UserRole } from '@kle/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { AuditService } from '../common/audit.service.js';
import { Clock } from '../common/clock.js';
import { badRequest, conflict, notFound } from '../common/errors.js';
import { DB, type Database } from '../db/db.module.js';
import {
  alerts,
  ambassadors,
  devices,
  kycVerifications,
  listings,
  ownershipProofs,
  successFees,
  tenancies,
  users,
} from '../db/schema.js';
import { PacksService } from '../packs/packs.service.js';
import { ObjectStorage } from '../storage/storage.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly packs: PacksService,
    private readonly clock: Clock,
    private readonly audit: AuditService,
    private readonly storage: ObjectStorage,
  ) {}

  async me(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw notFound();
    const pack = await this.packs.getActivePack(userId);
    const fees = await this.db
      .select({ id: successFees.id, amount: successFees.amount, dueAt: successFees.dueAt, status: successFees.status })
      .from(successFees)
      .where(and(eq(successFees.payerId, userId), inArray(successFees.status, ['pending', 'overdue'])));
    const [paidTenancy] = await this.db
      .select({ id: tenancies.id })
      .from(tenancies)
      .where(and(eq(tenancies.tenantId, userId), eq(tenancies.status, 'active')))
      .limit(1);
    const badges = [
      ...(user.kycStatus === 'approved' ? ['verified'] : []),
      ...(paidTenancy ? ['tenant_in_good_standing'] : []),
    ];
    return {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      roles: user.roles,
      staffRole: user.staffRole,
      status: user.status,
      statusReason: user.statusReason,
      suspendedUntil: user.suspendedUntil,
      kycStatus: user.kycStatus,
      badges,
      referralCode: user.referralCode,
      bonusDaysCredit: user.bonusDaysCredit,
      preferences: {
        cityId: user.preferredCityId,
        budgetMax: user.budgetMax,
        districtIds: user.preferredDistrictIds,
      },
      onboarded: !!user.charterAcceptedAt,
      activePack: pack && {
        id: pack.id,
        tier: pack.tier,
        label: PACKS[pack.tier].label,
        endsAt: pack.endsAt,
        visitRequestsLeft: pack.visitRequestsTotal - pack.visitRequestsUsed,
      },
      unpaidSuccessFees: fees,
      createdAt: user.createdAt,
    };
  }

  /** Fin de l'inscription : nom, rôles, codes, charte et consentement explicites. */
  async onboard(
    user: AuthUser,
    input: {
      fullName: string;
      roles: UserRole[];
      ambassadorCode?: string;
      referralCode?: string;
    },
  ) {
    const now = this.clock.now();
    const [current] = await this.db.select().from(users).where(eq(users.id, user.id));
    let ambassadorId = current!.ambassadorId;
    if (input.ambassadorCode && !ambassadorId) {
      const [amb] = await this.db
        .select({ id: ambassadors.id, userId: ambassadors.userId })
        .from(ambassadors)
        .where(and(eq(ambassadors.code, input.ambassadorCode), eq(ambassadors.active, true)));
      if (!amb || amb.userId === user.id) throw badRequest('invalid_ambassador_code', 'Code ambassadeur inconnu.');
      ambassadorId = amb.id;
    }
    let referredById = current!.referredById;
    if (input.referralCode && !referredById) {
      const [referrer] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.referralCode, input.referralCode));
      if (!referrer || referrer.id === user.id) throw badRequest('invalid_referral_code', 'Code de parrainage inconnu.');
      referredById = referrer.id;
    }
    await this.db
      .update(users)
      .set({
        fullName: current!.kycStatus === 'approved' ? current!.fullName : input.fullName,
        roles: [...new Set([...current!.roles, ...input.roles])],
        ambassadorId,
        referredById,
        charterVersion: CHARTER_VERSION,
        charterAcceptedAt: now,
        privacyAcceptedAt: now,
      })
      .where(eq(users.id, user.id));
    return this.me(user.id);
  }

  async updatePreferences(
    userId: string,
    input: { cityId?: string; budgetMax?: number | null; districtIds?: string[]; roles?: UserRole[] },
  ) {
    await this.db
      .update(users)
      .set({
        ...(input.cityId !== undefined ? { preferredCityId: input.cityId } : {}),
        ...(input.budgetMax !== undefined ? { budgetMax: input.budgetMax } : {}),
        ...(input.districtIds !== undefined ? { preferredDistrictIds: input.districtIds } : {}),
        ...(input.roles !== undefined ? { roles: input.roles } : {}),
      })
      .where(eq(users.id, userId));
    return this.me(userId);
  }

  /**
   * Droit à la suppression (loi n° 2024/017) : compte anonymisé, pièces et preuves effacées.
   * Les empreintes de bannissement et les frais déjà facturés sont conservés.
   */
  async deleteAccount(user: AuthUser) {
    const [unpaid] = await this.db
      .select({ id: successFees.id })
      .from(successFees)
      .where(and(eq(successFees.payerId, user.id), inArray(successFees.status, ['pending', 'overdue'])))
      .limit(1);
    if (unpaid) throw conflict('unpaid_fees', 'Règle tes frais de réussite avant de supprimer ton compte.');

    const now = this.clock.now();
    const kyc = await this.db.select().from(kycVerifications).where(eq(kycVerifications.userId, user.id));
    const proofs = await this.db.select().from(ownershipProofs).where(eq(ownershipProofs.userId, user.id));
    const keys = [
      ...kyc.flatMap((k) => [k.documentFrontKey, k.documentBackKey, k.selfieKey]),
      ...proofs.flatMap((p) => p.fileKeys),
    ].filter((k): k is string => !!k);

    await this.db.transaction(async (tx) => {
      await tx.delete(kycVerifications).where(eq(kycVerifications.userId, user.id));
      await tx.delete(ownershipProofs).where(eq(ownershipProofs.userId, user.id));
      await tx
        .update(listings)
        .set({ status: 'removed', updatedAt: now })
        .where(and(eq(listings.publisherId, user.id), inArray(listings.status, ['draft', 'pending_review', 'published', 'hidden'])));
      await tx.update(alerts).set({ active: false }).where(eq(alerts.userId, user.id));
      await tx.update(devices).set({ revokedAt: now }).where(and(eq(devices.userId, user.id), isNull(devices.revokedAt)));
      await tx
        .update(users)
        .set({
          phone: `deleted:${user.id}`,
          fullName: null,
          verifiedPhotoKey: null,
          totpSecret: null,
          preferredDistrictIds: [],
          deletedAt: now,
        })
        .where(eq(users.id, user.id));
      await this.audit.log({ actorId: user.id, action: 'account.deleted', targetType: 'user', targetId: user.id }, tx);
    });
    await Promise.all(keys.map((key) => this.storage.delete('private', key).catch(() => undefined)));
    return { deleted: true };
  }
}
