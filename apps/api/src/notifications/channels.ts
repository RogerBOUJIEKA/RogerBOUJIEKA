import { Injectable, Logger } from '@nestjs/common';
import type { AppConfig } from '../config.js';

export interface OutboundMessage {
  channel: 'whatsapp' | 'sms' | 'push';
  to: string;
  text: string;
  /** Code OTP : envoyé via le modèle WhatsApp d'authentification. */
  otpCode?: string;
}

export abstract class MessageSender {
  abstract send(message: OutboundMessage): Promise<void>;
}

/** Développement et tests : les messages sont journalisés et gardés en mémoire. */
@Injectable()
export class LogMessageSender extends MessageSender {
  private readonly logger = new Logger('Messages');
  readonly sent: OutboundMessage[] = [];

  async send(message: OutboundMessage): Promise<void> {
    this.sent.push(message);
    if (this.sent.length > 500) this.sent.shift();
    this.logger.log(`[${message.channel}] → ${message.to} : ${message.text}`);
  }

  lastTo(to: string): OutboundMessage | undefined {
    return [...this.sent].reverse().find((m) => m.to === to);
  }
}

/**
 * Production : WhatsApp Business (Cloud API). Les messages initiés par Klé doivent utiliser
 * des modèles approuvés par Meta ; le code OTP passe par un modèle « authentication ».
 * SMS et notifications push restent à brancher (fournisseur SMS local, Firebase Cloud Messaging).
 */
@Injectable()
export class LiveMessageSender extends MessageSender {
  private readonly logger = new Logger('Messages');

  constructor(private readonly config: AppConfig) {
    super();
  }

  async send(message: OutboundMessage): Promise<void> {
    if (message.channel !== 'whatsapp') {
      this.logger.warn(`Canal ${message.channel} non branché : message vers ${message.to} non envoyé.`);
      return;
    }
    const { WHATSAPP_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId } = this.config;
    if (!token || !phoneId) throw new Error('WhatsApp non configuré (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID).');

    const to = message.to.replace(/^\+/, '');
    const body = message.otpCode
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: this.config.WHATSAPP_OTP_TEMPLATE,
            language: { code: 'fr' },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: message.otpCode }] },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: message.otpCode }],
              },
            ],
          },
        }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: message.text } };

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`WhatsApp a refusé le message (${response.status}) : ${await response.text()}`);
    }
  }
}
