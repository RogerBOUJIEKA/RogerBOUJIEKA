/**
 * Modules métier. Les services transverses sont globaux pour éviter les dépendances
 * circulaires entre domaines (annonces ↔ visites ↔ locations ↔ modération).
 */
import { Global, Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller.js';
import { AdminService } from './admin/admin.service.js';
import { AlertsController } from './alerts/alerts.controller.js';
import { AlertsService } from './alerts/alerts.service.js';
import { AmbassadorsService } from './ambassadors/ambassadors.service.js';
import { ConversationsController } from './conversations/conversations.controller.js';
import { ConversationsService } from './conversations/conversations.service.js';
import { GeoController } from './geo/geo.controller.js';
import { JobsService } from './jobs/jobs.service.js';
import { KycController } from './kyc/kyc.controller.js';
import { KycService } from './kyc/kyc.service.js';
import { FeedService } from './listings/feed.service.js';
import { ListingsController } from './listings/listings.controller.js';
import { ListingsService } from './listings/listings.service.js';
import { RentalsController } from './rentals/rentals.controller.js';
import { RentalsService } from './rentals/rentals.service.js';
import { ReportsController } from './reports/reports.controller.js';
import { ReportsService } from './reports/reports.service.js';
import { ReviewsController } from './reviews/reviews.controller.js';
import { VisitsController } from './visits/visits.controller.js';
import { VisitsService } from './visits/visits.service.js';
import { WaitlistController } from './waitlist/waitlist.controller.js';

@Global()
@Module({
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

@Global()
@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AmbassadorsService],
  exports: [AlertsService, AmbassadorsService],
})
export class AlertsModule {}

@Global()
@Module({
  controllers: [ListingsController, GeoController],
  providers: [ListingsService, FeedService],
  exports: [ListingsService, FeedService],
})
export class ListingsModule {}

@Global()
@Module({
  controllers: [VisitsController, ConversationsController, ReviewsController],
  providers: [VisitsService, ConversationsService],
  exports: [VisitsService, ConversationsService],
})
export class VisitsModule {}

@Global()
@Module({
  controllers: [RentalsController, ReportsController],
  providers: [RentalsService, ReportsService],
  exports: [RentalsService, ReportsService],
})
export class RentalsModule {}

@Module({
  controllers: [AdminController, WaitlistController],
  providers: [AdminService, JobsService],
  exports: [JobsService],
})
export class OperationsModule {}
