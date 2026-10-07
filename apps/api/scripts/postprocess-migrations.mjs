// drizzle-kit n'écrit ni le SRID des colonnes PostGIS ni l'extension : on les ajoute ici.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../drizzle/', import.meta.url);
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
  const path = new URL(file, dir);
  let sql = readFileSync(path, 'utf8').replaceAll('geometry(point)', 'geometry(point, 4326)');
  if (file.startsWith('0000_') && !sql.startsWith('CREATE EXTENSION IF NOT EXISTS postgis;')) {
    sql = `CREATE EXTENSION IF NOT EXISTS postgis;\n--> statement-breakpoint\n${sql}`;
  }
  writeFileSync(path, sql);
}
