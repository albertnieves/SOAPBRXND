// Regenera supabase/seed.sql: pnpm seed:sql
import { writeFileSync } from 'node:fs';
import { SEED } from '../src/data/seed.ts';
import { seedSql } from '../src/data/seed-sql.ts';

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), seedSql(SEED));
console.log('supabase/seed.sql actualizado');
