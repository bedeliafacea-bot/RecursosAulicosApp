'use server';

import { createClient } from '@/lib/supabase/server';
import {
  Departamento,
  Fotocopia,
  PagoEfectivo,
  RetiroEfectivo,
} from '@/lib/types/database.types';

export interface ResumenDepartamento {
  departamento: string;
  cantidad: number;
  precioUnit: number;
  importe: number;
}

export interface UltimoMovimiento {
  tipo: 'fotocopia' | 'efectivo' | 'retiro';
  fecha: string;
  detalle: string;
  cantidad?: number;
  total: number;
  creado_en: string;
}

export async function registrarRetiroEfectivoAction(datos: {
  fecha: string;
  descripcion: string;
  monto: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { ok: false, error: 'Necesitás iniciar sesión para registrar un retiro.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('perfiles_usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (profileError || !['admin', 'secretario'].includes(profile?.rol || '')) {
      return { ok: false, error: 'Solo administradores y secretarios pueden registrar retiros.' };
    }

    const descripcion = datos.descripcion.trim();
    const monto = Number(datos.monto);
    const fechaValida =
      /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) &&
      !Number.isNaN(new Date(`${datos.fecha}T00:00:00Z`).getTime()) &&
      new Date(`${datos.fecha}T00:00:00Z`).toISOString().slice(0, 10) === datos.fecha;
    if (!fechaValida) {
      return { ok: false, error: 'Ingresá una fecha válida para el retiro.' };
    }
    if (!descripcion || descripcion.length > 160) {
      return { ok: false, error: 'Indicá el motivo del retiro (máximo 160 caracteres).' };
    }
    if (!Number.isFinite(monto) || monto <= 0 || monto > 9999999999.99) {
      return { ok: false, error: 'Ingresá un importe mayor a cero y válido.' };
    }

    const { error } = await supabase.from('retiros_efectivo').insert({
      fecha: datos.fecha,
      descripcion,
      monto: Math.round(monto * 100) / 100,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al registrar el retiro en efectivo.' };
  }
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
  totalRetirosEfectivoMes?: number;
  retirosEfectivoMes?: RetiroEfectivo[];
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

    const { data: retirosEf, error: errRetiros } = await supabase
      .from('retiros_efectivo')
      .select('*')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false });

    if (errRetiros) return { ok: false, error: errRetiros.message };

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
    const totalRetirosEfectivo = (retirosEf || []).reduce(
      (total, retiro) => total + (Number(retiro.monto) || 0),
      0
    );

    // 5. Último movimiento registrado global
    const { data: ultimaFoto, error: errUltimaFoto } = await supabase
      .from('fotocopias')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(1);
    if (errUltimaFoto) return { ok: false, error: errUltimaFoto.message };

    const { data: ultimoPago, error: errUltimoPago } = await supabase
      .from('pagos_efectivo')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(1);
    if (errUltimoPago) return { ok: false, error: errUltimoPago.message };

    const { data: ultimoRetiro, error: errUltimoRetiro } = await supabase
      .from('retiros_efectivo')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(1);
    if (errUltimoRetiro) return { ok: false, error: errUltimoRetiro.message };

    const movimientosRecientes: UltimoMovimiento[] = [
      ...(ultimaFoto || []).map((foto) => ({
        tipo: 'fotocopia' as const,
        fecha: foto.fecha,
        detalle: foto.departamento_nombre,
        cantidad: foto.cantidad,
        total: Number(foto.total),
        creado_en: foto.creado_en,
      })),
      ...(ultimoPago || []).map((pago) => ({
        tipo: 'efectivo' as const,
        fecha: pago.fecha,
        detalle: 'Pago en Efectivo (Mostrador)',
        cantidad: pago.cantidad_copias,
        total: Number(pago.total),
        creado_en: pago.creado_en,
      })),
      ...(ultimoRetiro || []).map((retiro) => ({
        tipo: 'retiro' as const,
        fecha: retiro.fecha,
        detalle: retiro.descripcion,
        total: Number(retiro.monto),
        creado_en: retiro.creado_en,
      })),
    ];
    const ultimoMov =
      movimientosRecientes.sort(
        (a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      )[0] || null;

    return {
      ok: true,
      resumenDeptos: Object.values(mapaDeptos).sort((a, b) => b.importe - a.importe),
      totalEfectivoMes: Math.round(totalEfectivo * 100) / 100,
      totalRetirosEfectivoMes: Math.round(totalRetirosEfectivo * 100) / 100,
      retirosEfectivoMes: (retirosEf || []) as RetiroEfectivo[],
      copiasDeptosMes: totalCopiasDeptos,
      copiasEfectivoMes: totalCopiasEf,
      gastosDeptosTotal: Math.round(totalImporteDeptos * 100) / 100,
      ultimoMovimiento: ultimoMov,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al calcular resumen de oficina.' };
  }
}
