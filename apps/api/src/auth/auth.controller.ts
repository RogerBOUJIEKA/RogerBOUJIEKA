import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { requestOtpSchema, verifyOtpSchema } from '@kle/shared';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe.js';
import { CurrentUser, Public, type AuthUser } from './auth.decorators.js';
import { AuthService } from './auth.service.js';

const mfaSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body(new ZodPipe(requestOtpSchema)) body: z.output<typeof requestOtpSchema>) {
    return this.auth.requestOtp(body.phone, body.channel);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body(new ZodPipe(verifyOtpSchema)) body: z.output<typeof verifyOtpSchema>) {
    return this.auth.verifyOtp(body);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('mfa')
  @HttpCode(200)
  verifyMfa(@CurrentUser() user: AuthUser, @Body(new ZodPipe(mfaSchema)) body: z.infer<typeof mfaSchema>) {
    return this.auth.verifyStaffMfa(user, body.code);
  }
}
