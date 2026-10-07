/** Identifiant unique d'un logement, ex. KLE-CM-DLA-000123. */
const REF_PATTERN = /^KLE-([A-Z]{2})-([A-Z]{3})-(\d{6,})$/;

export function formatListingRef(countryCode: string, cityCode: string, sequence: number): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new RangeError(`Code pays invalide : ${countryCode}`);
  if (!/^[A-Z]{3}$/.test(cityCode)) throw new RangeError(`Code ville invalide : ${cityCode}`);
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Numéro de séquence invalide : ${sequence}`);
  }
  return `KLE-${countryCode}-${cityCode}-${String(sequence).padStart(6, '0')}`;
}

export function parseListingRef(
  ref: string,
): { countryCode: string; cityCode: string; sequence: number } | null {
  const match = REF_PATTERN.exec(ref.trim().toUpperCase());
  if (!match) return null;
  return { countryCode: match[1]!, cityCode: match[2]!, sequence: Number(match[3]) };
}

export function isListingRef(value: string): boolean {
  return parseListingRef(value) !== null;
}
