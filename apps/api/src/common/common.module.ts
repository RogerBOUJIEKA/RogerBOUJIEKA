import { BullModule } from '@nestjs/bullmq';
import { Global, Module, type DynamicModule, type Provider } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CONFIG, type AppConfig } from '../config.js';
import { LiveMessageSender, LogMessageSender, MessageSender } from '../notifications/channels.js';
import { NotificationsController } from '../notifications/notifications.controller.js';
import { NotificationsProcessor } from '../notifications/notifications.processor.js';
import {
  NOTIFICATIONS_QUEUE,
  NotificationsService,
} from '../notifications/notifications.service.js';
import { StorageController } from '../storage/storage.controller.js';
import { LocalStorage, ObjectStorage, S3Storage } from '../storage/storage.js';
import { CloudflareStreamProvider, LocalVideoProvider, VideoProvider } from '../storage/video.js';
import { AuditService } from './audit.service.js';
import { Clock } from './clock.js';

/** Services transverses : horloge, audit, notifications, stockage, vidéo. */
@Global()
@Module({})
export class CommonModule {
  static forRoot(config: AppConfig): DynamicModule {
    const providers: Provider[] = [
      { provide: CONFIG, useValue: config },
      Clock,
      AuditService,
      NotificationsService,
      {
        provide: MessageSender,
        useFactory: () =>
          config.NOTIFY_DRIVER === 'live' ? new LiveMessageSender(config) : new LogMessageSender(),
      },
      {
        provide: ObjectStorage,
        useFactory: () =>
          config.STORAGE_DRIVER === 's3' ? new S3Storage(config) : new LocalStorage(config),
      },
      {
        provide: VideoProvider,
        inject: [ObjectStorage],
        useFactory: (storage: ObjectStorage) =>
          config.VIDEO_PROVIDER === 'cloudflare'
            ? new CloudflareStreamProvider(config)
            : new LocalVideoProvider(storage),
      },
    ];
    const imports: DynamicModule[] = [];
    if (config.REDIS_URL) {
      imports.push(
        // BullMQ 6 attend un client Redis déjà construit en ESM.
        BullModule.forRoot({ connection: new Redis(config.REDIS_URL, { maxRetriesPerRequest: null }) }),
        BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
      );
      providers.push(NotificationsProcessor);
    }
    return {
      module: CommonModule,
      imports,
      controllers: [NotificationsController, StorageController],
      providers,
      exports: [CONFIG, Clock, AuditService, NotificationsService, MessageSender, ObjectStorage, VideoProvider],
    };
  }
}

