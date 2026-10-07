import { z } from 'zod';

/** Pièces d'identité acceptées (recto verso). */
export const ID_DOCUMENT_TYPES = ['cni', 'passport', 'driving_license', 'voter_card'] as const;
export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number];

export const ID_DOCUMENT_LABELS: Record<IdDocumentType, string> = {
  cni: 'Carte nationale d’identité',
  passport: 'Passeport',
  driving_license: 'Permis de conduire',
  voter_card: 'Carte d’électeur',
};

/**
 * Le bailleur fournit une seule preuve, au choix dans une liste que tout bailleur peut réunir.
 * Un gérant fournit une procuration signée du propriétaire et la copie de sa pièce.
 * Un sortant fournit une quittance de loyer récente ou son contrat de bail.
 */
export const PROOF_TYPES = [
  'utility_bill',
  'property_tax_receipt',
  'lease_or_rent_receipt',
  'property_title',
  'power_of_attorney',
] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export const PROOF_LABELS: Record<ProofType, string> = {
  utility_bill: 'Facture récente d’électricité ou d’eau du logement, à ton nom',
  property_tax_receipt: 'Reçu d’impôt foncier',
  lease_or_rent_receipt: 'Quittance ou contrat de bail signé avec un locataire (ou ton bailleur)',
  property_title: 'Titre foncier, acte de vente ou attestation de propriété',
  power_of_attorney: 'Procuration du propriétaire et copie de sa pièce d’identité (gérant)',
};

export const PROOFS_FOR_ROLE = {
  landlord: [
    'utility_bill',
    'property_tax_receipt',
    'lease_or_rent_receipt',
    'property_title',
    'power_of_attorney',
  ],
  outgoing_tenant: ['lease_or_rent_receipt'],
} as const satisfies Record<'landlord' | 'outgoing_tenant', readonly ProofType[]>;

export const KYC_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

/** En V1, un modérateur valide chaque dossier en moins de 24 h. */
export const MODERATION_SLA_HOURS = {
  kyc: 24,
  listing: 12,
  report: 48,
} as const;

/** Clé d'objet dans le stockage privé chiffré (jamais une URL publique). */
const storageKey = z
  .string()
  .regex(/^private\/[a-z0-9_\-/]+\.(jpg|jpeg|png|webp|pdf)$/i, 'Clé de fichier invalide');

export const submitKycSchema = z.object({
  documentType: z.enum(ID_DOCUMENT_TYPES),
  documentFrontKey: storageKey,
  documentBackKey: storageKey.optional(),
  selfieKey: storageKey,
  fullName: z.string().trim().min(3).max(120),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;

export const submitProofSchema = z.object({
  role: z.enum(['landlord', 'outgoing_tenant']),
  proofType: z.enum(PROOF_TYPES),
  fileKeys: z.array(storageKey).min(1).max(4),
  /** Case « déclaration sur l'honneur », obligatoire. */
  honorDeclaration: z.literal(true),
});
export type SubmitProofInput = z.infer<typeof submitProofSchema>;

/**
 * Compare le nom du compte Mobile Money qui paie le pack au nom de la pièce.
 * Tolère l'ordre des mots, les accents et la casse ; au moins deux mots doivent correspondre
 * (ou un seul si l'un des noms n'a qu'un mot).
 */
export function namesMatch(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 1),
    );
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common >= Math.min(2, wa.size, wb.size);
}
