import { safeEqual } from '@/lib/env';
import { serviceRpc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get('authorization') ?? '', `Bearer ${secret}`)) return new Response('unauthorized', { status: 401 });
  const released = await serviceRpc<number>('holds_release_expired');
  return Response.json({ released });
}
