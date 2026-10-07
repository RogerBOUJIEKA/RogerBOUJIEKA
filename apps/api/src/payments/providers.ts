import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { AppConfig } from '../config.js';
import { safeEqual } from '../common/crypto.js';

export type ProviderStatus = 'pending' | 'succeeded' | 'failed';

export interface InitiateInput {
  /** Notre référence (identifiant du paiement). */
  merchantReference: string;
  amount: number;
  currency: string;
  operator: 'mtn' | 'orange';
  payerPhone: string;
  description: string;
}

export interface InitiateResult {
  providerReference: string;
  /** Message à afficher : « Valide le paiement sur ton téléphone (*126#) ». */
  instructions: string;
  authorizationUrl?: string;
}

export interface ProviderPaymentState {
  status: ProviderStatus;
  payerName?: string;
}

/**
 * Agrégateur Mobile Money (MTN MoMo et Orange Money), confirmation par webhook.
 * Notch Pay et Campay sont à comparer ; chacun s'ajoute comme une implémentation.
 */
export abstract class PaymentProvider {
  abstract readonly name: string;
  abstract initiate(input: InitiateInput): Promise<InitiateResult>;
  /** Interroge l'agrégateur : on ne se fie jamais au seul contenu d'un webhook. */
  abstract fetchStatus(providerReference: string): Promise<ProviderPaymentState>;
  /** Vérifie la signature et renvoie la référence concernée, ou `null` si invalide. */
  abstract parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): string | null;
}

const INSTRUCTIONS = {
  mtn: 'Valide le paiement sur ton téléphone MTN Mobile Money (ou compose *126#).',
  orange: 'Valide le paiement sur ton téléphone Orange Money (ou compose #150*50#).',
};

/** Développement et tests : paiements simulés, confirmés via l'API de simulation. */
@Injectable()
export class FakePaymentProvider extends PaymentProvider {
  readonly name = 'fake';
  private readonly states = new Map<string, ProviderPaymentState>();

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const providerReference = `fake_${input.merchantReference}`;
    this.states.set(providerReference, { status: 'pending' });
    return { providerReference, instructions: INSTRUCTIONS[input.operator] };
  }

  async fetchStatus(providerReference: string): Promise<ProviderPaymentState> {
    return this.states.get(providerReference) ?? { status: 'pending' };
  }

  simulate(providerReference: string, state: ProviderPaymentState): void {
    this.states.set(providerReference, state);
  }

  parseWebhook(rawBody: Buffer): string | null {
    const body = JSON.parse(rawBody.toString()) as { reference?: string };
    return body.reference ?? null;
  }
}

/**
 * Notch Pay (https://notchpay.co). Les noms de champs suivent la documentation publique de
 * l'API ; à valider avec un compte marchand de test avant la mise en production.
 */
@Injectable()
export class NotchPayProvider extends PaymentProvider {
  readonly name = 'notchpay';
  private readonly logger = new Logger(NotchPayProvider.name);
  private readonly baseUrl = 'https://api.notchpay.co';

  constructor(private readonly config: AppConfig) {
    super();
  }

  private headers(): Record<string, string> {
    const key = this.config.NOTCHPAY_PUBLIC_KEY;
    if (!key) throw new Error('NOTCHPAY_PUBLIC_KEY manquant.');
    return {
      Authorization: key,
      ...(this.config.NOTCHPAY_PRIVATE_KEY ? { 'X-Grant': this.config.NOTCHPAY_PRIVATE_KEY } : {}),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const init = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        reference: input.merchantReference,
        description: input.description,
        customer: { phone: input.payerPhone },
      }),
    });
    const initJson = (await init.json()) as {
      transaction?: { reference?: string };
      authorization_url?: string;
    };
    const reference = initJson.transaction?.reference;
    if (!init.ok || !reference) {
      throw new Error(`Notch Pay : initialisation refusée (${init.status}).`);
    }

    // Déclenche directement la demande de validation sur le téléphone du payeur.
    const charge = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(reference)}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        channel: input.operator === 'mtn' ? 'cm.mtn' : 'cm.orange',
        data: { phone: input.payerPhone },
      }),
    });
    if (!charge.ok) {
      this.logger.warn(`Notch Pay : demande Mobile Money refusée (${charge.status}) pour ${reference}.`);
    }
    return {
      providerReference: reference,
      instructions: INSTRUCTIONS[input.operator],
      authorizationUrl: initJson.authorization_url,
    };
  }

  async fetchStatus(providerReference: string): Promise<ProviderPaymentState> {
    const res = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(providerReference)}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Notch Pay : statut indisponible (${res.status}).`);
    const json = (await res.json()) as {
      transaction?: { status?: string; customer?: { name?: string } | null };
    };
    const status = json.transaction?.status;
    return {
      status: status === 'complete' ? 'succeeded' : status === 'pending' || status === 'processing' ? 'pending' : 'failed',
      payerName: json.transaction?.customer?.name ?? undefined,
    };
  }

  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): string | null {
    const secret = this.config.NOTCHPAY_WEBHOOK_HASH;
    const signature = headers['x-notch-signature'];
    if (!secret || typeof signature !== 'string') return null;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqual(expected, signature)) return null;
    const body = JSON.parse(rawBody.toString()) as { data?: { reference?: string } };
    return body.data?.reference ?? null;
  }
}
