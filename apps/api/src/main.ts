import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { loadConfig } from './config.js';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule.forRoot(config), { rawBody: true });
  configureApp(app, config);
  await app.listen(config.PORT);
  Logger.log(`API Klé prête sur ${config.PUBLIC_API_URL}`, 'Bootstrap');
}

void bootstrap();
