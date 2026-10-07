import { Inject, Injectable } from '@nestjs/common';
import { canViewListing, feedScore, type ListingSearchInput } from '@kle/shared';
import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { DB, type Database } from '../db/db.module.js';
import { cities, listings, users } from '../db/schema.js';
import { ProfilesService } from '../users/profiles.service.js';
import { ListingsService } from './listings.service.js';
import type { ListingRow } from './listing-view.js';

const FEED_CANDIDATES = 300;

function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  const n = Number(Buffer.from(cursor, 'base64url').toString());
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

const encodeCursor = (offset: number) => Buffer.from(String(offset)).toString('base64url');

@Injectable()
export class FeedService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly listings: ListingsService,
    private readonly profiles: ProfilesService,
  ) {}

  /**
   * Fil « Pour toi » : vidéos verticales filtrées sur la ville et le budget, ordonnées par
   * ville, budget, quartiers préférés, fraîcheur et confiance du publiant.
   */
  async feed(
    viewer: AuthUser | undefined,
    query: { cityId?: string; budgetMax?: number; districtIds?: string[]; cursor?: string; limit: number },
  ) {
    const ctx = await this.listings.viewContext(viewer);
    const prefs = await this.preferences(viewer, query);
    const conditions: SQL[] = [eq(listings.status, 'published')];
    if (prefs.cityId) conditions.push(eq(listings.cityId, prefs.cityId));
    const candidates = await this.db
      .select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(desc(listings.publishedAt))
      .limit(FEED_CANDIDATES);

    const visible = candidates.filter((row) =>
      canViewListing({
        category: row.category,
        publishedAt: row.publishedAt!,
        viewerTier: ctx.viewerTier,
        viewerIsPublisher: row.publisherId === viewer?.id,
        now: ctx.now,
      }),
    );
    const stats = await this.profiles.statsFor(visible.map((r) => r.publisherId));
    const scored = visible
      .map((row) => ({
        row,
        score: feedScore(
          {
            cityId: row.cityId,
            districtId: row.districtId,
            monthlyRent: row.monthlyRent,
            publishedAt: row.publishedAt!,
            publisherTrust: stats.get(row.publisherId)?.trust ?? 0,
            validatedVisits: row.validatedVisits,
            boostedUntil: row.boostedUntil,
          },
          prefs,
          ctx.now,
        ),
      }))
      .sort((a, b) => b.score - a.score);

    const offset = decodeCursor(query.cursor);
    const page = scored.slice(offset, offset + query.limit).map((s) => s.row);
    const items = await this.listings.present(page, ctx, viewer);
    return {
      items: items.filter((i) => i.media.length > 0),
      nextCursor: offset + query.limit < scored.length ? encodeCursor(offset + query.limit) : null,
      preferences: prefs,
    };
  }

  /** Explorer : carte et filtres (ville, quartier, type, budget, date de disponibilité). */
  async search(viewer: AuthUser | undefined, query: ListingSearchInput) {
    const ctx = await this.listings.viewContext(viewer);
    const conditions: SQL[] = [eq(listings.status, 'published')];
    if (query.cityId) conditions.push(eq(listings.cityId, query.cityId));
    if (query.districtIds?.length) conditions.push(inArray(listings.districtId, query.districtIds));
    if (query.type) conditions.push(eq(listings.type, query.type));
    if (query.minRent !== undefined) conditions.push(gte(listings.monthlyRent, query.minRent));
    if (query.maxRent !== undefined) conditions.push(lte(listings.monthlyRent, query.maxRent));
    if (query.furnished !== undefined) {
      conditions.push(sql`(${listings.amenities} -> 'logement' ->> 'furnished')::boolean = ${query.furnished}`);
    }
    if (query.availableBefore) {
      const before = query.availableBefore.toISOString().slice(0, 10);
      conditions.push(or(sql`${listings.availableFrom} is null`, lte(listings.availableFrom, sql`${before}::date`))!);
    }
    if (query.bbox) {
      const [w, s, e, n] = query.bbox;
      conditions.push(sql`ST_Intersects(${listings.approxLocation}, ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326))`);
    }
    const offset = decodeCursor(query.cursor);
    const rows = await this.db
      .select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(desc(listings.boostedUntil), desc(listings.publishedAt), asc(listings.id))
      .limit(query.limit + 1)
      .offset(offset);
    const visible = rows.slice(0, query.limit).filter((row) =>
      canViewListing({
        category: row.category,
        publishedAt: row.publishedAt!,
        viewerTier: ctx.viewerTier,
        viewerIsPublisher: row.publisherId === viewer?.id,
        now: ctx.now,
      }),
    );
    return {
      items: await this.listings.present(visible, ctx, viewer),
      nextCursor: rows.length > query.limit ? encodeCursor(offset + query.limit) : null,
    };
  }

  private async preferences(
    viewer: AuthUser | undefined,
    query: { cityId?: string; budgetMax?: number; districtIds?: string[] },
  ) {
    let saved: { cityId: string | null; budgetMax: number | null; districtIds: string[] } | undefined;
    if (viewer) {
      const [row] = await this.db
        .select({ cityId: users.preferredCityId, budgetMax: users.budgetMax, districtIds: users.preferredDistrictIds })
        .from(users)
        .where(eq(users.id, viewer.id));
      saved = row;
    }
    let cityId = query.cityId ?? saved?.cityId ?? undefined;
    if (!cityId) {
      const [first] = await this.db
        .select({ id: cities.id })
        .from(cities)
        .where(eq(cities.active, true))
        .orderBy(asc(cities.createdAt))
        .limit(1);
      cityId = first?.id;
    }
    return {
      cityId,
      budgetMax: query.budgetMax ?? saved?.budgetMax ?? undefined,
      districtIds: query.districtIds ?? saved?.districtIds ?? [],
    };
  }
}

export type { ListingRow };
