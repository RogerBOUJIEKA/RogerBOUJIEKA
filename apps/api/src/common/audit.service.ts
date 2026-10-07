import { Inject, Injectable } from '@nestjs/common';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { auditLogs } from '../db/schema.js';

/** Journal d'audit des actions sensibles (décisions de l'équipe, consultation des pièces…). */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async log(
    entry: {
      actorId: string | null;
      action: string;
      targetType?: string;
      targetId?: string;
      metadata?: Record<string, unknown>;
      ip?: string;
    },
    tx: Tx = this.db,
  ): Promise<void> {
    await tx.insert(auditLogs).values(entry);
  }
}
