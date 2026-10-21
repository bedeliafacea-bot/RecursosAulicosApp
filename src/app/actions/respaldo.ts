'use server';

import { requireAdminUser } from '@/lib/auth/admin-user';
import { uploadJsonToGoogleDrive } from '@/lib/google-drive';
import { createAdminClient } from '@/lib/supabase/admin';

const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;

const MONTHLY_TABLES = [
  { name: 'jornadas_becuap', dateColumn: 'fecha', timestamp: false },
  { name: 'horarios_pactados', dateColumn: 'fecha', timestamp: false },
  { name: 'fotocopias', dateColumn: 'fecha', timestamp: false },
  { name: 'pagos_efectivo', dateColumn: 'fecha', timestamp: false },
  { name: 'reservas_especiales', dateColumn: 'fecha', timestamp: false },
  { name: 'cierres_caja', dateColumn: 'fecha', timestamp: true },
] as const;

type MonthlyTable = (typeof MONTHLY_TABLES)[number];
type BackupRow = { id: string } & Record<string, unknown>;

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }
  return createAdminClient();
}

function getMonthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Elegí un mes válido para el respaldo.');
  }

  const currentMonthParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const currentMonth = `${currentMonthParts.find((part) => part.type === 'year')?.value}-${currentMonthParts.find((part) => part.type === 'month')?.value}`;
  if (month > currentMonth) {
    throw new Error('No se pueden respaldar ni limpiar meses futuros.');
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const firstOfNextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const nextMonth = `${firstOfNextMonth.getUTCFullYear()}-${String(
    firstOfNextMonth.getUTCMonth() + 1
  ).padStart(2, '0')}-01`;

  return {
    startDate: `${month}-01`,
    endDate: nextMonth,
    startTimestamp: `${month}-01T00:00:00-03:00`,
    endTimestamp: `${nextMonth}T00:00:00-03:00`,
  };
}

async function readMonthlyRows(
  table: MonthlyTable,
  month: string
): Promise<BackupRow[]> {
  const { startDate, endDate, startTimestamp, endTimestamp } = getMonthBounds(month);
  const start = table.timestamp ? startTimestamp : startDate;
  const end = table.timestamp ? endTimestamp : endDate;
  const rows: BackupRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await getAdminClient()
      .from(table.name)
      .select('*')
      .gte(table.dateColumn, start)
      .lt(table.dateColumn, end)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`No se pudo leer ${table.name}: ${error.message}`);
    }

    const page = (data || []) as BackupRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function deleteBackedUpRows(
  table: MonthlyTable,
  rows: BackupRow[]
): Promise<number> {
  let deleted = 0;

  for (let start = 0; start < rows.length; start += DELETE_BATCH_SIZE) {
    const batch = rows.slice(start, start + DELETE_BATCH_SIZE);
    const { data, error } = await getAdminClient().rpc('delete_monthly_backup_rows', {
      p_table: table.name,
      p_rows: batch,
    });

    if (error) {
      throw new Error(
        `Drive ya recibió el respaldo, pero falló la limpieza de ${table.name} después de borrar ${deleted} registros: ${error.message}`
      );
    }

    const deletedInBatch = typeof data === 'number' ? data : 0;
    deleted += deletedInBatch;
    if (deletedInBatch !== batch.length) {
      throw new Error(
        `Drive ya recibió el respaldo, pero ${table.name} informó que se borraron ${deleted} de ${rows.length} registros. No se continuó con las demás tablas.`
      );
    }
  }

  return deleted;
}

export async function obtenerEstadoRespaldoAction(): Promise<{
  ok: boolean;
  connected?: boolean;
  error?: string;
}> {
  try {
    await requireAdminUser();
    const { data, error } = await getAdminClient()
      .from('google_drive_tokens')
      .select('id')
      .eq('id', 'primary')
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo consultar la conexión de Drive: ${error.message}`);
    }
    return { ok: true, connected: Boolean(data) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo consultar el estado del respaldo.',
    };
  }
}

export async function respaldarYLimpiarMesAction(month: string): Promise<{
  ok: boolean;
  fileUrl?: string;
  fileName?: string;
  counts?: Record<string, number>;
  deleted?: Record<string, number>;
  error?: string;
}> {
  let uploadedFile: { id: string; name: string; webViewLink?: string } | undefined;
  const counts: Record<string, number> = {};
  const deleted: Record<string, number> = {};

  try {
    await requireAdminUser();
    getMonthBounds(month);

    const rowsByTable = new Map<string, BackupRow[]>();
    for (const table of MONTHLY_TABLES) {
      const rows = await readMonthlyRows(table, month);
      rowsByTable.set(table.name, rows);
      counts[table.name] = rows.length;
    }

    const now = new Date();
    const fileName = `respaldo-recursos-aulicos-${month}-${now
      .toISOString()
      .replace(/[:.]/g, '-')}.json`;
    const backup = {
      formatVersion: 1,
      application: 'RecursosAulicosApp',
      period: {
        month,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      createdAt: now.toISOString(),
      counts,
      tables: Object.fromEntries(rowsByTable),
    };

    uploadedFile = await uploadJsonToGoogleDrive(fileName, JSON.stringify(backup, null, 2));

    for (const table of MONTHLY_TABLES) {
      deleted[table.name] = await deleteBackedUpRows(
        table,
        rowsByTable.get(table.name) || []
      );
    }

    return {
      ok: true,
      fileName: uploadedFile.name,
      fileUrl:
        uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
      counts,
      deleted,
    };
  } catch (error) {
    return {
      ok: false,
      fileName: uploadedFile?.name,
      fileUrl: uploadedFile
        ? uploadedFile.webViewLink ||
          `https://drive.google.com/file/d/${uploadedFile.id}/view`
        : undefined,
      counts: Object.keys(counts).length ? counts : undefined,
      deleted: Object.keys(deleted).length ? deleted : undefined,
      error: error instanceof Error ? error.message : 'No se pudo completar el respaldo mensual.',
    };
  }
}
