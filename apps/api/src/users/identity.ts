import { and, eq } from 'drizzle-orm';
import { hmac } from '../common/crypto.js';
import type { Tx } from '../db/db.module.js';
import { bannedIdentities } from '../db/schema.js';

export type IdentityKind = 'phone' | 'id_document';

/** Empreinte d'un identifiant banni : on peut vérifier un numéro sans le stocker en clair. */
export function identityHash(secret: string, kind: IdentityKind, value: string): string {
  const normalized = kind === 'id_document' ? value.replace(/[\s-]/g, '').toUpperCase() : value;
  return hmac(secret, `${kind}:${normalized}`);
}

export async function isBannedIdentity(
  tx: Tx,
  secret: string,
  kind: IdentityKind,
  value: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: bannedIdentities.id })
    .from(bannedIdentities)
    .where(
      and(
        eq(bannedIdentities.kind, kind),
        eq(bannedIdentities.valueHash, identityHash(secret, kind, value)),
      ),
    )
    .limit(1);
  return !!row;
}
