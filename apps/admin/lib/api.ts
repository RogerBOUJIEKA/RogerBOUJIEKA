import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
export const TOKEN_COOKIE = 'kle_admin_token';
export const DEVICE_COOKIE = 'kle_admin_device';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text;
  if (!response.ok) {
    const b = (typeof body === 'object' ? body : {}) as { code?: string; message?: string | string[] };
    const message = Array.isArray(b.message) ? b.message.join(', ') : (b.message ?? 'Erreur inattendue.');
    throw new ApiError(response.status, b.code ?? 'error', message);
  }
  return body as T;
}

/** Appel authentifié avec le jeton de l'équipe ; renvoie vers la connexion s'il n'est plus valable. */
export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) redirect('/login');
  try {
    return await call<T>(path, init, token);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.code === 'mfa_required' || error.code === 'staff_only')) {
      redirect('/login?expire=1');
    }
    throw error;
  }
}

export function publicApi<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  return call<T>(path, init, token);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return adminApi<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export interface Me {
  id: string;
  fullName: string | null;
  phone: string;
  staffRole: 'moderator' | 'supervisor' | 'admin' | null;
}
