import { Inject, Injectable } from '@nestjs/common';
import { formatMoney } from '@kle/shared';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { conflict, notFound } from '../common/errors.js';
import { randomCode } from '../common/crypto.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { ambassadorRewards, ambassadors, listings, ownershipProofs, users } from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/**
 * Ambassadeurs terrain : ils inscrivent des bailleurs avec leur code et touchent une prime
 * par bailleur validé avec au moins une annonce publiée.
 */
@Injectable()
export class AmbassadorsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, code?: string, bonusPerLandlord = 1_000) {
    const [user] = await this.db.select({ id: users.id, roles: users.roles }).from(users).where(eq(users.id, userId));
    if (!user) throw notFound('Compte introuvable.');
    const finalCode = (code ?? randomCode(6)).toUpperCase();
    const [created] = await this.db
      .insert(ambassadors)
      .values({ userId, code: finalCode, bonusPerLandlord })
      .onConflictDoNothing()
      .returning();
    if (!created) throw conflict('ambassador_exists', 'Ce compte ou ce code ambassadeur existe déjà.');
    if (!user.roles.includes('ambassador')) {
      await this.db.update(users).set({ roles: [...user.roles, 'ambassador'] }).where(eq(users.id, userId));
    }
    return created;
  }

  async list() {
    const rows = await this.db
      .select({
        id: ambassadors.id,
        code: ambassadors.code,
        active: ambassadors.active,
        bonusPerLandlord: ambassadors.bonusPerLandlord,
        fullName: users.fullName,
        phone: users.phone,
        landlords: sql<number>`(select count(*)::int from ${users} u where u.ambassador_id = ${ambassadors.id})`,
        rewardsDue: sql<number>`(select coalesce(sum(r.amount), 0)::int from ${ambassadorRewards} r where r.ambassador_id = ${ambassadors.id} and r.status = 'due')`,
        rewardsPaid: sql<number>`(select coalesce(sum(r.amount), 0)::int from ${ambassadorRewards} r where r.ambassador_id = ${ambassadors.id} and r.status = 'paid')`,
      })
      .from(ambassadors)
      .innerJoin(users, eq(users.id, ambassadors.userId));
    return rows;
  }

  async rewards(status?: 'due' | 'paid') {
    return this.db
      .select()
      .from(ambassadorRewards)
      .where(status ? eq(ambassadorRewards.status, status) : undefined);
  }

  async markPaid(rewardId: string, now: Date) {
    const [row] = await this.db
      .update(ambassadorRewards)
      .set({ status: 'paid', paidAt: now })
      .where(and(eq(ambassadorRewards.id, rewardId), eq(ambassadorRewards.status, 'due')))
      .returning();
    if (!row) throw notFound('Prime introuvable ou déjà payée.');
    return row;
  }

  /** Appelé quand une preuve est validée ou une annonce publiée. */
  async maybeReward(landlordId: string, tx: Tx = this.db): Promise<void> {
    const [landlord] = await tx
      .select({ ambassadorId: users.ambassadorId })
      .from(users)
      .where(eq(users.id, landlordId));
    if (!landlord?.ambassadorId) return;
    const [proof] = await tx
      .select({ id: ownershipProofs.id })
      .from(ownershipProofs)
      .where(and(eq(ownershipProofs.userId, landlordId), eq(ownershipProofs.status, 'approved')))
      .limit(1);
    const [published] = await tx
      .select({ n: count() })
      .from(listings)
      .where(and(eq(listings.publisherId, landlordId), inArray(listings.status, ['published', 'taken'])));
    if (!proof || !published?.n) return;
    const [ambassador] = await tx.select().from(ambassadors).where(eq(ambassadors.id, landlord.ambassadorId));
    if (!ambassador?.active) return;
    const [reward] = await tx
      .insert(ambassadorRewards)
      .values({ ambassadorId: ambassador.id, landlordId, amount: ambassador.bonusPerLandlord })
      .onConflictDoNothing()
      .returning();
    if (reward) {
      await this.notifications.notify(
        {
          userId: ambassador.userId,
          kind: 'ambassador_reward',
          title: 'Nouvelle prime ambassadeur',
          body: `Un bailleur inscrit avec ton code a publié sa première annonce : ${formatMoney(reward.amount)}.`,
        },
        tx,
      );
    }
  }
}
