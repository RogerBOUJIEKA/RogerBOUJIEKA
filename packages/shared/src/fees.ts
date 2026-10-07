import type { Amount } from './money.js';
import { DEFAULT_PACK_PRICES, type PackTier } from './packs.js';

/**
 * Frais de réussite : 10 % d'un mois de loyer, en plus du pack, à chaque logement obtenu
 * grâce à un contact Klé. Démarrer à 10 % ; passer à 12 ou 15 % si le taux de paiement est bon.
 * Le taux est stocké par pays (en points de base) pour pouvoir l'ajuster sans déploiement.
 */
export const DEFAULT_SUCCESS_FEE_BPS = 1_000;

/** Le locataire règle sa facture par Mobile Money sous 15 jours. */
export const SUCCESS_FEE_DUE_DAYS = 15;

/** Sans paiement après 30 jours, le compte est bloqué jusqu'au règlement. */
export const SUCCESS_FEE_BLOCK_AFTER_DAYS = 30;

/** Le bailleur doit marquer son logement « Loué » sous 48 h (charte). */
export const TAKEN_DEADLINE_HOURS = 48;

export function computeSuccessFee(monthlyRent: Amount, feeBps = DEFAULT_SUCCESS_FEE_BPS): Amount {
  if (!Number.isFinite(monthlyRent) || monthlyRent < 0) {
    throw new RangeError('Le loyer doit être un montant positif.');
  }
  return Math.round((monthlyRent * feeBps) / 10_000);
}

export interface CostComparison {
  /** Avec un agent : un mois de loyer de commission, plus les frais de visite. */
  agentCommission: Amount;
  agentPlusVisits: true;
  packPrice: Amount;
  successFee: Amount;
  kleTotal: Amount;
  savings: Amount;
}

/**
 * Comparatif affiché sous le loyer de chaque fiche :
 * « Agent : 150 000 FCFA + visites. Klé : ton pack + 15 000 FCFA. »
 */
export function compareWithAgent(
  monthlyRent: Amount,
  tier: PackTier = 'confort',
  packPrices: Record<PackTier, Amount> = DEFAULT_PACK_PRICES,
  feeBps = DEFAULT_SUCCESS_FEE_BPS,
): CostComparison {
  const successFee = computeSuccessFee(monthlyRent, feeBps);
  const packPrice = packPrices[tier];
  const kleTotal = packPrice + successFee;
  return {
    agentCommission: monthlyRent,
    agentPlusVisits: true,
    packPrice,
    successFee,
    kleTotal,
    savings: monthlyRent - kleTotal,
  };
}
