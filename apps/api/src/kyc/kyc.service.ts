import { Inject, Injectable } from '@nestjs/common';
import type { SubmitKycInput, SubmitProofInput } from '@kle/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { AuditService } from '../common/audit.service.js';
import { Clock } from '../common/clock.js';
import { badRequest, conflict, forbidden } from '../common/errors.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { devices, kycVerifications, ownershipProofs, users } from '../db/schema.js';
import { ownsPrivateKey } from '../storage/storage.controller.js';

/**
 * Vérification d'identité : téléphone confirmé (OTP), pièce recto verso, selfie avec la pièce.
 * En V1, un modérateur valide chaque dossier en moins de 24 h ; en V2, un fournisseur
 * spécialisé (Smile ID ou équivalent) automatise la vérification sans tout reconstruire.
 */
@Injectable()
export class KycService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async submit(user: AuthUser, input: SubmitKycInput) {
    if (user.kycStatus === 'approved') throw conflict('already_verified', 'Ton identité est déjà vérifiée.');
    if (user.kycStatus === 'pending') {
      throw conflict('kyc_pending', 'Ton dossier est en cours de vérification (moins de 24 h).');
    }
    const keys = [input.documentFrontKey, input.documentBackKey, input.selfieKey].filter(Boolean) as string[];
    if (!keys.every((k) => ownsPrivateKey(user.id, 'kyc', k))) {
      throw badRequest('invalid_file', 'Fichier non reconnu : renvoie tes photos.');
    }
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      await tx.insert(kycVerifications).values({
        userId: user.id,
        documentType: input.documentType,
        documentFrontKey: input.documentFrontKey,
        documentBackKey: input.documentBackKey,
        selfieKey: input.selfieKey,
        declaredName: input.fullName,
        createdAt: now,
      });
      await tx
        .update(users)
        .set({ kycStatus: 'pending', fullName: input.fullName })
        .where(eq(users.id, user.id));
    });
    return this.status(user.id);
  }

  /** Une seule preuve, au choix ; vue uniquement par les modérateurs, jamais publiée. */
  async submitProof(user: AuthUser, input: SubmitProofInput) {
    if (!input.fileKeys.every((k) => ownsPrivateKey(user.id, 'proof', k))) {
      throw badRequest('invalid_file', 'Fichier non reconnu : renvoie ta preuve.');
    }
    const allowed: readonly string[] =
      input.role === 'landlord'
        ? ['utility_bill', 'property_tax_receipt', 'lease_or_rent_receipt', 'property_title', 'power_of_attorney']
        : ['lease_or_rent_receipt'];
    if (!allowed.includes(input.proofType)) {
      throw badRequest('invalid_proof_type', 'Ce justificatif ne convient pas à ce profil.');
    }
    const [pending] = await this.db
      .select({ id: ownershipProofs.id })
      .from(ownershipProofs)
      .where(
        and(
          eq(ownershipProofs.userId, user.id),
          eq(ownershipProofs.role, input.role),
          eq(ownershipProofs.status, 'pending'),
        ),
      );
    if (pending) throw conflict('proof_pending', 'Ta preuve est déjà en cours de vérification.');
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      await tx.insert(ownershipProofs).values({
        userId: user.id,
        role: input.role,
        proofType: input.proofType,
        fileKeys: input.fileKeys,
        honorDeclaredAt: now,
        createdAt: now,
      });
      if (!user.roles.includes(input.role)) {
        await tx
          .update(users)
          .set({ roles: [...user.roles, input.role] })
          .where(eq(users.id, user.id));
      }
    });
    return this.status(user.id);
  }

  /** Nouveau selfie après un changement de téléphone : le compte est dégelé, le contrôle journalisé. */
  async selfieCheck(user: AuthUser, selfieKey: string) {
    if (!ownsPrivateKey(user.id, 'selfie_check', selfieKey)) {
      throw badRequest('invalid_file', 'Fichier non reconnu : reprends ton selfie.');
    }
    const [row] = await this.db
      .select({ status: users.status, statusReason: users.statusReason })
      .from(users)
      .where(eq(users.id, user.id));
    if (row?.status !== 'frozen' || row.statusReason !== 'new_device') {
      throw forbidden('not_required', 'Aucun selfie de contrôle n’est demandé pour le moment.');
    }
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(devices)
        .set({ selfieCheckKey: selfieKey, lastSelfieCheckAt: now })
        .where(and(eq(devices.userId, user.id), eq(devices.deviceId, user.deviceId)));
      await tx.update(users).set({ status: 'active', statusReason: null }).where(eq(users.id, user.id));
      await this.audit.log(
        { actorId: user.id, action: 'device.selfie_check', targetType: 'user', targetId: user.id, metadata: { selfieKey } },
        tx,
      );
    });
    return { status: 'active' };
  }

  async status(userId: string) {
    const [user] = await this.db.select({ kycStatus: users.kycStatus }).from(users).where(eq(users.id, userId));
    const [latest] = await this.db
      .select({ status: kycVerifications.status, reason: kycVerifications.reason, createdAt: kycVerifications.createdAt })
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, userId))
      .orderBy(desc(kycVerifications.createdAt))
      .limit(1);
    const proofs = await this.db
      .select({
        role: ownershipProofs.role,
        proofType: ownershipProofs.proofType,
        status: ownershipProofs.status,
        reason: ownershipProofs.reason,
        createdAt: ownershipProofs.createdAt,
      })
      .from(ownershipProofs)
      .where(eq(ownershipProofs.userId, userId))
      .orderBy(desc(ownershipProofs.createdAt));
    return { kycStatus: user?.kycStatus ?? 'none', latest: latest ?? null, proofs };
  }

  async hasApprovedProof(userId: string, role: 'landlord' | 'outgoing_tenant', tx: Tx = this.db) {
    const [row] = await tx
      .select({ id: ownershipProofs.id })
      .from(ownershipProofs)
      .where(
        and(eq(ownershipProofs.userId, userId), eq(ownershipProofs.role, role), eq(ownershipProofs.status, 'approved')),
      )
      .limit(1);
    return !!row;
  }
}
