'use server';

import { createClient } from '@/lib/supabase/server';
import {
  Alumno,
  JornadaBecuap,
  HorarioPactado,
  EvaluacionBecuap,
  MesEvaluacionData,
} from '@/lib/types/database.types';
import { calcularHorasDecimales, diasDelMes, rangoMes } from '@/lib/horas';

// ==============================================================================
// 1. GESTIÓN DE ALUMNOS (CONSULTA Y ALTA)
// ==============================================================================

export async function buscarInfoAlumnoAction(
  termino: string
): Promise<{ ok: boolean; data?: Alumno; error?: string }> {
  try {
    const supabase = await createClient();
    const clean = termino.trim();

    if (!clean) return { ok: false, error: 'Ingresá un legajo o nombre.' };

    // Buscar primero por ID/Legajo exacto
    const { data: porId } = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', clean)
      .maybeSingle();

    if (porId) {
      return { ok: true, data: porId as Alumno };
    }

    // Si no coincide, buscar por coincidencia parcial de nombre
    const { data: porNombre, error } = await supabase
      .from('alumnos')
      .select('*')
      .ilike('nombre', `%${clean}%`)
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!porNombre) return { ok: false, error: 'Alumno no encontrado.' };

    return { ok: true, data: porNombre as Alumno };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al buscar alumno.' };
  }
}

export async function listarTodosAlumnosAction(): Promise<{
  ok: boolean;
  data?: Alumno[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as Alumno[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al listar alumnos.' };
  }
}

export async function guardarNuevoAlumnoAction(datos: {
  id: string; // Legajo
  nombre: string;
  plan: '10hs' | '20hs';
  carrera?: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const cleanId = datos.id.trim();
    const cleanNombre = datos.nombre.trim();

    if (!cleanId || !cleanNombre || !datos.plan) {
      return { ok: false, error: 'Completá Legajo, Nombre y Plan.' };
    }

    const { error } = await supabase.from('alumnos').insert({
      id: cleanId,
      nombre: cleanNombre,
      plan: datos.plan,
      carrera: datos.carrera?.trim() || null,
      telefono: datos.telefono?.trim() || null,
      direccion: datos.direccion?.trim() || null,
      fecha_nacimiento: datos.fecha_nacimiento || null,
    });

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ya existe un alumno con ese N° de Legajo.' };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al registrar alumno.' };
  }
}

// ==============================================================================
// 2. JORNADAS DIARIAS (CARGA, EDICIÓN, ELIMINACIÓN)
// ==============================================================================

export async function registrarJornadasBatchAction(
  alumnoId: string,
  jornadas: Array<{
    fecha: string;
    entrada_1?: string | null;
    salida_1?: string | null;
    entrada_2?: string | null;
    salida_2?: string | null;
    observacion?: string | null;
  }>,
  permitirDuplicados = false
): Promise<{ ok: boolean; error?: string; fechasDuplicadas?: string[] }> {
  try {
    const supabase = await createClient();

    // Avisar si alguna fecha ya tiene jornada cargada o se repite en el lote
    if (!permitirDuplicados && jornadas.length > 0) {
      const fechas = jornadas.map((j) => j.fecha);
      const { data: existentes, error: errExist } = await supabase
        .from('jornadas_becuap')
        .select('fecha')
        .eq('alumno_id', alumnoId)
        .in('fecha', fechas);

      if (errExist) return { ok: false, error: errExist.message };

      const repetidas = new Set<string>((existentes || []).map((e: { fecha: string }) => e.fecha));
      fechas.forEach((f, i) => {
        if (fechas.indexOf(f) !== i) repetidas.add(f);
      });

      if (repetidas.size > 0) {
        return { ok: false, fechasDuplicadas: Array.from(repetidas).sort() };
      }
    }

    const inserts = jornadas.map((j) => {
      const totalDecimal = calcularHorasDecimales(
        j.entrada_1,
        j.salida_1,
        j.entrada_2,
        j.salida_2
      );

      return {
        alumno_id: alumnoId,
        fecha: j.fecha,
        entrada_1: j.entrada_1 || null,
        salida_1: j.salida_1 || null,
        entrada_2: j.entrada_2 || null,
        salida_2: j.salida_2 || null,
        total_decimal: totalDecimal,
        observacion: j.observacion?.trim() || null,
      };
    });

    const { error } = await supabase.from('jornadas_becuap').insert(inserts);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar jornadas.' };
  }
}

