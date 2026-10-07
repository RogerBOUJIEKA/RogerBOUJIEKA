import { Injectable } from '@nestjs/common';
import type { AppConfig } from '../config.js';
import { randomToken } from '../common/crypto.js';
import { ObjectStorage } from './storage.js';

export interface VideoUpload {
  provider: string;
  assetId: string;
  uploadUrl: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
}

/**
 * Service vidéo spécialisé : la vidéo part directement du téléphone vers le service,
 * sans passer par l'API ; le service crée plusieurs qualités (240p à 720p) et une miniature.
 */
export abstract class VideoProvider {
  abstract readonly name: string;
  abstract createDirectUpload(meta: { listingId: string }): Promise<VideoUpload>;
}

/** Développement : la vidéo est stockée telle quelle dans l'espace public local. */
@Injectable()
export class LocalVideoProvider extends VideoProvider {
  readonly name = 'local';

  constructor(private readonly storage: ObjectStorage) {
    super();
  }

  async createDirectUpload(meta: { listingId: string }): Promise<VideoUpload> {
    const key = `listings/${meta.listingId}/${randomToken(9)}.mp4`;
    const target = await this.storage.createUpload('public', key, 'video/mp4');
    return { provider: this.name, assetId: key, uploadUrl: target.url, method: 'PUT', headers: target.headers };
  }

  playbackUrl(assetId: string): string {
    return this.storage.publicUrl(assetId);
  }
}

/**
 * Cloudflare Stream (envoi direct par le téléphone, prise en charge de la reprise via tus).
 * Mux et Bunny Stream restent à comparer : il suffit d'ajouter une implémentation de VideoProvider.
 */
@Injectable()
export class CloudflareStreamProvider extends VideoProvider {
  readonly name = 'cloudflare_stream';

  constructor(private readonly config: AppConfig) {
    super();
  }

  async createDirectUpload(meta: { listingId: string }): Promise<VideoUpload> {
    const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_STREAM_TOKEN: token } = this.config;
    if (!account || !token) throw new Error('Cloudflare Stream non configuré.');
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/stream/direct_upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDurationSeconds: 180, meta: { listingId: meta.listingId } }),
      },
    );
    const json = (await response.json()) as { success: boolean; result?: { uid: string; uploadURL: string } };
    if (!response.ok || !json.success || !json.result) {
      throw new Error(`Cloudflare Stream a refusé la création d'envoi (${response.status}).`);
    }
    return {
      provider: this.name,
      assetId: json.result.uid,
      uploadUrl: json.result.uploadURL,
      method: 'POST',
      headers: {},
    };
  }
}
