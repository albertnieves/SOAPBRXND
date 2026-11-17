/*
 * Cliente con la clave de servicio: solo en el servidor y solo para llamar a
 * las funciones checkout_* / order_status / holds_release_expired.
 */
import { createClient } from '@supabase/supabase-js';

export class RpcError extends Error {}

export async function serviceRpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new RpcError('service_not_configured');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new RpcError(error.message);
  return data as T;
}
