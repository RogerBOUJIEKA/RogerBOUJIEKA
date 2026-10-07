import { Controller, Get, Inject, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { Public } from '../auth/auth.decorators.js';
import { DB, type Database } from '../db/db.module.js';
import { cities, countries, districts } from '../db/schema.js';

/** Pays, villes et quartiers en tables : ouvrir une ville est un réglage. */
@Public()
@Controller('geo')
export class GeoController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get('countries')
  countries() {
    return this.db
      .select({ code: countries.code, name: countries.name, currency: countries.currency, dialCode: countries.dialCode })
      .from(countries)
      .where(eq(countries.active, true));
  }

  @Get('cities')
  cities(@Query('country') country = 'CM') {
    return this.db
      .select({
        id: cities.id,
        code: cities.code,
        name: cities.name,
        latitude: sql<number>`ST_Y(${cities.centroid})`,
        longitude: sql<number>`ST_X(${cities.centroid})`,
      })
      .from(cities)
      .where(and(eq(cities.countryCode, country.toUpperCase()), eq(cities.active, true)))
      .orderBy(asc(cities.name));
  }

  @Get('cities/:id/districts')
  districts(@Param('id', ParseUUIDPipe) cityId: string) {
    return this.db
      .select({
        id: districts.id,
        name: districts.name,
        slug: districts.slug,
        latitude: sql<number>`ST_Y(${districts.centroid})`,
        longitude: sql<number>`ST_X(${districts.centroid})`,
      })
      .from(districts)
      .where(eq(districts.cityId, cityId))
      .orderBy(asc(districts.name));
  }
}