export async function listarJornadasAlumnoAction(
  alumnoId: string,
  mes: number,
  anio: number
): Promise<{ ok: boolean; data?: JornadaBecuap[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { inicio: inicioMes, fin: finMes } = rangoMes(anio, mes);

    const { data, error } = await supabase
      .from('jornadas_becuap')
      .select('*')
      .eq('alumno_id', alumnoId)
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .order('fecha', { ascending: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as JornadaBecuap[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al listar jornadas.' };
  }
}

export async function actualizarJornadaAction(datos: {
  id: string;
  fecha: string;
  entrada_1?: string | null;
  salida_1?: string | null;
  entrada_2?: string | null;
  salida_2?: string | null;
  observacion?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const totalDecimal = calcularHorasDecimales(
      datos.entrada_1,
      datos.salida_1,
      datos.entrada_2,
      datos.salida_2
    );

    const { error } = await supabase
      .from('jornadas_becuap')
      .update({
        fecha: datos.fecha,
        entrada_1: datos.entrada_1 || null,
        salida_1: datos.salida_1 || null,
        entrada_2: datos.entrada_2 || null,
        salida_2: datos.salida_2 || null,
        total_decimal: totalDecimal,
        observacion: datos.observacion?.trim() || null,
      })
      .eq('id', datos.id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al actualizar jornada.' };
  }
}

export async function eliminarJornadaAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('jornadas_becuap')
      .delete()
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al eliminar jornada.' };
  }
}

// ==============================================================================
// 3. HORARIOS PACTADOS MENSUALES
// ==============================================================================

export async function obtenerHorariosPactadosAction(
  alumnoId: string,
  mes: number,
  anio: number
): Promise<{ ok: boolean; data?: HorarioPactado[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { inicio: inicioMes, fin: finMes } = rangoMes(anio, mes);

    const { data, error } = await supabase
      .from('horarios_pactados')
      .select('*')
      .eq('alumno_id', alumnoId)
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .order('fecha', { ascending: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as HorarioPactado[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener horarios pactados.' };
  }
}

export async function registrarHorariosPactadosMasivosAction(datos: {
  alumnoId: string;
  mes: number;
  anio: number;
  bloques: Array<{ rango: string; diasTexto: string }>;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const registros: Array<{ alumno_id: string; fecha: string; rango_horario: string }> = [];

    for (const b of datos.bloques) {
      if (!b.rango.trim() || !b.diasTexto.trim()) continue;

      const dias = b.diasTexto
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => !isNaN(d) && d >= 1 && d <= diasDelMes(datos.anio, datos.mes));

      for (const d of dias) {
        const diaStr = d < 10 ? `0${d}` : `${d}`;
        const mesStr = datos.mes < 10 ? `0${datos.mes}` : `${datos.mes}`;
        const fechaStr = `${datos.anio}-${mesStr}-${diaStr}`;

        registros.push({
          alumno_id: datos.alumnoId,
          fecha: fechaStr,
          rango_horario: b.rango.trim(),
        });
      }
    }

    if (registros.length === 0) {
      return { ok: false, error: 'No se ingresaron días válidos.' };
    }

    const { error } = await supabase.from('horarios_pactados').insert(registros);
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar cronograma pactado.' };
  }
}

// ==============================================================================
// 4. EVALUACIONES CUATRIMESTRALES (BECUAP)
// ==============================================================================

export async function obtenerInfoEvaluacionAction(
  alumnoId: string,
  cuatrimestre: 1 | 2,
  anio: number
): Promise<{
  ok: boolean;
  alumno?: Alumno;
  fechaInicioPlan?: string;
  evaluacion?: EvaluacionBecuap | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Obtener alumno
    const { data: alumno, error: errAl } = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', alumnoId)
      .maybeSingle();

    if (errAl) return { ok: false, error: errAl.message };
    if (!alumno) return { ok: false, error: 'Alumno no encontrado.' };

    // 2. Obtener la primera jornada histórica para determinar la fecha de inicio en el plan
    const { data: primeraJornada } = await supabase
      .from('jornadas_becuap')
      .select('fecha')
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: true })
      .limit(1);

    let fechaInicioPlan = 'Sin cargas previas';
    if (primeraJornada && primeraJornada.length > 0) {
      const [y, m, d] = primeraJornada[0].fecha.split('-');
      fechaInicioPlan = `${d}/${m}/${y}`;
    }

    // 3. Obtener registro de evaluación
    const { data: evaluacion } = await supabase
      .from('evaluaciones_becuap')
      .select('*')
      .eq('alumno_id', alumnoId)
      .eq('cuatrimestre', cuatrimestre)
      .eq('anio', anio)
      .maybeSingle();

    return {
      ok: true,
      alumno: alumno as Alumno,
      fechaInicioPlan,
      evaluacion: (evaluacion as EvaluacionBecuap) || null,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener evaluación.' };
  }
}

export async function guardarMesEvaluacionAction(datos: {
  alumnoId: string;
  cuatrimestre: 1 | 2;
  anio: number;
  mesNombre: string; // 'marzo', 'abril', etc.
  datosMes: MesEvaluacionData;
  obsGeneral?: string;
  fechaInicioPlan?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const colMes = datos.mesNombre.toLowerCase();

    // 1. Obtener evaluación actual si existe
    const { data: existente } = await supabase
      .from('evaluaciones_becuap')
      .select('*')
      .eq('alumno_id', datos.alumnoId)
      .eq('cuatrimestre', datos.cuatrimestre)
      .eq('anio', datos.anio)
      .maybeSingle();

    const meses = [
      'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre',
    ];

    const payload: any = {
      alumno_id: datos.alumnoId,
      cuatrimestre: datos.cuatrimestre,
      anio: datos.anio,
      departamento: 'Recursos Áulicos',
      fecha_inicio_plan: datos.fechaInicioPlan || existente?.fecha_inicio_plan || null,
      obs_general: datos.obsGeneral !== undefined ? datos.obsGeneral : existente?.obs_general || null,
      [colMes]: datos.datosMes,
    };

    // 2. Calcular promedio general sumando todas las notas de todos los meses guardados
    let sumaNotas = 0;
    let cantNotas = 0;

    for (const m of meses) {
      const mesData: MesEvaluacionData | null =
        m === colMes ? datos.datosMes : existente ? (existente as any)[m] : null;

      if (mesData && Array.isArray(mesData.notas)) {
        for (const n of mesData.notas) {
          if (n !== null && !isNaN(Number(n))) {
            sumaNotas += Number(n);
            cantNotas++;
          }
        }
      }
    }

    const promedio = cantNotas > 0 ? parseFloat((sumaNotas / cantNotas).toFixed(2)) : null;
    payload.promedio = promedio;

    // 3. Upsert en base de datos
    const { error } = await supabase
      .from('evaluaciones_becuap')
      .upsert(payload, { onConflict: 'alumno_id,cuatrimestre,anio' });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar mes de evaluación.' };
  }
}
