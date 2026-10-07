import { Body, Controller, Get, Post } from '@nestjs/common';
import { submitKycSchema, submitProofSchema } from '@kle/shared';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { KycService } from './kyc.service.js';

const selfieCheckSchema = z.object({ selfieKey: z.string().min(10).max(300) });

@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get()
  status(@CurrentUser() user: AuthUser) {
    return this.kyc.status(user.id);
  }

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body(new ZodPipe(submitKycSchema)) body: z.output<typeof submitKycSchema>) {
    return this.kyc.submit(user, body);
  }

  @Post('proofs')
  submitProof(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(submitProofSchema)) body: z.output<typeof submitProofSchema>,
  ) {
    return this.kyc.submitProof(user, body);
  }

  @Post('selfie-check')
  selfieCheck(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(selfieCheckSchema)) body: z.infer<typeof selfieCheckSchema>,
  ) {
    return this.kyc.selfieCheck(user, body.selfieKey);
  }
}
