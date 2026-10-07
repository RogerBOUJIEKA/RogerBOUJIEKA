import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import type { AppConfig } from './config.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import {
  AlertsModule,
  KycModule,
  ListingsModule,
  OperationsModule,
  RentalsModule,
  VisitsModule,
} from './modules.js';
import { PacksModule } from './packs/packs.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { UsersModule } from './users/users.module.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CommonModule.forRoot(config),
        DbModule,
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 120 }],
          // Les tests enchaînent des dizaines de connexions depuis la même adresse.
          skipIf: () => config.NODE_ENV === 'test',
        }),
        ...(config.JOBS_ENABLED ? [ScheduleModule.forRoot()] : []),
        AuthModule,
        PaymentsModule,
        PacksModule,
        UsersModule,
        KycModule,
        AlertsModule,
        ListingsModule,
        VisitsModule,
        RentalsModule,
        OperationsModule,
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    };
  }
}
