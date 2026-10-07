import pg from 'pg';
import { runMigrations } from '../src/db/migrate.js';

/** Repart d'une base de test vide et applique toutes les migrations. */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://kle:kle@localhost:5432/kle_test';
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;');
  await client.end();
  await runMigrations(url);
}
