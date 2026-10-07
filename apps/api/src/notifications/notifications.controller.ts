import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { NotificationsService } from './notifications.service.js';

const markReadSchema = z.object({ ids: z.array(z.uuid()).max(200) });

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id);
  }

  @Post('read')
  async markRead(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(markReadSchema)) body: z.infer<typeof markReadSchema>,
  ) {
    await this.notifications.markRead(user.id, body.ids);
    return { ok: true };
  }
}
