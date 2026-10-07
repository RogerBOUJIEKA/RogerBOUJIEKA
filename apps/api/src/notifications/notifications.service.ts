import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { notifications, users } from '../db/schema.js';
import { MessageSender, type OutboundMessage } from './channels.js';

export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NotificationInput {
  userId: string;
  kind: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Canaux en plus de la notification dans l'appli. */
  external?: Array<'whatsapp' | 'sms' | 'push'>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly sender: MessageSender,
    @Optional() @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue?: Queue,
  ) {}

  /** Enregistre la notification dans l'appli puis l'envoie sur les canaux externes demandés. */
  async notify(input: NotificationInput, tx: Tx = this.db): Promise<void> {
    await tx.insert(notifications).values({
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      data: input.data,
      channels: ['in_app', ...(input.external ?? [])],
    });
    if (!input.external?.length) return;
    const [user] = await this.db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, input.userId));
    if (!user) return;
    for (const channel of input.external) {
      await this.dispatch({ channel, to: user.phone, text: `${input.title}\n${input.body}` });
    }
  }

  /** Envoi direct (codes OTP) ou via la file BullMQ quand Redis est configuré. */
  async dispatch(message: OutboundMessage, options: { immediate?: boolean } = {}): Promise<void> {
    if (this.queue && !options.immediate) {
      await this.queue.add('send', message, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      });
      return;
    }
    try {
      await this.sender.send(message);
    } catch (error) {
      this.logger.error(`Envoi ${message.channel} vers ${message.to} échoué : ${String(error)}`);
      if (options.immediate) throw error;
    }
  }

  async list(userId: string, limit = 50) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markRead(userId: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.id, ids),
          isNull(notifications.readAt),
        ),
      );
  }
}
