'use server';

import { createClient } from '@/lib/supabase/server';
import { AulaPlanoSecu } from '@/lib/types/database.types';

export async function obtenerAulasPlanoAction(): Promise<{
  ok: boolean;
  data?: AulaPlanoSecu[];
  planoActivo?: 'PB' | 'PA';
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: aulas, error: errorAulas } = await supabase
      .from('aulas_plano_secu')
      .select('*')
      .order('orden', { ascending: true });

    if (errorAulas) {
      return { ok: false, error: errorAulas.message };
    }

    const { data: estado } = await supabase
      .from('estado_app')
      .select('plano_activo')
      .eq('id', 'global')
      .single();

    return {
      ok: true,
      data: (aulas || []) as AulaPlanoSecu[],
      planoActivo: (estado?.plano_activo as 'PB' | 'PA') || 'PB',
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener aulas del plano.' };
  }
}

export async function toggleAulaEstadoAction(
  aulaId: string,
  nuevoEstado: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('aulas_plano_secu')
      .update({ activo: nuevoEstado })
      .eq('id', aulaId);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al actualizar aula.' };
  }
}

export async function guardarEstadoPlanoAction(
  planoActivo: 'PB' | 'PA'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('estado_app')
      .upsert({ id: 'global', plano_activo: planoActivo });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar estado de plano.' };
  }
}
