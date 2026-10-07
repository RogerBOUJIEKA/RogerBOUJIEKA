import { sql, type SQL } from 'drizzle-orm';

/** Point WGS 84 (longitude, latitude) prêt à être inséré dans une colonne PostGIS. */
export function makePoint(longitude: number, latitude: number): SQL {
  return sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
}

/**
 * Position approximative affichée sur l'annonce : décalage stable de 150 à 400 m
 * autour du vrai point, dérivé de l'identifiant pour ne pas varier d'un affichage à l'autre.
 */
export function approximate(
  longitude: number,
  latitude: number,
  seed: string,
): { longitude: number; latitude: number } {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const angle = ((h >>> 0) % 360) * (Math.PI / 180);
  const distanceM = 150 + ((h >>> 9) % 250);
  const dLat = (distanceM * Math.cos(angle)) / 111_320;
  const dLng = (distanceM * Math.sin(angle)) / (111_320 * Math.cos((latitude * Math.PI) / 180));
  return { longitude: longitude + dLng, latitude: latitude + dLat };
}
