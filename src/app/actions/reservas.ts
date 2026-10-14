'use server';

import { createClient } from '@/lib/supabase/server';
import {
  ReservaMatriz,
  ReservaEspecial,
  Profesor,
  DiaSemana,
  EstadoReserva,
} from '@/lib/types/database.types';

export async function obtenerReservasPorDiaAction(
  dia: DiaSemana
): Promise<{ ok: boolean; data?: ReservaMatriz[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('reservas_matriz')
      .select('*')
      .eq('dia', dia)
      .order('hora_inicio', { ascending: true });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as ReservaMatriz[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener reservas.' };
  }
}

export async function registrarReservaMatrizAction(reserva: {
  dia: DiaSemana;
  profesor_nombre: string;
  profesor_id?: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string;
  recurso: string;
  estado?: EstadoReserva;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('reservas_matriz').insert({
      dia: reserva.dia,
      profesor_nombre: reserva.profesor_nombre.trim(),
      profesor_id: reserva.profesor_id || null,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      aula: reserva.aula.trim(),
      recurso: reserva.recurso.trim(),
      estado: reserva.estado || 'Pendiente',
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al registrar reserva.' };
  }
}

export async function actualizarReservaMatrizAction(reserva: {
  id: string;
  dia: DiaSemana;
  profesor_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string;
  recurso: string;
  estado: EstadoReserva;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('reservas_matriz')
      .update({
        dia: reserva.dia,
        profesor_nombre: reserva.profesor_nombre.trim(),
        hora_inicio: reserva.hora_inicio,
        hora_fin: reserva.hora_fin,
        aula: reserva.aula.trim(),
        recurso: reserva.recurso.trim(),
        estado: reserva.estado,
      })
      .eq('id', reserva.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al actualizar reserva.' };
  }
}

export async function cambiarEstadoReservaMatrizAction(
  id: string,
  estado: EstadoReserva
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('reservas_matriz')
      .update({ estado })
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al cambiar estado.' };
  }
}

export async function eliminarReservaMatrizAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('reservas_matriz')
      .delete()
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al eliminar reserva.' };
  }
}

export async function obtenerProfesoresActivosAction(): Promise<{
  ok: boolean;
  data?: Profesor[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profesores')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as Profesor[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener profesores.' };
  }
}

// ==============================================================================
// RESERVAS ESPECIALES
// ==============================================================================

export async function obtenerReservasEspecialesAction(): Promise<{
  ok: boolean;
  data?: ReservaEspecial[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('reservas_especiales')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as ReservaEspecial[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener reservas especiales.' };
  }
}

export async function registrarReservaEspecialAction(reserva: {
  fecha: string;
  departamento: string;
  equipo: string;
  horario: string;
  observaciones?: string;
  telefono?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('reservas_especiales').insert({
      fecha: reserva.fecha,
      departamento: reserva.departamento.trim(),
      equipo: reserva.equipo.trim(),
      horario: reserva.horario.trim(),
      observaciones: reserva.observaciones?.trim() || null,
      telefono: reserva.telefono?.trim() || null,
      entregado: false,
      devuelto: false,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al registrar reserva especial.' };
  }
}

export async function toggleEstadoReservaEspecialAction(
  id: string,
  campo: 'entregado' | 'devuelto',
  valor: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('reservas_especiales')
      .update({ [campo]: valor })
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al actualizar reserva especial.' };
  }
}
