import { Body, Controller, Post } from '@nestjs/common';
import { createReportSchema } from '@kle/shared';
import type { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createReportSchema)) body: z.output<typeof createReportSchema>) {
    return this.reports.create(user, body);
  }
}
