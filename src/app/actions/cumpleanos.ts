'use server';

import { createClient } from '@/lib/supabase/server';

export interface Cumpleanero {
  id: string;
  nombre: string;
  carrera: string | null;
  fechaTexto: string; // "DD/MM"
  fechaCompleta: string; // "YYYY-MM-DD"
  diasFaltantes: number;
  esHoy: boolean;
}

export async function obtenerCumpleanosProximosAction(): Promise<{
  ok: boolean;
  data?: Cumpleanero[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: alumnos, error } = await supabase
      .from('alumnos')
      .select('id, nombre, carrera, fecha_nacimiento')
      .not('fecha_nacimiento', 'is', null);

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!alumnos || alumnos.length === 0) {
      return { ok: true, data: [] };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() + 15);

    const proximos: Cumpleanero[] = [];

    for (const al of alumnos) {
      if (!al.fecha_nacimiento) continue;

      // Parsear fecha nacimiento YYYY-MM-DD
      const partes = al.fecha_nacimiento.split('-');
      const mesNac = parseInt(partes[1], 10) - 1; // 0-indexed
      const diaNac = parseInt(partes[2], 10);

      // Cumpleaños en este año calendario
      let cumpleEsteAnio = new Date(hoy.getFullYear(), mesNac, diaNac);

      // Si ya pasó en este año, revisar para el año siguiente (cruces dic -> ene)
      if (cumpleEsteAnio < hoy) {
        cumpleEsteAnio = new Date(hoy.getFullYear() + 1, mesNac, diaNac);
      }

      // Si cae en la ventana de los próximos 15 días
      if (cumpleEsteAnio >= hoy && cumpleEsteAnio <= fechaLimite) {
        const diffMs = cumpleEsteAnio.getTime() - hoy.getTime();
        const diasFaltantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

        const diaFormateado = diaNac < 10 ? `0${diaNac}` : `${diaNac}`;
        const mesFormateado = mesNac + 1 < 10 ? `0${mesNac + 1}` : `${mesNac + 1}`;

        // Capitalizar nombre
        const nombreCapitalizado = al.nombre
          .split(' ')
          .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .join(' ');

        proximos.push({
          id: al.id,
          nombre: nombreCapitalizado,
          carrera: al.carrera,
          fechaTexto: `${diaFormateado}/${mesFormateado}`,
          fechaCompleta: al.fecha_nacimiento,
          diasFaltantes,
          esHoy: diasFaltantes === 0,
        });
      }
    }

    // Ordenar por cercanía de fecha
    proximos.sort((a, b) => a.diasFaltantes - b.diasFaltantes);

    return { ok: true, data: proximos };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener cumpleaños.' };
  }
}
