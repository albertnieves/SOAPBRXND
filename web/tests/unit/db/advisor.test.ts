/*
 * Lo mismo que mira el advisor de Supabase (splinter), comprobado contra las
 * migraciones reales: si una migración nueva lo rompe, la CI se pone en rojo
 * antes de que aparezca el aviso en el panel de Supabase.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, freshDb } from './pg';

let db: PGlite;
beforeAll(async () => { db = await freshDb(); });

const rows = async <T>(sql: string) => (await db.query<T>(sql)).rows;

describe('advisor de seguridad', () => {
  it('ninguna vista pública se ejecuta con los permisos de su dueño (security_definer_view)', async () => {
    const views = await rows<{ relname: string; invoker: boolean }>(`
      select c.relname, coalesce('security_invoker=true' = any(c.reloptions), false) as invoker
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v'`);
    expect(views.length).toBeGreaterThan(0);
    expect(views.filter((v) => !v.invoker).map((v) => v.relname)).toEqual([]);
  });

  it('todas las tablas públicas tienen RLS (rls_disabled_in_public)', async () => {
    const t = await rows<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(t).toEqual([]);
  });

  it('todas las funciones fijan search_path (function_search_path_mutable)', async () => {
    const f = await rows<{ proname: string }>(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private')
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
    expect(f).toEqual([]);
  });

  it('anon y authenticated no ejecutan funciones security definer de la API', async () => {
    const f = await rows<{ proname: string; role: string }>(`
      select p.proname, r.role from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join (values ('anon'), ('authenticated')) r(role)
      where n.nspname = 'public' and p.prosecdef and has_function_privilege(r.role, p.oid, 'execute')`);
    expect(f).toEqual([]);
  });

  // Postgres da EXECUTE a PUBLIC en cada función nueva: si aparece aquí una
  // función nueva, falta su «revoke all on function private.x(...) from public».
  it('en private solo se puede ejecutar lo que necesita el catálogo público (permisos explícitos)', async () => {
    const f = await rows<{ proname: string }>(`
      select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and (has_function_privilege('anon', p.oid, 'execute')
                                    or has_function_privilege('authenticated', p.oid, 'execute'))
      order by 1`);
    expect(f.map((x) => x.proname)).toEqual(['drop_open', 'drop_visible', 'held']);
  });
});

describe('advisor de rendimiento', () => {
  it('toda clave foránea tiene un índice que empieza por ella (unindexed_foreign_keys)', async () => {
    const fk = await rows<{ fk: string }>(`
      select c.conrelid::regclass || '.' || c.conname as fk
      from pg_constraint c join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] = c.conkey
        )
      order by 1`);
    expect(fk.map((x) => x.fk)).toEqual([]);
  });
});
