import JSZip from 'jszip';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin-user';
import {
  DELETE_BATCH_SIZE,
  isMonthlyBackupTableName,
  MAX_ARCHIVE_BYTES,
  MONTHLY_BACKUP_TABLES,
  MonthlyBackupManifest,
  MonthlyBackupRow,
  MonthlyBackupTable,
  MonthlyBackupTableName,
  readMonthlyRows,
  validateBackupRows,
} from '@/lib/monthly-backup';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }
  return createAdminClient();
}

function parseSelectedTables(values: string[]): MonthlyBackupTable[] {
  if (!values.length || values.some((value) => !isMonthlyBackupTableName(value))) {
    throw new Error('Seleccioná al menos una tabla válida para el respaldo.');
  }
  const selectedNames = new Set(
    MONTHLY_BACKUP_TABLES.filter((table) => values.includes(table.name)).map(
      (table) => table.name
    )
  );
  return MONTHLY_BACKUP_TABLES.filter((table) => selectedNames.has(table.name));
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
    const month = request.nextUrl.searchParams.get('month') || '';
    const tables = parseSelectedTables(request.nextUrl.searchParams.getAll('table'));
    const dataByTable: Partial<Record<MonthlyBackupTableName, MonthlyBackupRow[]>> = {};
    const counts: Partial<Record<MonthlyBackupTableName, number>> = {};
    const supabase = getAdminClient();

    for (const table of tables) {
      const rows = await readMonthlyRows(table, month, supabase);
      dataByTable[table.name] = rows;
      counts[table.name] = rows.length;
    }

    const createdAt = new Date().toISOString();
    const manifest: MonthlyBackupManifest = {
      formatVersion: 1,
      application: 'RecursosAulicosApp',
      period: {
        month,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      selectedTables: tables.map((table) => table.name),
      createdAt,
      counts,
    };
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    for (const table of tables) {
      zip.file(`data/${table.name}.json`, JSON.stringify(dataByTable[table.name], null, 2));
    }

    const archive = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    if (archive.byteLength > MAX_ARCHIVE_BYTES) {
      return jsonError(
        'El ZIP generado supera el límite de 25 MB. Reduce la selección de tablas y genera varios respaldos.',
        413
      );
    }
    const fileName = `respaldo-recursos-aulicos-${month}.zip`;

    return new NextResponse(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(archive.byteLength),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo generar el archivo ZIP.';
    const status = message.includes('iniciar sesión') || message.includes('administrador') ? 403 : 400;
    return jsonError(message, status);
  }
}

function parseManifest(value: unknown): MonthlyBackupManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('El ZIP no contiene un manifiesto válido.');
  }
  const manifest = value as Partial<MonthlyBackupManifest>;
  if (
    manifest.formatVersion !== 1 ||
    manifest.application !== 'RecursosAulicosApp' ||
    !manifest.period ||
    manifest.period.timeZone !== 'America/Argentina/Buenos_Aires' ||
    !Array.isArray(manifest.selectedTables) ||
    !manifest.selectedTables.length ||
    !manifest.counts ||
    typeof manifest.counts !== 'object'
  ) {
    throw new Error('El ZIP no es un respaldo mensual compatible.');
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(manifest.period.month)) {
    throw new Error('El ZIP contiene un mes inválido.');
  }

  const uniqueNames = new Set<MonthlyBackupTableName>();
  for (const name of manifest.selectedTables) {
    if (!isMonthlyBackupTableName(name) || uniqueNames.has(name)) {
      throw new Error('El ZIP contiene tablas no permitidas o repetidas.');
    }
    uniqueNames.add(name);
  }
  for (const name of Object.keys(manifest.counts)) {
    if (!isMonthlyBackupTableName(name) || !uniqueNames.has(name)) {
      throw new Error('El manifiesto del ZIP contiene tablas inconsistentes.');
    }
  }
  for (const name of uniqueNames) {
    const count = manifest.counts[name];
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error('El manifiesto del ZIP contiene cantidades inválidas.');
    }
  }

  return manifest as MonthlyBackupManifest;
}

