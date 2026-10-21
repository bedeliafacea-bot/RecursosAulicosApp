'use server';

import { createClient } from '@/lib/supabase/server';

export interface MercadoPagoQrPayment {
  id: string;
  date: string;
  amount: number;
  description: string;
  statusDetail: string;
}

interface MercadoPagoPaymentResponse {
  id?: number | string;
  status?: string;
  status_detail?: string;
  date_approved?: string | null;
  transaction_amount?: number;
  description?: string | null;
  point_of_interaction?: {
    type?: string;
  } | null;
  pos_id?: number | string | null;
}

interface MercadoPagoSearchResponse {
  results?: MercadoPagoPaymentResponse[];
  paging?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

const PAGE_SIZE = 100;
const MAX_PAYMENTS_PER_QUERY = 1000;

function getArgentinaDayBounds(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('Elegí una fecha válida para consultar Mercado Pago.');
  }

  const parsed = new Date(`${day}T12:00:00-03:00`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
    throw new Error('La fecha seleccionada no es válida.');
  }

  return {
    beginDate: `${day}T00:00:00.000-03:00`,
    endDate: `${day}T23:59:59.999-03:00`,
  };
}

export async function consultarPagosQrLaboratorioAction(day: string): Promise<{
  ok: boolean;
  payments?: MercadoPagoQrPayment[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { ok: false, error: 'Necesitás iniciar sesión para consultar Mercado Pago.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('perfiles_usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (profileError || !['admin', 'secretario'].includes(profile?.rol || '')) {
      return { ok: false, error: 'Solo administradores y secretarios pueden consultar la Caja.' };
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const posId = process.env.MERCADO_PAGO_QR_POS_ID;
    if (!accessToken || !posId) {
      return {
        ok: false,
        error:
          'Falta configurar MERCADO_PAGO_ACCESS_TOKEN y MERCADO_PAGO_QR_POS_ID en el servidor. El segundo identifica el QR de Laboratorio.',
      };
    }

    const { beginDate, endDate } = getArgentinaDayBounds(day);
    const payments: MercadoPagoPaymentResponse[] = [];
    let total = 0;

    for (let offset = 0; offset < MAX_PAYMENTS_PER_QUERY; offset += PAGE_SIZE) {
      const params = new URLSearchParams({
        sort: 'date_created',
        criteria: 'desc',
        range: 'date_created',
        begin_date: beginDate,
        end_date: endDate,
        status: 'approved',
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Mercado Pago rechazó el acceso. Revisá que el Access Token del servidor sea válido y corresponda a la cuenta correcta.'
          );
        }
        throw new Error(
          `Mercado Pago respondió con un error (${response.status}). Intenta nuevamente más tarde.`
        );
      }

      const result = (await response.json()) as MercadoPagoSearchResponse;
      const page = result.results || [];
      payments.push(...page);
      total = result.paging?.total ?? payments.length;
      if (page.length < PAGE_SIZE || payments.length >= total) break;
    }

    if (total > MAX_PAYMENTS_PER_QUERY) {
      throw new Error(
        'La fecha supera 1.000 operaciones. Consulta un día con menos actividad para verificar el QR.'
      );
    }

    const filteredPayments = payments
      .filter(
        (payment) =>
          payment.status === 'approved' &&
          payment.point_of_interaction?.type === 'QR' &&
          String(payment.pos_id ?? '') === posId
      )
      .filter(
        (payment): payment is MercadoPagoPaymentResponse & {
          id: string | number;
          transaction_amount: number;
        } =>
          payment.id !== undefined &&
          typeof payment.transaction_amount === 'number' &&
          Number.isFinite(payment.transaction_amount)
      )
      .map((payment) => ({
        id: String(payment.id),
        date: payment.date_approved || '',
        amount: payment.transaction_amount,
        description: payment.description || 'Venta con código QR',
        statusDetail: payment.status_detail || 'accredited',
      }));

    return { ok: true, payments: filteredPayments };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo consultar la actividad de Mercado Pago.',
    };
  }
}
