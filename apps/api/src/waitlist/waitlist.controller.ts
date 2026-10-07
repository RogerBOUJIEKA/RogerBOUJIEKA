import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PHASE0_GOALS, waitlistSignupSchema, type WaitlistSignup } from '@kle/shared';
import { count } from 'drizzle-orm';
import { Public } from '../auth/auth.decorators.js';
import { Clock } from '../common/clock.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Database } from '../db/db.module.js';
import { waitlistEntries } from '../db/schema.js';

/**
 * Phase 0 — page d'attente : chercheurs, bailleurs et sortants laissent leur numéro et
 * répondent à quelques questions. Objectif : 300 inscrits et 50 bailleurs prêts à publier.
 */
@Public()
@Controller('waitlist')
export class WaitlistController {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(200)
  async join(@Body(new ZodPipe(waitlistSignupSchema)) body: WaitlistSignup) {
    const now = this.clock.now();
    const { consent: _consent, ...entry } = body;
    await this.db
      .insert(waitlistEntries)
      .values({ ...entry, consentAt: now, createdAt: now })
      .onConflictDoUpdate({
        target: [waitlistEntries.phone, waitlistEntries.role],
        set: {
          fullName: entry.fullName,
          whatsapp: entry.whatsapp,
          city: entry.city,
          district: entry.district ?? null,
          budgetMax: entry.budgetMax ?? null,
          survey: entry.survey ?? null,
          consentAt: now,
        },
      });
    const [total] = await this.db.select({ n: count() }).from(waitlistEntries);
    return { ok: true, position: total?.n ?? 0 };
  }

  @Get('stats')
  async stats() {
    const rows = await this.db
      .select({ role: waitlistEntries.role, n: count() })
      .from(waitlistEntries)
      .groupBy(waitlistEntries.role);
    const byRole = Object.fromEntries(rows.map((r) => [r.role, r.n])) as Record<string, number>;
    const total = rows.reduce((sum, r) => sum + r.n, 0);
    return {
      total,
      byRole: { seeker: byRole.seeker ?? 0, landlord: byRole.landlord ?? 0, outgoing_tenant: byRole.outgoing_tenant ?? 0 },
      goals: PHASE0_GOALS,
    };
  }
}