export async function POST(request: NextRequest) {
  const deleted: Partial<Record<MonthlyBackupTableName, number>> = {};

  try {
    await requireAdminUser();
    const form = await request.formData();
    const archiveFile = form.get('archive');
    if (!(archiveFile instanceof File) || archiveFile.size === 0) {
      return jsonError('Seleccioná un archivo ZIP de respaldo.', 400);
    }
    if (archiveFile.size > MAX_ARCHIVE_BYTES) {
      return jsonError('El ZIP supera el límite permitido de 25 MB.', 413);
    }

    const zip = await JSZip.loadAsync(await archiveFile.arrayBuffer(), {
      checkCRC32: true,
      createFolders: false,
    });
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.unsafeOriginalName?.includes('..')) {
        return jsonError('El ZIP contiene una ruta de archivo no válida.', 400);
      }
      if (entry.dir && name === 'data/') continue;
      if (entry.dir || (name !== 'manifest.json' && !/^data\/[a-z_]+\.json$/.test(name))) {
        return jsonError('El ZIP contiene archivos inesperados.', 400);
      }
    }

    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) return jsonError('El ZIP no contiene manifest.json.', 400);
    const manifest = parseManifest(JSON.parse(await manifestFile.async('string')));
    const selectedTables = manifest.selectedTables.map((name) =>
      MONTHLY_BACKUP_TABLES.find((table) => table.name === name)!
    );

    const rowsByTable = new Map<MonthlyBackupTableName, MonthlyBackupRow[]>();
    const expectedFiles = new Set(['manifest.json', 'data/']);
    for (const table of selectedTables) {
      const fileName = `data/${table.name}.json`;
      expectedFiles.add(fileName);
      const entry = zip.file(fileName);
      if (!entry) {
        return jsonError(`Falta el archivo ${fileName} dentro del ZIP.`, 400);
      }
      const rows = validateBackupRows(
        table,
        JSON.parse(await entry.async('string')),
        manifest.period.month
      );
      if (rows.length !== manifest.counts[table.name]) {
        return jsonError(`La cantidad de registros de ${table.label} no coincide con el manifiesto.`, 400);
      }
      rowsByTable.set(table.name, rows);
    }

    if (Object.keys(zip.files).some((name) => !expectedFiles.has(name))) {
      return jsonError('El ZIP contiene archivos que no figuran en el manifiesto.', 400);
    }

    const supabase = getAdminClient();
    for (const table of selectedTables) {
      const rows = rowsByTable.get(table.name) || [];
      for (let start = 0; start < rows.length; start += DELETE_BATCH_SIZE) {
        const batch = rows.slice(start, start + DELETE_BATCH_SIZE);
        const { data, error } = await supabase.rpc('delete_monthly_backup_rows', {
          p_table: table.name,
          p_rows: batch,
        });
        if (error) {
          throw new Error(
            `Falló la limpieza de ${table.label}: ${error.message}. Se borraron ${deleted[table.name] || 0} registros de esta tabla.`
          );
        }
        const deletedInBatch = typeof data === 'number' ? data : 0;
        deleted[table.name] = (deleted[table.name] || 0) + deletedInBatch;
        if (deletedInBatch !== batch.length) {
          throw new Error(
            `La limpieza de ${table.label} se detuvo porque no coincidieron los registros del ZIP.`
          );
        }
      }
      deleted[table.name] = deleted[table.name] || 0;
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    let message =
      error instanceof Error ? error.message : 'No se pudo limpiar a partir del archivo ZIP.';
    const deletedEntries = Object.entries(deleted).filter(([, count]) => (count || 0) > 0);
    if (deletedEntries.length) {
      message += ` Registros borrados antes de detenerse: ${deletedEntries
        .map(([table, count]) => `${table}: ${count}`)
        .join(', ')}.`;
    }
    const status = message.includes('iniciar sesión') || message.includes('administrador') ? 403 : 400;
    return NextResponse.json({ ok: false, error: message, deleted }, { status });
  }
}
