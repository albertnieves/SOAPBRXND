import { getCatalog } from '@/modules/catalog/source';
import { roomData } from '@/modules/catalog/room';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(roomData(await getCatalog()), { headers: { 'cache-control': 'no-store' } });
}
