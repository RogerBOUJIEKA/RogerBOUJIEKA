import { Inject, Injectable } from '@nestjs/common';
import { isTrustedLandlord, trustScore } from '@kle/shared';
import { and, avg, count, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { Clock, DAY } from '../common/clock.js';
import { notFound } from '../common/errors.js';
import { DB, type Database } from '../db/db.module.js';
import { listings, reviews, sanctions, tenancies, users } from '../db/schema.js';

export interface ProfileStats {
  averageRating: number | null;
  reviewsCount: number;
  listingsCount: number;
  rentedCount: number;
  sanctionsCount: number;
  memberSince: Date;
  verified: boolean;
  trust: number;
  trustedLandlord: boolean;
}

/** « Jean Mbarga » → « Jean M. » : le nom complet n'est montré qu'aux personnes en contact. */
export function displayName(fullName: string | null): string {
  if (!fullName) return 'Membre Klé';
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first!;
}

/** Profil et réputation : badge Vérifié, note, annonces, logements loués, ancienneté, avis. */
@Injectable()
export class ProfilesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  async statsFor(userIds: string[]): Promise<Map<string, ProfileStats>> {
    const ids = [...new Set(userIds)];
    const result = new Map<string, ProfileStats>();
    if (!ids.length) return result;
    const [base, ratings, listingCounts, rentals, sanctionCounts] = await Promise.all([
      this.db
        .select({ id: users.id, createdAt: users.createdAt, kycStatus: users.kycStatus })
        .from(users)
        .where(inArray(users.id, ids)),
      this.db
        .select({ id: reviews.subjectId, avg: avg(reviews.rating), n: count() })
        .from(reviews)
        .where(inArray(reviews.subjectId, ids))
        .groupBy(reviews.subjectId),
      this.db
        .select({ id: listings.publisherId, n: count() })
        .from(listings)
        .where(and(inArray(listings.publisherId, ids), inArray(listings.status, ['published', 'taken'])))
        .groupBy(listings.publisherId),
      this.db
        .select({ id: tenancies.landlordId, n: count() })
        .from(tenancies)
        .where(inArray(tenancies.landlordId, ids))
        .groupBy(tenancies.landlordId),
      this.db
        .select({ id: sanctions.userId, n: count() })
        .from(sanctions)
        .where(and(inArray(sanctions.userId, ids), ne(sanctions.kind, 'warning'), isNull(sanctions.liftedAt)))
        .groupBy(sanctions.userId),
    ]);
    const lookup = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));
    const r = lookup(ratings);
    const l = lookup(listingCounts);
    const t = lookup(rentals);
    const s = lookup(sanctionCounts);
    const now = this.clock.now().getTime();
    for (const u of base) {
      const averageRating = r.get(u.id)?.avg ? Number(r.get(u.id)!.avg) : null;
      const reviewsCount = r.get(u.id)?.n ?? 0;
      const rentedCount = t.get(u.id)?.n ?? 0;
      const sanctionsCount = s.get(u.id)?.n ?? 0;
      result.set(u.id, {
        averageRating: averageRating === null ? null : Math.round(averageRating * 10) / 10,
        reviewsCount,
        listingsCount: l.get(u.id)?.n ?? 0,
        rentedCount,
        sanctionsCount,
        memberSince: u.createdAt,
        verified: u.kycStatus === 'approved',
        trust: trustScore({
          averageRating,
          reviewsCount,
          accountAgeDays: (now - u.createdAt.getTime()) / DAY,
          confirmedRentals: rentedCount,
          sanctions: sanctionsCount,
        }),
        trustedLandlord: isTrustedLandlord(rentedCount, sanctionsCount),
      });
    }
    return result;
  }

  async publicProfile(userId: string) {
    const [user] = await this.db
      .select({ id: users.id, fullName: users.fullName, deletedAt: users.deletedAt, status: users.status })
      .from(users)
      .where(eq(users.id, userId));
    if (!user || user.deletedAt) throw notFound('Profil introuvable.');
    const stats = (await this.statsFor([userId])).get(userId)!;
    const latest = await this.db
      .select({
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        authorName: users.fullName,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.authorId))
      .where(eq(reviews.subjectId, userId))
      .orderBy(desc(reviews.createdAt))
      .limit(10);
    const badges = [
      ...(stats.verified ? ['verified'] : []),
      ...(stats.trustedLandlord ? ['trusted_landlord'] : []),
    ];
    return {
      id: user.id,
      displayName: displayName(user.fullName),
      badges,
      suspended: user.status !== 'active',
      ...stats,
      reviews: latest.map((rv) => ({ ...rv, authorName: displayName(rv.authorName) })),
    };
  }
}
