export const MONTHLY_BACKUP_TABLES = [
  { name: 'jornadas_becuap', label: 'Jornadas de becarios', dateColumn: 'fecha', timestamp: false },
  { name: 'horarios_pactados', label: 'Horarios pactados', dateColumn: 'fecha', timestamp: false },
  { name: 'fotocopias', label: 'Fotocopias', dateColumn: 'fecha', timestamp: false },
  { name: 'pagos_efectivo', label: 'Pagos en efectivo', dateColumn: 'fecha', timestamp: false },
  { name: 'reservas_especiales', label: 'Reservas especiales', dateColumn: 'fecha', timestamp: false },
  { name: 'cierres_caja', label: 'Cierres de caja', dateColumn: 'fecha', timestamp: true },
] as const;

export type MonthlyBackupTable = (typeof MONTHLY_BACKUP_TABLES)[number];
export type MonthlyBackupTableName = MonthlyBackupTable['name'];
export type MonthlyBackupRow = { id: string } & Record<string, unknown>;

export interface MonthlyBackupManifest {
  formatVersion: 1;
  application: 'RecursosAulicosApp';
  period: {
    month: string;
    timeZone: 'America/Argentina/Buenos_Aires';
  };
  selectedTables: MonthlyBackupTableName[];
  createdAt: string;
  counts: Partial<Record<MonthlyBackupTableName, number>>;
}

const PAGE_SIZE = 1000;
export const DELETE_BATCH_SIZE = 100;
export const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;

export function getMonthBounds(month: string) {
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

export function isMonthlyBackupTableName(value: unknown): value is MonthlyBackupTableName {
  return (
    typeof value === 'string' &&
    MONTHLY_BACKUP_TABLES.some((table) => table.name === value)
  );
}

export function validateBackupRows(
  table: MonthlyBackupTable,
  rows: unknown,
  month: string
): MonthlyBackupRow[] {
  if (!Array.isArray(rows)) {
    throw new Error(`El archivo de ${table.label} no contiene una lista válida.`);
  }

  const { startDate, endDate, startTimestamp, endTimestamp } = getMonthBounds(month);
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`El archivo de ${table.label} contiene un registro inválido.`);
    }
    const record = row as Record<string, unknown>;
    if (typeof record.id !== 'string' || !record.id) {
      throw new Error(`El archivo de ${table.label} contiene un registro sin identificador.`);
    }
    if (ids.has(record.id)) {
      throw new Error(`El archivo de ${table.label} repite un identificador.`);
    }
    ids.add(record.id);

    const dateValue = record[table.dateColumn];
    if (typeof dateValue !== 'string') {
      throw new Error(`El registro ${record.id} de ${table.label} no tiene una fecha válida.`);
    }
    if (table.timestamp) {
      const time = Date.parse(dateValue);
      if (
        !Number.isFinite(time) ||
        time < Date.parse(startTimestamp) ||
        time >= Date.parse(endTimestamp)
      ) {
        throw new Error(`El registro ${record.id} de ${table.label} no corresponde a ${month}.`);
      }
    } else if (dateValue < startDate || dateValue >= endDate) {
      throw new Error(`El registro ${record.id} de ${table.label} no corresponde a ${month}.`);
    }
  }

  return rows as MonthlyBackupRow[];
}

export async function readMonthlyRows(
  table: MonthlyBackupTable,
  month: string,
  supabase: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>
): Promise<MonthlyBackupRow[]> {
  const { startDate, endDate, startTimestamp, endTimestamp } = getMonthBounds(month);
  const start = table.timestamp ? startTimestamp : startDate;
  const end = table.timestamp ? endTimestamp : endDate;
  const rows: MonthlyBackupRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table.name)
      .select('*')
      .gte(table.dateColumn, start)
      .lt(table.dateColumn, end)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`No se pudo leer ${table.label}: ${error.message}`);
    }

    const page = (data || []) as MonthlyBackupRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}
