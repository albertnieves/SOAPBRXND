/* Elige la fuente del catálogo: Supabase si está configurado, si no la semilla (modo demo). */
import { seedData } from './seed-source';
import { supabaseData } from './supabase-source';
import { CatalogView } from './view';

export function isDemo(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export async function getCatalog(now: Date = new Date()): Promise<CatalogView> {
  const data = isDemo()
    ? seedData()
    : await supabaseData(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return new CatalogView(data, now);
}
