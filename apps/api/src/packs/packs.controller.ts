import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { purchasePackSchema } from '@kle/shared';
import type { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PacksService } from './packs.service.js';

@Controller('packs')
export class PacksController {
  constructor(private readonly packs: PacksService) {}

  @Public()
  @Get()
  catalog(@Query('country') country?: string) {
    return this.packs.catalog(country?.toUpperCase() ?? 'CM');
  }

  @Get('me')
  async mine(@CurrentUser() user: AuthUser) {
    return { active: await this.packs.getActivePack(user.id), history: await this.packs.history(user.id) };
  }

  @Post('purchase')
  purchase(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(purchasePackSchema)) body: z.output<typeof purchasePackSchema>,
  ) {
    return this.packs.purchase(user, body);
  }
}
