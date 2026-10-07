/** Montants en unités entières de la devise (le FCFA n'a pas de centimes). */
export type Amount = number;

export type CurrencyCode = 'XAF' | 'XOF';

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  XAF: 'FCFA',
  XOF: 'FCFA',
};

/** Formate un montant à la française : 150000 → « 150 000 FCFA ». */
export function formatMoney(amount: Amount, currency: CurrencyCode = 'XAF'): string {
  const digits = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${digits} ${CURRENCY_LABELS[currency]}`;
}
