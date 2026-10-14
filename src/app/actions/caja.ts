'use server';

import { createClient } from '@/lib/supabase/server';
import {
  CierreCaja,
  ReciboItem,
  MercadoPagoItem,
  TransferenciaItem,
} from '@/lib/types/database.types';

export interface GuardarCierreInput {
  totalRecibos: number;
  totalML: number;
  totalEfectivo: number;
  totalTransfer: number; // Corregido Bug 1
  diferencia: number;
  recibos: ReciboItem[];
  mercadoPago: MercadoPagoItem[];
  efectivo: any[];
  transferencias: TransferenciaItem[]; // Corregido Bug 1
}

export async function guardarCierreCajaAction(
  datos: GuardarCierreInput
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: 'No autenticado.' };
    }

    const { data: perfil } = await supabase
      .from('perfiles_usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (perfil?.rol === 'alumno') {
      return { ok: false, error: 'No tenés permisos para cerrar caja.' };
    }

    const { data, error } = await supabase
      .from('cierres_caja')
      .insert({
        total_recibos: datos.totalRecibos,
        total_mercado_pago: datos.totalML,
        total_efectivo: datos.totalEfectivo,
        total_transferencias: datos.totalTransfer,
        diferencia: datos.diferencia,
        recibos_json: datos.recibos,
        mercado_pago_json: datos.mercadoPago,
        efectivo_json: datos.efectivo,
        transferencias_json: datos.transferencias,
      })
      .select('id')
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar cierre de caja.' };
  }
}

export async function obtenerHistorialCierresAction(): Promise<{
  ok: boolean;
  data?: CierreCaja[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(30);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as CierreCaja[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener historial.' };
  }
}
