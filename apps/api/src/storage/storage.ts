import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AppConfig } from '../config.js';
import { hmac, safeEqual } from '../common/crypto.js';

export type Bucket = 'private' | 'public';

export interface UploadTarget {
  key: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
}

/**
 * Deux espaces séparés : `private` pour les pièces d'identité et les preuves (chiffré, jamais public,
 * consulté par liens temporaires) et `public` pour les photos des annonces.
 */
export abstract class ObjectStorage {
  abstract createUpload(bucket: Bucket, key: string, contentType: string): Promise<UploadTarget>;
  /** Lien temporaire vers un fichier privé. */
  abstract createDownloadUrl(key: string, ttlSeconds?: number): Promise<string>;
  abstract publicUrl(key: string): string;
  /** Suppression définitive (droit à l'effacement). */
  abstract delete(bucket: Bucket, key: string): Promise<void>;
}

interface LocalToken {
  b: Bucket;
  k: string;
  op: 'put' | 'get';
  exp: number;
  ct?: string;
}

/** Développement : fichiers sur disque, liens signés servis par l'API elle-même. */
@Injectable()
export class LocalStorage extends ObjectStorage {
  constructor(private readonly config: AppConfig) {
    super();
  }

  async createUpload(bucket: Bucket, key: string, contentType: string): Promise<UploadTarget> {
    const token = this.sign({ b: bucket, k: key, op: 'put', exp: Date.now() + 15 * 60_000, ct: contentType });
    return {
      key,
      url: `${this.config.PUBLIC_API_URL}/storage/local?token=${token}`,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresInSeconds: 900,
    };
  }

  async createDownloadUrl(key: string, ttlSeconds = 300): Promise<string> {
    const token = this.sign({ b: 'private', k: key, op: 'get', exp: Date.now() + ttlSeconds * 1000 });
    return `${this.config.PUBLIC_API_URL}/storage/local?token=${token}`;
  }

  publicUrl(key: string): string {
    return `${this.config.PUBLIC_API_URL}/media/${key}`;
  }

  async delete(bucket: Bucket, key: string): Promise<void> {
    const root = resolve(this.config.STORAGE_LOCAL_DIR);
    const path = resolve(join(root, bucket === 'public' ? 'public' : '', key));
    if (path.startsWith(root)) await rm(path, { force: true });
  }

  sign(payload: LocalToken): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${hmac(this.config.APP_SECRET, body)}`;
  }

  verify(token: string, op: LocalToken['op']): LocalToken | null {
    const [body, signature] = token.split('.');
    if (!body || !signature || !safeEqual(hmac(this.config.APP_SECRET, body), signature)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as LocalToken;
    if (payload.op !== op || payload.exp < Date.now()) return null;
    if (payload.k.includes('..')) return null;
    return payload;
  }
}

/** Production : stockage compatible S3 (Cloudflare R2, Scaleway, OVH…), chiffré côté serveur. */
@Injectable()
export class S3Storage extends ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: AppConfig) {
    super();
    this.client = new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: config.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  private bucketName(bucket: Bucket): string {
    const name = bucket === 'private' ? this.config.S3_PRIVATE_BUCKET : this.config.S3_PUBLIC_BUCKET;
    if (!name) throw new Error(`Bucket ${bucket} non configuré.`);
    return name;
  }

  async createUpload(bucket: Bucket, key: string, contentType: string): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName(bucket),
      Key: key,
      ContentType: contentType,
      ...(bucket === 'private' ? { ServerSideEncryption: 'AES256' as const } : {}),
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: 900 });
    return { key, url, method: 'PUT', headers: { 'Content-Type': contentType }, expiresInSeconds: 900 };
  }

  async createDownloadUrl(key: string, ttlSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucketName('private'), Key: key });
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }

  async delete(bucket: Bucket, key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketName(bucket), Key: key }));
  }

  publicUrl(key: string): string {
    const base = this.config.S3_PUBLIC_BASE_URL;
    if (!base) throw new Error('S3_PUBLIC_BASE_URL non configuré.');
    return `${base.replace(/\/$/, '')}/${key}`;
  }
}

export const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};
