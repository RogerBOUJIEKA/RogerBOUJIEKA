import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { createListingSchema, listingSearchSchema, phoneSchema } from '@kle/shared';
import type { Request } from 'express';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { CONFIG, type AppConfig } from '../config.js';
import { safeEqual } from '../common/crypto.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { FeedService } from './feed.service.js';
import { ListingsService } from './listings.service.js';

const feedSchema = z.object({
  cityId: z.uuid().optional(),
  budgetMax: z.coerce.number().int().min(0).optional(),
  districtIds: z
    .union([z.uuid(), z.array(z.uuid())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  cursor: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

const mediaSchema = z.object({
  kind: z.enum(['video', 'photo']),
  contentType: z.enum(['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']),
  capturedInApp: z.boolean().default(false),
  capturedAt: z.coerce.date().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

/** Les champs modifiables sont ceux de la création, tous facultatifs. */
const updateListingSchema = z
  .object(createListingSchema.shape)
  .omit({ category: true, comingSoon: true })
  .partial();

const boostSchema = z.object({ operator: z.enum(['mtn', 'orange']), payerPhone: phoneSchema });

@Controller()
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly feedService: FeedService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get('feed')
  feed(@CurrentUser() viewer: AuthUser | undefined, @Query(new ZodPipe(feedSchema)) query: z.output<typeof feedSchema>) {
    return this.feedService.feed(viewer, query);
  }

  @Public()
  @Get('listings')
  search(
    @CurrentUser() viewer: AuthUser | undefined,
    @Query(new ZodPipe(listingSearchSchema)) query: z.output<typeof listingSearchSchema>,
  ) {
    return this.feedService.search(viewer, query);
  }

  @Get('listings/mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.listings.mine(user.id);
  }

  @Get('me/favorites')
  favorites(@CurrentUser() user: AuthUser) {
    return this.listings.favorites(user);
  }

  @Public()
  @Get('listings/:idOrRef')
  get(@CurrentUser() viewer: AuthUser | undefined, @Param('idOrRef') idOrRef: string) {
    return this.listings.getPublic(idOrRef, viewer);
  }

  @Post('listings')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createListingSchema)) body: z.output<typeof createListingSchema>) {
    return this.listings.create(user, body);
  }

  @Patch('listings/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateListingSchema)) body: z.output<typeof updateListingSchema>,
  ) {
    return this.listings.update(user, id, body);
  }

  @Post('listings/:id/media')
  createMedia(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(mediaSchema)) body: z.output<typeof mediaSchema>,
  ) {
    return this.listings.createMediaUpload(user, id, body);
  }

  @Post('listings/:id/media/:mediaId/complete')
  @HttpCode(200)
  completeMedia(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.listings.completeMedia(user, id, mediaId);
  }

  @Delete('listings/:id/media/:mediaId')
  removeMedia(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.listings.removeMedia(user, id, mediaId);
  }

  @Post('listings/:id/submit')
  @HttpCode(200)
  submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.listings.submit(user, id);
  }

  @Post('listings/:id/still-available')
  @HttpCode(200)
  stillAvailable(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.listings.confirmAvailable(user, id);
  }

  @Delete('listings/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.listings.remove(user, id);
  }

  @Put('listings/:id/favorite')
  favorite(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.listings.setFavorite(user, id, true);
  }

  @Delete('listings/:id/favorite')
  unfavorite(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.listings.setFavorite(user, id, false);
  }

  @Public()
  @Post('listings/:id/share')
  @HttpCode(200)
  share(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.share(id);
  }

  @Post('listings/:id/boost')
  boost(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(boostSchema)) body: z.output<typeof boostSchema>,
  ) {
    return this.listings.boost(user, id, body);
  }

  /** Cloudflare Stream : vidéo prête (signature « time=…,sig1=… » sur le corps brut). */
  @Public()
  @Post('media/webhooks/cloudflare')
  @HttpCode(200)
  async cloudflareWebhook(@Req() req: RawBodyRequest<Request>, @Headers('webhook-signature') signature?: string) {
    const secret = this.config.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    if (!secret || !signature || !req.rawBody) throw new ForbiddenException();
    const parts = Object.fromEntries(signature.split(',').map((p) => p.split('=') as [string, string]));
    const expected = createHmac('sha256', secret).update(`${parts.time}.${req.rawBody.toString()}`).digest('hex');
    if (!parts.sig1 || !safeEqual(expected, parts.sig1)) throw new ForbiddenException();
    const body = JSON.parse(req.rawBody.toString()) as {
      uid: string;
      readyToStream?: boolean;
      status?: { state?: string };
      playback?: { hls?: string };
      thumbnail?: string;
      duration?: number;
    };
    if (body.readyToStream && body.playback?.hls) {
      await this.listings.markVideoReady('cloudflare_stream', body.uid, {
        playbackUrl: body.playback.hls,
        thumbnailUrl: body.thumbnail,
        durationSeconds: body.duration,
      });
    } else if (body.status?.state === 'error') {
      await this.listings.markVideoReady('cloudflare_stream', body.uid, null);
    }
    return { ok: true };
  }
}
