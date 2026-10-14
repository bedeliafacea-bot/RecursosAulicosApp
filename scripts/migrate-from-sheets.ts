/**
 * Script de Ingesta y Migración Directa a Supabase
 * 
 * Uso:
 * 1. Colocá el archivo "datos_migracion_uap.json" generado por export-from-sheets.gs
 *    en la carpeta scripts/ (o pasale la ruta como primer argumento).
 * 2. Asegurate de tener configuradas tus variables de entorno en .env.local:
 *    NEXT_PUBLIC_SUPABASE_URL=...
 *    SUPABASE_SERVICE_ROLE_KEY=...
 * 3. Ejecutá:
 *    npx ts-node --project tsconfig.json scripts/migrate-from-sheets.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar .env.local manualmente si no se cargó con dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const jsonPath = process.argv[2] 
    ? path.resolve(process.cwd(), process.argv[2]) 
    : path.resolve(__dirname, 'datos_migracion_uap.json');

  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️ Archivo de datos no encontrado en: ${jsonPath}`);
    console.log(`ℹ️ Para migrar datos existentes, ejecutá exportarTodoAJson() en Google Apps Script, descargá "datos_migracion_uap.json" y colocalo en scripts/datos_migracion_uap.json.`);
    return;
  }

  console.log(`🚀 Iniciando migración desde: ${jsonPath}`);
  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 1. Alumnos
  if (rawData.alumnos && rawData.alumnos.length > 0) {
    console.log(`📦 Migrando ${rawData.alumnos.length} alumnos...`);
    const alumnosPayload = rawData.alumnos.map((a: any) => ({
      legajo: String(a['ID/Legajo'] || a['Legajo'] || '').trim(),
      nombre: String(a['Nombre'] || '').trim(),
      plan: String(a['Plan'] || '20hs').toLowerCase().includes('10') ? '10hs' : '20hs',
      carrera: a['Carrera'] || null,
      telefono: a['Teléfono'] || a['Telefono'] || null,
      direccion: a['Dirección'] || a['Direccion'] || null,
      fecha_nacimiento: a['FechaNacimiento'] ? a['FechaNacimiento'].split(' ')[0] : null,
      activo: true
    })).filter((a: any) => a.legajo && a.nombre);

    if (alumnosPayload.length > 0) {
      const { error } = await supabase.from('alumnos').upsert(alumnosPayload, { onConflict: 'legajo' });
      if (error) console.error('Error insertando alumnos:', error.message);
      else console.log(`✅ ${alumnosPayload.length} alumnos migrados.`);
    }
  }

  // 2. Cumpleaños
  if (rawData.cumpleanos && rawData.cumpleanos.length > 0) {
    console.log(`📦 Migrando ${rawData.cumpleanos.length} cumpleaños...`);
    const cumpleanosPayload = rawData.cumpleanos.map((c: any) => ({
      nombre: String(c['Nombre'] || '').trim(),
      dia: parseInt(c['Dia'], 10) || 1,
      mes: parseInt(c['Mes'], 10) || 1,
      telefono: c['Telefono'] || null,
      tipo: String(c['Tipo'] || 'Alumno').trim()
    })).filter((c: any) => c.nombre);

    if (cumpleanosPayload.length > 0) {
      const { error } = await supabase.from('cumpleanos').insert(cumpleanosPayload);
      if (error) console.error('Error insertando cumpleaños:', error.message);
      else console.log(`✅ ${cumpleanosPayload.length} cumpleaños migrados.`);
    }
  }

  // 3. Registros Becuap
  if (rawData.registrosBecuap && rawData.registrosBecuap.length > 0) {
    console.log(`📦 Migrando ${rawData.registrosBecuap.length} registros Becuap...`);
    const becuapPayload = rawData.registrosBecuap.map((r: any) => {
      const legajo = String(r['Legajo'] || '').trim();
      let fecha = r['Fecha'] ? String(r['Fecha']).split(' ')[0] : new Date().toISOString().split('T')[0];
      return {
        legajo,
        fecha,
        entrada1: r['Entrada 1'] || r['Entrada1'] || null,
        salida1: r['Salida 1'] || r['Salida1'] || null,
        entrada2: r['Entrada 2'] || r['Entrada2'] || null,
        salida2: r['Salida 2'] || r['Salida2'] || null,
        total_decimal: parseFloat(r['Total Decimal'] || r['TotalDecimal'] || '0') || 0,
        observaciones: r['Observaciones'] || null
      };
    }).filter((r: any) => r.legajo);

    if (becuapPayload.length > 0) {
      // Insert en lotes de 100
      for (let i = 0; i < becuapPayload.length; i += 100) {
        const batch = becuapPayload.slice(i, i + 100);
        const { error } = await supabase.from('registros_becuap').insert(batch);
        if (error) console.error(`Error en lote ${i} de Becuap:`, error.message);
      }
      console.log(`✅ ${becuapPayload.length} registros Becuap procesados.`);
    }
  }

  // 4. Horarios Pactados
  if (rawData.horariosPactados && rawData.horariosPactados.length > 0) {
    console.log(`📦 Migrando ${rawData.horariosPactados.length} horarios pactados...`);
    const horariosPayload = rawData.horariosPactados.map((h: any) => ({
      legajo: String(h['Legajo'] || '').trim(),
      fecha: h['Fecha'] ? String(h['Fecha']).split(' ')[0] : '',
      rango_horario: String(h['Rango Horario'] || h['RangoHorario'] || '').trim()
    })).filter((h: any) => h.legajo && h.fecha);

    if (horariosPayload.length > 0) {
      const { error } = await supabase.from('horarios_pactados').upsert(horariosPayload, { onConflict: 'legajo,fecha' });
      if (error) console.error('Error horarios pactados:', error.message);
      else console.log(`✅ ${horariosPayload.length} horarios pactados migrados.`);
    }
  }

  // 5. Fotocopias / Oficina
  if (rawData.fotocopias && rawData.fotocopias.length > 0) {
    console.log(`📦 Migrando ${rawData.fotocopias.length} registros de fotocopias...`);
    const fotocopiasPayload = rawData.fotocopias.map((f: any) => ({
      fecha: f['Fecha'] ? String(f['Fecha']).split(' ')[0] : new Date().toISOString().split('T')[0],
      departamento: String(f['Departamento'] || 'Varios').trim(),
      cantidad: parseInt(f['Cantidad'], 10) || 1,
      tipo: String(f['Tipo'] || 'A4').trim(),
      precio_unitario: parseFloat(f['PrecioUnitario'] || '0') || 0,
      total: parseFloat(f['Total'] || '0') || 0,
      pagado: String(f['Pagado']).toLowerCase() === 'true' || String(f['Pagado']) === '1' || String(f['Pagado']).toLowerCase() === 'si',
      creado_por: f['CreadoPor'] || 'Migración'
    }));

    if (fotocopiasPayload.length > 0) {
      const { error } = await supabase.from('registro_fotocopias').insert(fotocopiasPayload);
      if (error) console.error('Error insertando fotocopias:', error.message);
      else console.log(`✅ ${fotocopiasPayload.length} fotocopias migradas.`);
    }
  }

  // 6. Cierres de Caja
  if (rawData.cierresCaja && rawData.cierresCaja.length > 0) {
    console.log(`📦 Migrando ${rawData.cierresCaja.length} cierres de caja...`);
    const cierresPayload = rawData.cierresCaja.map((c: any) => ({
      fecha: c['Fecha'] ? String(c['Fecha']).split(' ')[0] : new Date().toISOString().split('T')[0],
      turno: String(c['Turno'] || 'Mañana').trim(),
      total_efectivo: parseFloat(c['TotalEfectivo'] || '0') || 0,
      total_mp: parseFloat(c['TotalMP'] || '0') || 0,
      total_galicia: parseFloat(c['TotalGalicia'] || '0') || 0,
      total_facturado: parseFloat(c['TotalFacturado'] || '0') || 0,
      diferencia: parseFloat(c['Diferencia'] || '0') || 0,
      observaciones: c['Observaciones'] || null,
      creado_por: c['CreadoPor'] || 'Migración'
    }));

    if (cierresPayload.length > 0) {
      const { error } = await supabase.from('cierres_caja').insert(cierresPayload);
      if (error) console.error('Error insertando cierres de caja:', error.message);
      else console.log(`✅ ${cierresPayload.length} cierres de caja migrados.`);
    }
  }

  console.log('🎉 Migración finalizada con éxito.');
}

runMigration().catch(err => {
  console.error('Error fatal durante la migración:', err);
  process.exit(1);
});
