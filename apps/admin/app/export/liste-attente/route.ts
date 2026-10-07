import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from '@/lib/api';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** Relaie l'export CSV de l'API avec le jeton de l'équipe (l'export est journalisé côté API). */
export async function GET() {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return new Response('Non connecté', { status: 401 });
  const res = await fetch(`${API_URL}/admin/waitlist.csv`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) return new Response('Export indisponible', { status: res.status });
  return new Response(await res.text(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kle-liste-attente-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
