import { Global, Module } from '@nestjs/common';
import { PacksController } from './packs.controller.js';
import { PacksService } from './packs.service.js';

@Global()
@Module({
  controllers: [PacksController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
