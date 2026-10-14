/**
 * Limpieza de la migración CSV corrida 3 veces (14/10/2026 16:09, 16:10 y 16:11 UTC).
 *
 * `migrate-from-csv.ts` usaba insert sin control, así que cada corrida volvió a
 * insertar todas las filas: jornadas, horarios pactados, fotocopias, pagos en
 * efectivo, reservas y cierres de caja quedaron triplicados (las horas del
 * alumno salían ×3).
 *
 * Se conserva la primera corrida (16:09) y se borran las filas creadas por las
 * otras dos. Antes de borrar se guarda un backup completo en backups/.
 *
 *   npx tsx scripts/limpiar-duplicados-migracion.ts            -> solo muestra qué haría
 *   npx tsx scripts/limpiar-duplicados-migracion.ts --aplicar  -> backup + borrado
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
    }
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}
const supabase = createClient(url, key);

const TABLAS = [
  'jornadas_becuap',
  'horarios_pactados',
  'fotocopias',
  'pagos_efectivo',
  'reservas_especiales',
  'cierres_caja',
  'reservas_matriz',
];

// Ventana de las corridas repetidas (la de 16:09 se conserva)
const DESDE = '2026-10-14T16:10:00Z';
const HASTA = '2026-10-14T16:12:00Z';

const aplicar = process.argv.includes('--aplicar');

async function leerTodo(tabla: string): Promise<any[]> {
  let filas: any[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from(tabla).select('*').order('id').range(desde, desde + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas = filas.concat(data || []);
    if (!data || data.length < 1000) break;
  }
  return filas;
}

async function main() {
  const backup: Record<string, any[]> = {};

  for (const tabla of TABLAS) {
    const filas = await leerTodo(tabla);
    backup[tabla] = filas;
    const repetidas = filas.filter((f) => f.creado_en >= DESDE && f.creado_en < HASTA).length;
    console.log(`${tabla}: ${filas.length} filas, se borrarían ${repetidas}, quedarían ${filas.length - repetidas}`);
  }

  if (!aplicar) {
    console.log('\nModo prueba: no se borró nada. Para aplicar: --aplicar');
    return;
  }

  fs.mkdirSync('backups', { recursive: true });
  const archivo = path.join('backups', `antes-de-deduplicar-${Date.now()}.json`);
  fs.writeFileSync(archivo, JSON.stringify(backup));
  console.log(`\nBackup completo guardado en ${archivo}`);

  for (const tabla of TABLAS) {
    const { count, error } = await supabase
      .from(tabla)
      .delete({ count: 'exact' })
      .gte('creado_en', DESDE)
      .lt('creado_en', HASTA);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    console.log(`  ${tabla}: ${count} filas borradas`);
  }
  console.log('\nListo.');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
