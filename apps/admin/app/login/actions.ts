'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError, DEVICE_COOKIE, TOKEN_COOKIE, publicApi } from '@/lib/api';

const PENDING_COOKIE = 'kle_admin_pending';
const secure = process.env.NODE_ENV === 'production';

export type LoginState =
  | { step: 'phone'; error?: string }
  | { step: 'code'; phone: string; devCode?: string; error?: string }
  | { step: 'mfa'; error?: string };

/** Connexion de l'équipe : code reçu sur WhatsApp, puis code de l'application d'authentification. */
export async function loginStep(state: LoginState, form: FormData): Promise<LoginState> {
  const jar = await cookies();
  try {
    if (state.step === 'phone') {
      const phone = String(form.get('phone') ?? '').trim();
      const res = await publicApi<{ devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone, channel: 'whatsapp' }),
      });
      return { step: 'code', phone, devCode: res.devCode };
    }

    if (state.step === 'code') {
      let deviceId = jar.get(DEVICE_COOKIE)?.value;
      if (!deviceId) {
        deviceId = `admin-${randomBytes(16).toString('hex')}`;
        jar.set(DEVICE_COOKIE, deviceId, { httpOnly: true, secure, sameSite: 'strict', maxAge: 365 * 86_400, path: '/' });
      }
      const res = await publicApi<{ accessToken: string; requiresMfa: boolean }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: state.phone, code: String(form.get('code') ?? '').trim(), deviceId, deviceName: 'Back-office' }),
      });
      if (!res.requiresMfa) return { step: 'phone', error: 'Ce numéro n’est pas un compte de l’équipe Klé.' };
      jar.set(PENDING_COOKIE, res.accessToken, { httpOnly: true, secure, sameSite: 'strict', maxAge: 600, path: '/' });
      return { step: 'mfa' };
    }

    const pending = jar.get(PENDING_COOKIE)?.value;
    if (!pending) return { step: 'phone', error: 'Session expirée, recommence.' };
    const res = await publicApi<{ accessToken: string }>(
      '/auth/mfa',
      { method: 'POST', body: JSON.stringify({ code: String(form.get('code') ?? '').trim() }) },
      pending,
    );
    jar.delete(PENDING_COOKIE);
    jar.set(TOKEN_COOKIE, res.accessToken, { httpOnly: true, secure, sameSite: 'strict', maxAge: 12 * 3600, path: '/' });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Service indisponible.';
    return { ...state, error: message };
  }
  redirect('/');
}

export async function logout() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect('/login');
}
