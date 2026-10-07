import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MessageSender, type OutboundMessage } from './channels.js';
import { NOTIFICATIONS_QUEUE } from './notifications.service.js';

/** Travailleur BullMQ : envoie WhatsApp, SMS et push avec reprises automatiques. */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly sender: MessageSender) {
    super();
  }

  async process(job: Job<OutboundMessage>): Promise<void> {
    await this.sender.send(job.data);
  }
}
