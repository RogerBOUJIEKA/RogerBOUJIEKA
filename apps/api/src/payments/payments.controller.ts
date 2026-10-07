import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { CONFIG, type AppConfig } from '../config.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PaymentsService } from './payments.service.js';
import { FakePaymentProvider, PaymentProvider } from './providers.js';

const simulateSchema = z.object({
  status: z.enum(['succeeded', 'failed']),
  payerName: z.string().max(120).optional(),
});

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly provider: PaymentProvider,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** L'appli interroge le statut pendant que l'utilisateur valide sur son téléphone. */
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.get(user.id, id);
  }

  /** Confirmation de l'agrégateur. */
  @Public()
  @Post('webhooks/:provider')
  @HttpCode(200)
  webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    if (provider !== this.provider.name || !req.rawBody) return { accepted: false };
    return this.payments.handleWebhook(req.rawBody, headers);
  }

  /** Développement : simule la validation du paiement sur le téléphone. */
  @Post(':id/simulate')
  @HttpCode(200)
  async simulate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(simulateSchema)) body: z.infer<typeof simulateSchema>,
  ) {
    if (this.config.NODE_ENV === 'production' || !(this.provider instanceof FakePaymentProvider)) {
      throw new ForbiddenException();
    }
    const payment = await this.payments.get(user.id, id);
    this.provider.simulate(payment.providerReference, { status: body.status, payerName: body.payerName });
    return this.payments.confirm(payment.providerReference);
  }
}
