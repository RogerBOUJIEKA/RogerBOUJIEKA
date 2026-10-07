import { Inject, Injectable } from '@nestjs/common';
import {
  FAKE_LISTING_GUARANTEE_DAYS,
  REPORT_REASON_TO_INFRACTION,
  CHARTER_SANCTIONS,
  addDays,
  sanctionFor,
  staffCan,
  type CreateReportInput,
  type Infraction,
} from '@kle/shared';
import { and, count, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { AuditService } from '../common/audit.service.js';
import { Clock } from '../common/clock.js';
import { badRequest, conflict, forbidden, notFound } from '../common/errors.js';
import { CONFIG, type AppConfig } from '../config.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import {
  bannedIdentities,
  kycVerifications,
  listings,
  reports,
  sanctions,
  users,
  visitRequests,
} from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PacksService } from '../packs/packs.service.js';
import { identityHash } from '../users/identity.js';

export interface SanctionDecision {
  userId: string;
  infraction: Infraction;
  listingId?: string | null;
  reportId?: string;
  note?: string;
}

/**
 * Signalements : un bouton sur chaque annonce et chaque profil. Un modérateur traite chaque
 * signalement ; les sanctions sont fixées par la charte.
 */
@Injectable()
export class ReportsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly packs: PacksService,
  ) {}

  async create(user: AuthUser, input: CreateReportInput) {
    let targetUserId = input.targetId;
    let targetListingId: string | null = null;
    if (input.targetType === 'listing') {
      const [listing] = await this.db
        .select({ id: listings.id, publisherId: listings.publisherId })
        .from(listings)
        .where(eq(listings.id, input.targetId));
      if (!listing) throw notFound('Annonce introuvable.');
      targetUserId = listing.publisherId;
      targetListingId = listing.id;
    } else {
      const [target] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, input.targetId));
      if (!target) throw notFound('Profil introuvable.');
    }
    if (targetUserId === user.id) throw badRequest('self_report', 'Tu ne peux pas te signaler toi-même.');
    const [open] = await this.db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, user.id),
          eq(reports.targetUserId, targetUserId),
          eq(reports.status, 'open'),
          targetListingId ? eq(reports.targetListingId, targetListingId) : isNull(reports.targetListingId),
        ),
      );
    if (open) throw conflict('already_reported', 'Ton signalement est déjà en cours de traitement.');
    const [report] = await this.db
      .insert(reports)
      .values({
        reporterId: user.id,
        targetType: input.targetType,
        targetListingId,
        targetUserId,
        reason: input.reason,
        details: input.details,
        createdAt: this.clock.now(),
      })
      .returning();
    return { id: report!.id, status: report!.status, message: 'Merci. Un modérateur traite ton signalement sous 48 h.' };
  }

  /** Décision du modérateur : classer, ou appliquer la sanction prévue par la charte. */
  async decide(
    staff: AuthUser,
    reportId: string,
    input: { action: 'dismiss' } | { action: 'sanction'; infraction?: Infraction; note?: string },
  ) {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, reportId));
    if (!report) throw notFound('Signalement introuvable.');
    if (report.status !== 'open') throw conflict('already_decided', 'Ce signalement est déjà traité.');
    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      if (input.action === 'dismiss') {
        await tx
          .update(reports)
          .set({ status: 'dismissed', moderatorId: staff.id, resolvedAt: now })
          .where(eq(reports.id, reportId));
        await this.audit.log({ actorId: staff.id, action: 'report.dismissed', targetType: 'report', targetId: reportId }, tx);
        return { status: 'dismissed' };
      }
      const infraction = input.infraction ?? REPORT_REASON_TO_INFRACTION[report.reason];
      const sanction = await this.applySanction(
        staff,
        { userId: report.targetUserId, infraction, listingId: report.targetListingId, reportId, note: input.note },
        tx,
      );
      await tx
        .update(reports)
        .set({ status: 'resolved', infraction, decisionNote: input.note, moderatorId: staff.id, resolvedAt: now })
        .where(eq(reports.id, reportId));
      await this.notifications.notify(
        {
          userId: report.reporterId,
          kind: 'report_resolved',
          title: 'Signalement traité',
          body: 'Merci : ton signalement a conduit à une sanction. Klé reste sûr grâce à toi.',
        },
        tx,
      );
      return { status: 'resolved', sanction };
    });
  }

  /**
   * Applique l'étape suivante de l'échelle de la charte. Suspendre et bannir sont réservés
   * au superviseur. Un compte banni l'est par numéro et par pièce d'identité.
   */
  async applySanction(staff: AuthUser, decision: SanctionDecision, tx: Tx) {
    const now = this.clock.now();
    const [previous] = await tx
      .select({ n: count() })
      .from(sanctions)
      .where(and(eq(sanctions.userId, decision.userId), eq(sanctions.infraction, decision.infraction)));
    const step = sanctionFor(decision.infraction, previous?.n ?? 0);
    const severe = ['suspension', 'permanent_ban', 'fees_due_and_suspension'].includes(step.kind);
    if (severe && !staffCan(staff.staffRole, 'supervisor')) {
      throw forbidden('supervisor_required', 'Un superviseur doit valider une suspension ou un bannissement.');
    }
    const endsAt = step.days ? addDays(now, step.days) : null;
    const [sanction] = await tx
      .insert(sanctions)
      .values({
        userId: decision.userId,
        listingId: decision.listingId ?? null,
        reportId: decision.reportId,
        infraction: decision.infraction,
        kind: step.kind,
        endsAt,
        authoritiesOnRequest: step.authoritiesOnRequest ?? false,
        note: decision.note,
        decidedById: staff.id,
        createdAt: now,
      })
      .returning();

    const label = CHARTER_SANCTIONS[decision.infraction].label;
    switch (step.kind) {
      case 'warning':
        await this.notifications.notify(
          { userId: decision.userId, kind: 'sanction_warning', title: 'Avertissement', body: `${label}. Merci de respecter la charte Klé.` },
          tx,
        );
        break;
      case 'listing_hidden':
        if (decision.listingId) {
          await tx
            .update(listings)
            .set({ status: 'hidden', hiddenReason: 'sanction', updatedAt: now })
            .where(eq(listings.id, decision.listingId));
        }
        break;
      case 'suspension':
      case 'fees_due_and_suspension':
        await tx
          .update(users)
          .set({ status: 'suspended', statusReason: decision.infraction, suspendedUntil: endsAt })
          .where(and(eq(users.id, decision.userId), ne(users.status, 'banned')));
        break;
      case 'blocked_until_paid':
        await tx
          .update(users)
          .set({ status: 'blocked_unpaid', statusReason: decision.infraction })
          .where(and(eq(users.id, decision.userId), eq(users.status, 'active')));
        break;
      case 'permanent_ban':
        await this.ban(decision.userId, sanction!.id, decision.infraction, tx);
        break;
    }

    // Garantie Klé : si une annonce vérifiée se révèle fausse, le pack des chercheurs qui
    // l'ont contactée est prolongé de 30 jours.
    if (decision.infraction === 'fake_listing' && decision.listingId) {
      const seekers = await tx
        .selectDistinct({ seekerId: visitRequests.seekerId })
        .from(visitRequests)
        .where(eq(visitRequests.listingId, decision.listingId));
      for (const { seekerId } of seekers) {
        await this.packs.grantDays(seekerId, FAKE_LISTING_GUARANTEE_DAYS, tx);
        await this.notifications.notify(
          {
            userId: seekerId,
            kind: 'guarantee',
            title: 'Garantie Klé',
            body: `Une annonce que tu as contactée était fausse : ${FAKE_LISTING_GUARANTEE_DAYS} jours offerts sur ton pack.`,
          },
          tx,
        );
      }
    }
    await this.audit.log(
      {
        actorId: staff.id,
        action: `sanction.${step.kind}`,
        targetType: 'user',
        targetId: decision.userId,
        metadata: { infraction: decision.infraction, sanctionId: sanction!.id, reportId: decision.reportId },
      },
      tx,
    );
    return sanction!;
  }

  private async ban(userId: string, sanctionId: string, reason: string, tx: Tx) {
    const now = this.clock.now();
    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    if (!user) return;
    await tx.update(users).set({ status: 'banned', statusReason: reason }).where(eq(users.id, userId));
    await tx
      .update(listings)
      .set({ status: 'hidden', hiddenReason: 'sanction', updatedAt: now })
      .where(and(eq(listings.publisherId, userId), inArray(listings.status, ['published', 'pending_review', 'draft'])));
    const identities: Array<{ kind: 'phone' | 'id_document'; value: string }> = [{ kind: 'phone', value: user.phone }];
    const docs = await tx
      .select({ number: kycVerifications.documentNumber })
      .from(kycVerifications)
      .where(and(eq(kycVerifications.userId, userId), eq(kycVerifications.status, 'approved')))
      .orderBy(desc(kycVerifications.createdAt));
    for (const doc of docs) if (doc.number) identities.push({ kind: 'id_document', value: doc.number });
    for (const identity of identities) {
      await tx
        .insert(bannedIdentities)
        .values({ kind: identity.kind, valueHash: identityHash(this.config.APP_SECRET, identity.kind, identity.value), sanctionId })
        .onConflictDoNothing();
    }
  }
}
