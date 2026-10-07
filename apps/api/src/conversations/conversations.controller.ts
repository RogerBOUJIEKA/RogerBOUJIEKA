import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { sendMessageSchema } from '@kle/shared';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ConversationsService } from './conversations.service.js';

const callSchema = z.object({ durationSeconds: z.number().int().min(0).max(4 * 3600) });

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.conversations.list(user);
  }

  @Get(':id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.conversations.messages(user, id);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(sendMessageSchema)) body: z.output<typeof sendMessageSchema>,
  ) {
    return this.conversations.send(user, id, body.body);
  }

  @Post(':id/calls')
  logCall(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(callSchema)) body: z.output<typeof callSchema>,
  ) {
    return this.conversations.logCall(user, id, body.durationSeconds);
  }
}
