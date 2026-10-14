'use server';

import { createClient } from '@/lib/supabase/server';
import { Departamento, Fotocopia, PagoEfectivo } from '@/lib/types/database.types';

export interface ResumenDepartamento {
  departamento: string;
  cantidad: number;
  precioUnit: number;
  importe: number;
}

export interface UltimoMovimiento {
  tipo: 'fotocopia' | 'efectivo';
  fecha: string;
  detalle: string;
  cantidad: number;
  total: number;
}

export async function obtenerDepartamentosAction(): Promise<{
  ok: boolean;
  data?: Departamento[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('departamentos')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as Departamento[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al obtener departamentos.' };
  }
}

export async function registrarGastoFotocopiaAction(datos: {
  fecha: string; // YYYY-MM-DD
  departamento_id?: string;
  departamento_nombre: string;
  cantidad: number;
  valor_unitario: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const cantidad = Number(datos.cantidad);
    const valor = Number(datos.valor_unitario);
    const total = Math.round(cantidad * valor * 100) / 100;

    const { error } = await supabase.from('fotocopias').insert({
      fecha: datos.fecha,
      departamento_id: datos.departamento_id || null,
      departamento_nombre: datos.departamento_nombre.trim(),
      cantidad,
      valor_unitario: valor,
      total,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al registrar fotocopia.' };
  }
}

export async function registrarPagoEfectivoAction(datos: {
  fecha: string; // YYYY-MM-DD
  cantidad_copias: number;
  valor_unitario: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const cantidad = Number(datos.cantidad_copias);
    const valor = Number(datos.valor_unitario);
    const total = Math.round(cantidad * valor * 100) / 100;

    const { error } = await supabase.from('pagos_efectivo').insert({
      fecha: datos.fecha,
      cantidad_copias: cantidad,
      valor_unitario: valor,
      total,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al registrar pago efectivo.' };
  }
}

export async function obtenerResumenOficinaAction(
  mes: number,
  anio: number
): Promise<{
  ok: boolean;
  resumenDeptos?: ResumenDepartamento[];
  totalEfectivoMes?: number;
  copiasDeptosMes?: number;
  copiasEfectivoMes?: number;
  gastosDeptosTotal?: number;
  ultimoMovimiento?: UltimoMovimiento | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Rango de fechas del mes seleccionado
    const inicioMes = `${anio}-${mes < 10 ? '0' + mes : mes}-01`;
    const finDia = new Date(anio, mes, 0).getDate();
    const finMes = `${anio}-${mes < 10 ? '0' + mes : mes}-${finDia}`;

    // 1. Obtener fotocopias del mes
    const { data: fotocopias, error: errFoto } = await supabase
      .from('fotocopias')
      .select('*')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes);

    if (errFoto) return { ok: false, error: errFoto.message };

    // 2. Obtener pagos en efectivo del mes
    const { data: pagosEf, error: errEf } = await supabase
      .from('pagos_efectivo')
      .select('*')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes);

    if (errEf) return { ok: false, error: errEf.message };

    // 3. Agrupar consumos por departamento
    const mapaDeptos: Record<string, ResumenDepartamento> = {};
    let totalCopiasDeptos = 0;
    let totalImporteDeptos = 0;

    (fotocopias || []).forEach((f) => {
      const depto = f.departamento_nombre;
      if (!mapaDeptos[depto]) {
        mapaDeptos[depto] = {
          departamento: depto,
          cantidad: 0,
          precioUnit: Number(f.valor_unitario) || 0,
          importe: 0,
        };
      }
      mapaDeptos[depto].cantidad += Number(f.cantidad) || 0;
      mapaDeptos[depto].importe += Number(f.total) || 0;
      totalCopiasDeptos += Number(f.cantidad) || 0;
      totalImporteDeptos += Number(f.total) || 0;
    });

    // 4. Totales de efectivo
    let totalEfectivo = 0;
    let totalCopiasEf = 0;
    (pagosEf || []).forEach((p) => {
      totalEfectivo += Number(p.total) || 0;
      totalCopiasEf += Number(p.cantidad_copias) || 0;
    });

    // 5. Último movimiento registrado global
    let ultimoMov: UltimoMovimiento | null = null;
    const { data: ultimaFoto } = await supabase
      .from('fotocopias')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(1);

    const { data: ultimoPago } = await supabase
      .from('pagos_efectivo')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(1);

    if (ultimaFoto && ultimaFoto.length > 0 && ultimoPago && ultimoPago.length > 0) {
      if (new Date(ultimaFoto[0].creado_en) > new Date(ultimoPago[0].creado_en)) {
        ultimoMov = {
          tipo: 'fotocopia',
          fecha: ultimaFoto[0].fecha,
          detalle: ultimaFoto[0].departamento_nombre,
          cantidad: ultimaFoto[0].cantidad,
          total: Number(ultimaFoto[0].total),
        };
      } else {
        ultimoMov = {
          tipo: 'efectivo',
          fecha: ultimoPago[0].fecha,
          detalle: 'Pago en Efectivo (Mostrador)',
          cantidad: ultimoPago[0].cantidad_copias,
          total: Number(ultimoPago[0].total),
        };
      }
    } else if (ultimaFoto && ultimaFoto.length > 0) {
      ultimoMov = {
        tipo: 'fotocopia',
        fecha: ultimaFoto[0].fecha,
        detalle: ultimaFoto[0].departamento_nombre,
        cantidad: ultimaFoto[0].cantidad,
        total: Number(ultimaFoto[0].total),
      };
    } else if (ultimoPago && ultimoPago.length > 0) {
      ultimoMov = {
        tipo: 'efectivo',
        fecha: ultimoPago[0].fecha,
        detalle: 'Pago en Efectivo (Mostrador)',
        cantidad: ultimoPago[0].cantidad_copias,
        total: Number(ultimoPago[0].total),
      };
    }

    return {
      ok: true,
      resumenDeptos: Object.values(mapaDeptos).sort((a, b) => b.importe - a.importe),
      totalEfectivoMes: Math.round(totalEfectivo * 100) / 100,
      copiasDeptosMes: totalCopiasDeptos,
      copiasEfectivoMes: totalCopiasEf,
      gastosDeptosTotal: Math.round(totalImporteDeptos * 100) / 100,
      ultimoMovimiento: ultimoMov,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al calcular resumen de oficina.' };
  }
}
