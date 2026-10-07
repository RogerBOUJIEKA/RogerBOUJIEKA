import { Global, Module } from '@nestjs/common';
import { CONFIG, type AppConfig } from '../config.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { FakePaymentProvider, NotchPayProvider, PaymentProvider } from './providers.js';

@Global()
@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PaymentProvider,
      inject: [CONFIG],
      useFactory: (config: AppConfig) =>
        config.PAYMENT_PROVIDER === 'notchpay' ? new NotchPayProvider(config) : new FakePaymentProvider(),
    },
  ],
  exports: [PaymentsService, PaymentProvider],
})
export class PaymentsModule {}
