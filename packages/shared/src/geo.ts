import type { CurrencyCode } from './money.js';

/**
 * Multi-pays dès la conception : ouvrir Abidjan doit être un réglage, pas un nouveau développement.
 * Ces valeurs servent de configuration par défaut ; la base de données fait foi.
 */
export interface CountryConfig {
  code: string;
  name: string;
  currency: CurrencyCode;
  dialCode: string;
  /** Longueur du numéro national (sans indicatif). */
  nationalNumberLength: number;
  defaultLocale: 'fr' | 'en';
}

export const COUNTRIES: Record<string, CountryConfig> = {
  CM: {
    code: 'CM',
    name: 'Cameroun',
    currency: 'XAF',
    dialCode: '237',
    nationalNumberLength: 9,
    defaultLocale: 'fr',
  },
  CI: {
    code: 'CI',
    name: 'Côte d’Ivoire',
    currency: 'XOF',
    dialCode: '225',
    nationalNumberLength: 10,
    defaultLocale: 'fr',
  },
  SN: {
    code: 'SN',
    name: 'Sénégal',
    currency: 'XOF',
    dialCode: '221',
    nationalNumberLength: 9,
    defaultLocale: 'fr',
  },
  TG: {
    code: 'TG',
    name: 'Togo',
    currency: 'XOF',
    dialCode: '228',
    nationalNumberLength: 8,
    defaultLocale: 'fr',
  },
  BJ: {
    code: 'BJ',
    name: 'Bénin',
    currency: 'XOF',
    dialCode: '229',
    nationalNumberLength: 10,
    defaultLocale: 'fr',
  },
};

/**
 * Normalise un numéro au format international E.164 (« +237699123456 »).
 * Accepte « 699 12 34 56 », « 237699123456 », « +237 6 99 12 34 56 », « 00237… ».
 * Retourne `null` si le numéro n'est pas valide pour le pays.
 */
export function normalizePhone(raw: string, defaultCountry = 'CM'): string | null {
  let digits = raw.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (!/^\+?\d+$/.test(digits)) return null;

  if (digits.startsWith('+')) {
    const body = digits.slice(1);
    for (const country of Object.values(COUNTRIES)) {
      if (
        body.startsWith(country.dialCode) &&
        body.length === country.dialCode.length + country.nationalNumberLength
      ) {
        return isPlausibleNational(country, body.slice(country.dialCode.length)) ? `+${body}` : null;
      }
    }
    return null;
  }

  const country = COUNTRIES[defaultCountry];
  if (!country) return null;
  if (
    digits.startsWith(country.dialCode) &&
    digits.length === country.dialCode.length + country.nationalNumberLength
  ) {
    digits = digits.slice(country.dialCode.length);
  }
  if (digits.length !== country.nationalNumberLength) return null;
  return isPlausibleNational(country, digits) ? `+${country.dialCode}${digits}` : null;
}

function isPlausibleNational(country: CountryConfig, national: string): boolean {
  // Cameroun : mobiles en 6, fixes en 2.
  if (country.code === 'CM') return /^[62]\d{8}$/.test(national);
  return true;
}

/** Masque un numéro pour l'affichage dans le back-office : +237 6•• •• •• 56. */
export function maskPhone(e164: string): string {
  if (e164.length < 6) return '••••';
  return `${e164.slice(0, 5)}•••••${e164.slice(-2)}`;
}
