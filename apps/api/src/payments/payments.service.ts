import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Clock } from '../common/clock.js';
import { notFound } from '../common/errors.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { payments } from '../db/schema.js';
import { PaymentProvider } from './providers.js';

export type Payment = typeof payments.$inferSelect;
export type PaymentPurpose = Payment['purpose'];
type SuccessHandler = (payment: Payment, tx: Tx) => Promise<void>;

export interface InitiatePaymentInput {
  userId: string;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  operator: 'mtn' | 'orange';
  payerPhone: string;
  description: string;
  packTier?: Payment['packTier'];
  successFeeId?: string;
  listingId?: string;
}

/**
 * Seuls les packs chercheurs, les frais de réussite et les boosts se paient dans l'appli.
 * Aucun loyer ni caution ne transite par Klé.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly handlers = new Map<PaymentPurpose, SuccessHandler>();

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly provider: PaymentProvider,
    private readonly clock: Clock,
  ) {}

  /** Chaque module (packs, frais de réussite, boosts) enregistre ce qui se passe une fois payé. */
  onSucceeded(purpose: PaymentPurpose, handler: SuccessHandler): void {
    this.handlers.set(purpose, handler);
  }

  async initiate(input: InitiatePaymentInput) {
    const id = randomUUID();
    let result;
    try {
      result = await this.provider.initiate({
        merchantReference: id,
        amount: input.amount,
        currency: input.currency,
        operator: input.operator,
        payerPhone: input.payerPhone,
        description: input.description,
      });
    } catch (error) {
      this.logger.error(`Paiement ${id} : ${String(error)}`);
      throw new BadGatewayException({
        code: 'payment_unavailable',
        message: 'Le paiement Mobile Money est momentanément indisponible. Réessaie dans un instant.',
      });
    }
    const [payment] = await this.db
      .insert(payments)
      .values({
        id,
        userId: input.userId,
        purpose: input.purpose,
        packTier: input.packTier,
        successFeeId: input.successFeeId,
        listingId: input.listingId,
        amount: input.amount,
        currency: input.currency,
        operator: input.operator,
        payerPhone: input.payerPhone,
        provider: this.provider.name,
        providerReference: result.providerReference,
        createdAt: this.clock.now(),
      })
      .returning();
    return {
      paymentId: payment!.id,
      status: payment!.status,
      amount: payment!.amount,
      instructions: result.instructions,
      authorizationUrl: result.authorizationUrl,
    };
  }

  async get(userId: string, id: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, userId)));
    if (!payment) throw notFound('Paiement introuvable.');
    if (payment.status === 'pending') return (await this.confirm(payment.providerReference)) ?? payment;
    return payment;
  }

  async handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const reference = this.provider.parseWebhook(rawBody, headers);
    if (!reference) return { accepted: false };
    await this.confirm(reference);
    return { accepted: true };
  }

  /**
   * Interroge l'agrégateur puis applique le résultat une seule fois (verrou sur la ligne),
   * même si le webhook arrive plusieurs fois ou en même temps que la vérification de l'appli.
   */
  async confirm(providerReference: string): Promise<Payment | null> {
    const state = await this.provider.fetchStatus(providerReference);
    if (state.status === 'pending') return null;
    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.providerReference, providerReference))
        .for('update');
      if (!payment || payment.status !== 'pending') return payment ?? null;
      const now = this.clock.now();
      const [updated] = await tx
        .update(payments)
        .set({
          status: state.status,
          payerName: state.payerName ?? null,
          paidAt: state.status === 'succeeded' ? now : null,
        })
        .where(eq(payments.id, payment.id))
        .returning();
      if (state.status === 'succeeded') {
        const handler = this.handlers.get(payment.purpose);
        if (!handler) throw new Error(`Aucun traitement pour les paiements « ${payment.purpose} ».`);
        await handler(updated!, tx);
      }
      return updated!;
    });
  }
}
