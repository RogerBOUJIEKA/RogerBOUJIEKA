import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  createVisitRequestSchema,
  respondVisitSchema,
  validateVisitSchema,
  visitOutcomeSchema,
} from '@kle/shared';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { VisitsService } from './visits.service.js';

const listSchema = z.object({ as: z.enum(['seeker', 'landlord']).default('seeker') });
const validateSchema = validateVisitSchema.extend({ samePerson: z.boolean() });

@Controller('visit-requests')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createVisitRequestSchema)) body: z.output<typeof createVisitRequestSchema>,
  ) {
    return this.visits.create(user, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query(new ZodPipe(listSchema)) query: z.output<typeof listSchema>) {
    return this.visits.list(user, query.as);
  }

  /** Le bailleur scanne le QR code présenté par le visiteur. */
  @Post('scan')
  @HttpCode(200)
  scan(@CurrentUser() user: AuthUser, @Body(new ZodPipe(validateVisitSchema)) body: z.output<typeof validateVisitSchema>) {
    return this.visits.scan(user, body.qrToken);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.visits.get(user, id);
  }

  @Post(':id/respond')
  @HttpCode(200)
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(respondVisitSchema)) body: z.output<typeof respondVisitSchema>,
  ) {
    return this.visits.respond(user, id, body);
  }

  @Get(':id/qr')
  qr(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.visits.qrCode(user, id);
  }

  @Post(':id/validate')
  @HttpCode(200)
  validate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(validateSchema)) body: z.output<typeof validateSchema>,
  ) {
    return this.visits.validate(user, id, body);
  }

  @Post(':id/outcome')
  @HttpCode(200)
  outcome(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(visitOutcomeSchema)) body: z.output<typeof visitOutcomeSchema>,
  ) {
    return this.visits.recordOutcome(user, id, body.outcome);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.visits.cancel(user, id);
  }
}
