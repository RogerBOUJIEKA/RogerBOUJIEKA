import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  extensionsFilters: ['postgis'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://kle:kle@localhost:5432/kle',
  },
});
