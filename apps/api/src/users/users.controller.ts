import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { USER_ROLES, completeProfileSchema } from '@kle/shared';
import { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ProfilesService } from './profiles.service.js';
import { UsersService } from './users.service.js';

const preferencesSchema = z.object({
  cityId: z.uuid().optional(),
  budgetMax: z.number().int().min(0).nullable().optional(),
  districtIds: z.array(z.uuid()).max(10).optional(),
  roles: z.array(z.enum(USER_ROLES)).min(1).optional(),
});

@Controller()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly profiles: ProfilesService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Post('me/onboarding')
  onboard(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(completeProfileSchema)) body: z.output<typeof completeProfileSchema>,
  ) {
    return this.users.onboard(user, body);
  }

  @Patch('me')
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(preferencesSchema)) body: z.output<typeof preferencesSchema>,
  ) {
    return this.users.updatePreferences(user.id, body);
  }

  @Delete('me')
  remove(@CurrentUser() user: AuthUser) {
    return this.users.deleteAccount(user);
  }

  @Public()
  @Get('users/:id')
  profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.publicProfile(id);
  }
}
