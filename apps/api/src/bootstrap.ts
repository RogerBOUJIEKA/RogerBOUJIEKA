import type { INestApplication } from '@nestjs/common';
import express from 'express';
import helmet from 'helmet';
import { join, resolve } from 'node:path';
import type { AppConfig } from './config.js';

/** Réglages communs à l'API lancée et aux tests. */
export function configureApp(app: INestApplication, config: AppConfig): void {
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: false,
  });
  if (config.STORAGE_DRIVER === 'local') {
    app.use('/media', express.static(join(resolve(config.STORAGE_LOCAL_DIR), 'public'), { maxAge: '1h' }));
  }
  app.enableShutdownHooks();
}
