import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  PayloadTooLargeException,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { CONFIG, type AppConfig } from '../config.js';
import { randomToken } from '../common/crypto.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { CONTENT_TYPE_EXTENSIONS, LocalStorage, ObjectStorage } from './storage.js';

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const uploadRequestSchema = z.object({
  purpose: z.enum(['kyc', 'proof', 'selfie_check']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
});

export const PRIVATE_PREFIX: Record<z.infer<typeof uploadRequestSchema>['purpose'], string> = {
  kyc: 'private/kyc',
  proof: 'private/proofs',
  selfie_check: 'private/selfies',
};

export function ownsPrivateKey(userId: string, purpose: keyof typeof PRIVATE_PREFIX, key: string): boolean {
  return key.startsWith(`${PRIVATE_PREFIX[purpose]}/${userId}/`) && !key.includes('..');
}

@Controller()
export class StorageController {
  constructor(
    private readonly storage: ObjectStorage,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** Lien d'envoi direct vers le stockage privé (pièces d'identité, selfies, preuves). */
  @Post('uploads')
  createUpload(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(uploadRequestSchema)) body: z.infer<typeof uploadRequestSchema>,
  ) {
    const ext = CONTENT_TYPE_EXTENSIONS[body.contentType]!;
    const key = `${PRIVATE_PREFIX[body.purpose]}/${user.id}/${randomToken(12).toLowerCase().replace(/[^a-z0-9]/g, '')}.${ext}`;
    return this.storage.createUpload('private', key, body.contentType);
  }

  /** Stockage local (développement) : réception d'un fichier envoyé avec un lien signé. */
  @Public()
  @Put('storage/local')
  async localPut(@Query('token') token: string, @Req() req: Request) {
    const local = this.local();
    const payload = local.verify(token ?? '', 'put');
    if (!payload) throw new ForbiddenException({ code: 'invalid_token', message: 'Lien expiré.' });
    const path = this.pathFor(payload.b, payload.k);
    await mkdir(dirname(path), { recursive: true });
    let received = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        received += chunk.length;
        if (received > MAX_UPLOAD_BYTES) cb(new PayloadTooLargeException('Fichier trop volumineux.'));
        else cb(null, chunk);
      },
    });
    try {
      await pipeline(req, limiter, createWriteStream(path));
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
    return { key: payload.k, size: received };
  }

  /** Stockage local (développement) : lecture d'un fichier privé avec un lien temporaire. */
  @Public()
  @Get('storage/local')
  async localGet(@Query('token') token: string, @Res() res: Response) {
    const payload = this.local().verify(token ?? '', 'get');
    if (!payload) throw new ForbiddenException({ code: 'invalid_token', message: 'Lien expiré.' });
    const path = this.pathFor(payload.b, payload.k);
    await stat(path).catch(() => {
      throw new NotFoundException();
    });
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path);
  }

  private local(): LocalStorage {
    if (!(this.storage instanceof LocalStorage)) throw new NotFoundException();
    return this.storage;
  }

  private pathFor(bucket: 'private' | 'public', key: string): string {
    const root = resolve(this.config.STORAGE_LOCAL_DIR);
    const path = resolve(join(root, bucket === 'public' ? 'public' : '', key));
    if (!path.startsWith(root)) throw new ForbiddenException();
    return path;
  }
}
