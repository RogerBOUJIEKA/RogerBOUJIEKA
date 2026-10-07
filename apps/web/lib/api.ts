import 'server-only';

/** Appels à l'API Klé depuis le serveur Next.js (l'adresse de l'API n'est jamais exposée). */
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { revalidate?: number | false } = {},
): Promise<T> {
  const { revalidate, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...rest.headers },
      next: revalidate === undefined ? undefined : { revalidate },
      cache: revalidate === undefined ? 'no-store' : undefined,
    });
  } catch {
    throw new ApiError(503, 'api_unreachable', 'Le service est momentanément indisponible. Réessaie dans un instant.');
  }
  const body = (await response.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    issues?: Array<{ path: string; message: string }>;
  };
  if (!response.ok) {
    throw new ApiError(response.status, body.code ?? 'error', body.message ?? 'Une erreur est survenue.', body.issues);
  }
  return body as T;
}

export interface ListingView {
  id: string;
  ref: string;
  category: 'rental' | 'coming_soon';
  status: string;
  availability: 'Disponible' | 'Bientôt disponible' | 'Pris';
  type: string;
  title: string;
  monthlyRent: number;
  advanceMonths: number;
  deposit: number;
  currency: string;
  city: { id: string; name: string };
  district: { id: string; name: string };
  approxLocation: { latitude: number; longitude: number };
  amenities: import('@kle/shared').Amenities;
  availableFrom: string | null;
  comingSoon: null | {
    departureDate: string;
    landlordConditions?: string;
    handoverAmount: number;
    warning: string;
  };
  media: Array<{ id: string; kind: 'video' | 'photo'; playbackUrl: string | null; thumbnailUrl: string | null }>;
  publisher: {
    id: string;
    displayName: string;
    verified: boolean;
    averageRating: number | null;
    reviewsCount: number;
    listingsCount: number;
    rentedCount: number;
    memberSince: string | null;
  };
  comparison: { agentCommission: number; packPrice: number; successFee: number; kleTotal: number; savings: number };
  badges: string[];
  validatedVisits: number;
  publishedAt: string | null;
  shareUrl: string;
}

export interface WaitlistStats {
  total: number;
  byRole: { seeker: number; landlord: number; outgoing_tenant: number };
  goals: { waitlistSignups: number; landlordsReady: number };
}

export interface City {
  id: string;
  code: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
  slug: string;
}
