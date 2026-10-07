import { Body, Controller, Inject, Post } from '@nestjs/common';
import { createReviewSchema } from '@kle/shared';
import { and, eq, or } from 'drizzle-orm';
import type { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { Clock } from '../common/clock.js';
import { conflict, forbidden, notFound } from '../common/errors.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Database } from '../db/db.module.js';
import { reviews, visitRequests } from '../db/schema.js';

/** Un avis n'est possible qu'après un contact enregistré, ce qui bloque les faux avis. */
@Controller('reviews')
export class ReviewsController {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createReviewSchema)) body: z.output<typeof createReviewSchema>,
  ) {
    const [visit] = await this.db
      .select()
      .from(visitRequests)
      .where(
        and(
          eq(visitRequests.id, body.visitRequestId),
          or(eq(visitRequests.seekerId, user.id), eq(visitRequests.landlordId, user.id)),
        ),
      );
    if (!visit) throw notFound('Contact introuvable.');
    if (!(['accepted', 'validated'] as string[]).includes(visit.status)) {
      throw forbidden('no_contact', 'Tu pourras donner ton avis après un contact accepté.');
    }
    const subjectId = visit.seekerId === user.id ? visit.landlordId : visit.seekerId;
    const [created] = await this.db
      .insert(reviews)
      .values({
        visitRequestId: visit.id,
        authorId: user.id,
        subjectId,
        rating: body.rating,
        comment: body.comment,
        createdAt: this.clock.now(),
      })
      .onConflictDoNothing()
      .returning();
    if (!created) throw conflict('already_reviewed', 'Tu as déjà donné ton avis sur ce contact.');
    return created;
  }
}
