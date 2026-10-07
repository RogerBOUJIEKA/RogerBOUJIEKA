import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { Clock } from '../common/clock.js';
import { forbidden, notFound } from '../common/errors.js';
import { DB, type Database } from '../db/db.module.js';
import { conversations, listings, messages, users, visitRequests } from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { displayName } from '../users/profiles.service.js';

/**
 * Messages et appels passent uniquement par l'appli : le numéro du bailleur n'est jamais
 * affiché, l'abonné n'a donc rien à transmettre. Les appels (WebRTC) sont journalisés ici.
 */
@Injectable()
export class ConversationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly clock: Clock,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.db
      .select({
        id: conversations.id,
        visitRequestId: conversations.visitRequestId,
        seekerId: conversations.seekerId,
        landlordId: conversations.landlordId,
        lastMessageAt: conversations.lastMessageAt,
        visitStatus: visitRequests.status,
        listingRef: listings.ref,
        unread: sql<number>`(select count(*)::int from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${user.id} and m.read_at is null)`,
      })
      .from(conversations)
      .innerJoin(visitRequests, eq(visitRequests.id, conversations.visitRequestId))
      .innerJoin(listings, eq(listings.id, visitRequests.listingId))
      .where(or(eq(conversations.seekerId, user.id), eq(conversations.landlordId, user.id)))
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
    const otherIds = rows.map((r) => (r.seekerId === user.id ? r.landlordId : r.seekerId));
    const names = otherIds.length
      ? await this.db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, otherIds))
      : [];
    const nameBy = new Map(names.map((n) => [n.id, n.fullName]));
    return rows.map((r) => {
      const otherId = r.seekerId === user.id ? r.landlordId : r.seekerId;
      return { ...r, counterpart: { id: otherId, name: displayName(nameBy.get(otherId) ?? null) } };
    });
  }

  async messages(user: AuthUser, conversationId: string) {
    const conversation = await this.getParticipant(user.id, conversationId);
    await this.db
      .update(messages)
      .set({ readAt: this.clock.now() })
      .where(and(eq(messages.conversationId, conversation.id), ne(messages.senderId, user.id), isNull(messages.readAt)));
    // Les 200 derniers messages, dans l'ordre chronologique.
    const latest = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(200);
    return latest.reverse();
  }

  async send(user: AuthUser, conversationId: string, body: string) {
    const conversation = await this.getParticipant(user.id, conversationId);
    const [visit] = await this.db
      .select({ status: visitRequests.status })
      .from(visitRequests)
      .where(eq(visitRequests.id, conversation.visitRequestId));
    if (!visit || ['refused', 'cancelled', 'expired'].includes(visit.status)) {
      throw forbidden('conversation_closed', 'Cette conversation est fermée.');
    }
    if (user.status !== 'active') throw forbidden('account_not_active', 'Ton compte ne peut pas envoyer de message.');
    const now = this.clock.now();
    const [message] = await this.db
      .insert(messages)
      .values({ conversationId: conversation.id, senderId: user.id, body, createdAt: now })
      .returning();
    await this.db.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversation.id));
    await this.notifications.notify({
      userId: conversation.seekerId === user.id ? conversation.landlordId : conversation.seekerId,
      kind: 'message',
      title: 'Nouveau message',
      body: body.length > 80 ? `${body.slice(0, 77)}…` : body,
      data: { conversationId: conversation.id },
    });
    return message;
  }

  /** Journal d'un appel passé dans l'appli. */
  async logCall(user: AuthUser, conversationId: string, durationSeconds: number) {
    const conversation = await this.getParticipant(user.id, conversationId);
    const [message] = await this.db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderId: user.id,
        kind: 'call',
        callDurationSeconds: durationSeconds,
        createdAt: this.clock.now(),
      })
      .returning();
    return message;
  }

  private async getParticipant(userId: string, id: string) {
    const [conversation] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), or(eq(conversations.seekerId, userId), eq(conversations.landlordId, userId))));
    if (!conversation) throw notFound('Conversation introuvable.');
    return conversation;
  }
}
