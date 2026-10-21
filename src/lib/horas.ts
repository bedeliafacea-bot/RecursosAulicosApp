// ==============================================================================
// CÁLCULO DE HORAS BECUAP Y FECHAS EN HORA ARGENTINA
// Funciones puras, usables tanto en Server Actions como en componentes cliente.
// ==============================================================================

export const ZONA_HORARIA_UAP = 'America/Argentina/Buenos_Aires';

/** "HH:mm" o "HH:mm:ss" -> minutos desde las 00:00. Vacío o inválido -> null. */
export function aMinutos(t?: string | null): number | null {
  if (!t || !t.includes(':')) return null;
  const [h, m] = t.split(':').map((p) => parseInt(p, 10));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/** Minutos de un turno. Turno incompleto o salida <= entrada -> 0 (igual que el legacy). */
function minutosTurno(e?: string | null, s?: string | null): number {
  const me = aMinutos(e);
  const ms = aMinutos(s);
  if (me === null || ms === null) return 0;
  return Math.max(0, ms - me);
}

/** Minutos exactos trabajados en una jornada de hasta dos turnos. */
export function minutosJornada(
  e1?: string | null,
  s1?: string | null,
  e2?: string | null,
  s2?: string | null
): number {
  return minutosTurno(e1, s1) + minutosTurno(e2, s2);
}

/** Valor decimal a guardar en `total_decimal` (misma regla que Codigo.gs). */
export function calcularHorasDecimales(
  e1?: string | null,
  s1?: string | null,
  e2?: string | null,
  s2?: string | null
): number {
  return Math.round((minutosJornada(e1, s1, e2, s2) / 60) * 100) / 100;
}

/**
 * Minutos de una jornada guardada. Se recalcula desde las horas para no
 * arrastrar el redondeo a 2 decimales; `total_decimal` es solo respaldo.
 */
export function minutosDeRegistro(j: {
  entrada_1?: string | null;
  salida_1?: string | null;
  entrada_2?: string | null;
  salida_2?: string | null;
  total_decimal?: number | string | null;
}): number {
  const desdeHoras = minutosJornada(j.entrada_1, j.salida_1, j.entrada_2, j.salida_2);
  if (desdeHoras > 0) return desdeHoras;
  return Math.round((Number(j.total_decimal) || 0) * 60);
}

/**
 * Suma exacta en minutos enteros de un conjunto de jornadas. Dos registros con
 * la misma fecha y los mismos horarios se cuentan una sola vez: es una carga
 * repetida (doble clic, importación corrida dos veces), no dos turnos reales.
 */
export function totalMinutosJornadas(
  jornadas: (Parameters<typeof minutosDeRegistro>[0] & { fecha?: string })[]
): number {
  const vistas = new Set<string>();
  let total = 0;
  for (const j of jornadas) {
    const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');
    const clave = [j.fecha, hhmm(j.entrada_1), hhmm(j.salida_1), hhmm(j.entrada_2), hhmm(j.salida_2)].join('|');
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    total += minutosDeRegistro(j);
  }
  return total;
}

/** 1290 -> "21:30". Nunca produce "x:60". */
export function formatearMinutos(totalMin: number): string {
  const min = Math.max(0, Math.round(totalMin));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m < 10 ? '0' + m : m}`;
}

/** Equivalente seguro de `convertirDecimalAHora` del legacy. */
export function convertirDecimalAHora(decimal: number): string {
  return formatearMinutos(Math.round((Number(decimal) || 0) * 60));
}

/** Días del mes (mes 1-12), sin depender de la zona horaria. */
export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Meta mensual de la planilla de Google Sheets. */
export function metaHorasMensual(plan: string | null | undefined, anio: number, mes: number): number {
  const mes31 = diasDelMes(anio, mes) === 31;
  if (plan && plan.includes('10')) return mes31 ? 45 : 43;
  return mes31 ? 89 : 86;
}

/** Fecha de hoy en Argentina como "YYYY-MM-DD" (no UTC: a las 22:00 ART sigue siendo hoy). */
export function fechaHoyAR(ahora: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_UAP,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/** Mes (1-12) y año actuales en Argentina. */
export function mesAnioActualAR(ahora: Date = new Date()): { mes: number; anio: number } {
  const [anio, mes] = fechaHoyAR(ahora).split('-').map(Number);
  return { mes, anio };
}

/** Rango [inicio, fin] de un mes como strings DATE de Postgres. */
export function rangoMes(anio: number, mes: number): { inicio: string; fin: string } {
  const mm = mes < 10 ? `0${mes}` : `${mes}`;
  const dd = diasDelMes(anio, mes);
  return { inicio: `${anio}-${mm}-01`, fin: `${anio}-${mm}-${dd < 10 ? '0' + dd : dd}` };
}

/** "2026-10-31" + 1 -> "2026-11-01" (aritmética en UTC, sin corrimientos). */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/**
 * Turnos de un rango pactado: "07:30 - 11:30" o "07:30 - 11:30 / 14:00 - 16:00".
 * Toma las horas en orden: las dos primeras son el turno 1 y las siguientes el turno 2.
 */
export function parsearRangoPactado(rango: string): { e1: string; s1: string; e2: string; s2: string } | null {
  const horas = (rango.match(/\d{1,2}[:.]\d{2}/g) || []).map((h) => {
    const [hh, mm] = h.replace('.', ':').split(':');
    return `${hh.padStart(2, '0')}:${mm}`;
  });
  if (horas.length < 2) return null;
  return { e1: horas[0], s1: horas[1], e2: horas[2] || '', s2: horas[3] || '' };
}

export interface RangoHorarioPactado {
  entrada: string;
  salida: string;
}

/** Valida uno o dos turnos pactados expresados como "07:30 - 11:30 / 14:00 - 16:00". */
export function parsearRangosPactados(rango: string): RangoHorarioPactado[] | null {
  const horas = rango.match(/\d{1,2}[:.]\d{2}/g);
  if (!horas || (horas.length !== 2 && horas.length !== 4)) return null;

  const rangos: RangoHorarioPactado[] = [];
  for (let index = 0; index < horas.length; index += 2) {
    const normalizarHora = (hora: string) => {
      const [horaTexto, minutoTexto] = hora.replace('.', ':').split(':');
      const horaNumero = Number(horaTexto);
      const minutoNumero = Number(minutoTexto);
      if (
        !Number.isInteger(horaNumero) ||
        !Number.isInteger(minutoNumero) ||
        horaNumero < 0 ||
        horaNumero > 23 ||
        minutoNumero < 0 ||
        minutoNumero > 59
      ) {
        return null;
      }
      return `${String(horaNumero).padStart(2, '0')}:${String(minutoNumero).padStart(2, '0')}`;
    };

    const entrada = normalizarHora(horas[index]);
    const salida = normalizarHora(horas[index + 1]);
    if (!entrada || !salida || aMinutos(salida)! <= aMinutos(entrada)!) return null;
    rangos.push({ entrada, salida });
  }

  return rangos;
}

export function minutosRangosPactados(rango: string): number | null {
  const rangos = parsearRangosPactados(rango);
  if (!rangos) return null;
  return rangos.reduce((total, turno) => total + minutosTurno(turno.entrada, turno.salida), 0);
}

/** Saldo pactado acumulado: positivo si sobran horas y negativo si faltan. */
export function saldoPactadoArrastrado(
  horarios: { fecha: string; rango_horario: string }[],
  plan: string | null | undefined,
  anio: number,
  mes: number
): number {
  const mesActualIndice = anio * 12 + mes - 1;
  const minutosPorMes = new Map<number, number>();

  for (const horario of horarios) {
    const [anioHorario, mesHorario] = horario.fecha.split('-').map(Number);
    if (!anioHorario || !mesHorario) continue;
    const indice = anioHorario * 12 + mesHorario - 1;
    if (indice >= mesActualIndice) continue;
    const minutos = minutosRangosPactados(horario.rango_horario);
    if (minutos === null) continue;
    minutosPorMes.set(indice, (minutosPorMes.get(indice) || 0) + minutos);
  }

  const mesesAnteriores = [...minutosPorMes.entries()].sort(([a], [b]) => a - b);
  let saldo = 0;
  let mesAnteriorIndice: number | null = null;

  for (const [indice, minutosPactados] of mesesAnteriores) {
    if (mesAnteriorIndice !== null && indice !== mesAnteriorIndice + 1) {
      saldo = 0;
    }
    const anioHorario = Math.floor(indice / 12);
    const mesHorario = (indice % 12) + 1;
    const meta = metaHorasMensual(plan, anioHorario, mesHorario) * 60;
    saldo += minutosPactados - meta;
    mesAnteriorIndice = indice;
  }

  if (mesAnteriorIndice !== mesActualIndice - 1) return 0;
  return saldo;
}
