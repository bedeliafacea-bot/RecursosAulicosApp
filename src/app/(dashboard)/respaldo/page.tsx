'use client';

import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  Eye,
  FileArchive,
  Loader2,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  isMonthlyBackupTableName,
  MAX_ARCHIVE_BYTES,
  MONTHLY_BACKUP_TABLES,
  MonthlyBackupManifest,
  MonthlyBackupTableName,
} from '@/lib/monthly-backup';

type ArchiveRows = Record<string, Record<string, unknown>[]>;

interface ArchiveData {
  file: File;
  manifest: MonthlyBackupManifest;
  rows: ArchiveRows;
}

function previousMonth(): string {
  const [year, month] = currentArgentinaMonth().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function currentArgentinaMonth(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
}

const monthTables = MONTHLY_BACKUP_TABLES;

async function parseArchiveFile(file: File): Promise<ArchiveData> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('El archivo debe tener formato ZIP.');
  }
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new Error('El archivo supera el límite permitido de 25 MB.');
  }

  const zip = await JSZip.loadAsync(file, { checkCRC32: true, createFolders: false });
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('El ZIP no contiene manifest.json.');
  const manifest = JSON.parse(await manifestFile.async('string')) as Partial<MonthlyBackupManifest>;

  if (
    manifest.formatVersion !== 1 ||
    manifest.application !== 'RecursosAulicosApp' ||
    !manifest.period?.month ||
    !Array.isArray(manifest.selectedTables) ||
    !manifest.counts
  ) {
    throw new Error('El archivo no es un respaldo mensual compatible.');
  }

  const month = manifest.period.month;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('El archivo contiene un mes inválido.');
  }

  const selectedTables: MonthlyBackupTableName[] = [];
  for (const tableName of manifest.selectedTables) {
    if (!isMonthlyBackupTableName(tableName) || selectedTables.includes(tableName)) {
      throw new Error('El archivo contiene tablas inválidas o repetidas.');
    }
    selectedTables.push(tableName);
  }
  if (selectedTables.length === 0) throw new Error('El respaldo no tiene tablas seleccionadas.');

  const rows: ArchiveRows = {};
  for (const tableName of selectedTables) {
    const entry = zip.file(`data/${tableName}.json`);
    if (!entry) throw new Error(`Falta la tabla ${tableName} dentro del archivo.`);
    const tableRows = JSON.parse(await entry.async('string')) as unknown;
    if (
      !Array.isArray(tableRows) ||
      tableRows.length !== manifest.counts[tableName] ||
      !tableRows.every((row) => row && typeof row === 'object' && !Array.isArray(row))
    ) {
      throw new Error(`Los datos de ${tableName} no coinciden con el manifiesto.`);
    }
    rows[tableName] = tableRows as Record<string, unknown>[];
  }

  return {
    file,
    manifest: manifest as MonthlyBackupManifest,
    rows,
  };
}

export default function RespaldoMensualPage() {
  const { rol } = useAuth();
  const [month, setMonth] = useState('');
  const [currentMonth, setCurrentMonth] = useState('');
  const [selectedTables, setSelectedTables] = useState<MonthlyBackupTableName[]>(
    monthTables.map((table) => table.name)
  );
  const [archive, setArchive] = useState<ArchiveData | null>(null);
  const [activeArchiveTable, setActiveArchiveTable] = useState('');
  const [acknowledgedSaved, setAcknowledgedSaved] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [archiveMessage, setArchiveMessage] = useState('');

  useEffect(() => {
    setMonth(previousMonth());
    setCurrentMonth(currentArgentinaMonth());
  }, []);

  async function handleGenerateZip() {
    if (!month || selectedTables.length === 0) return;
    setGenerating(true);
    setError('');
    setSuccess('');
    setArchiveMessage('');
    setArchive(null);
    setCleaned(false);
    setAcknowledgedSaved(false);

    try {
      const params = new URLSearchParams({ month });
      selectedTables.forEach((table) => params.append('table', table));
      const response = await fetch(`/api/respaldo?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || 'No se pudo generar el ZIP.');
      }

      const blob = await response.blob();
      const file = new File([blob], `respaldo-recursos-aulicos-${month}.zip`, {
        type: 'application/zip',
      });
      const parsedArchive = await parseArchiveFile(file);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      setArchive(parsedArchive);
      setActiveArchiveTable(parsedArchive.manifest.selectedTables[0]);
      setSuccess('ZIP generado y descargado. Súbelo a tu Drive antes de limpiar Supabase.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo generar el ZIP.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleLoadArchive(file?: File) {
    if (!file) return;
    setLoadingArchive(true);
    setError('');
    setSuccess('');
    setArchiveMessage('');
    setCleaned(false);
    setAcknowledgedSaved(false);
    try {
      const parsedArchive = await parseArchiveFile(file);
      setArchive(parsedArchive);
      setActiveArchiveTable(parsedArchive.manifest.selectedTables[0]);
      setArchiveMessage(`Archivo cargado: ${file.name}`);
    } catch (caught) {
      setArchive(null);
      setError(caught instanceof Error ? caught.message : 'No se pudo leer el ZIP.');
    } finally {
      setLoadingArchive(false);
    }
  }

  async function handleCleanArchive() {
    if (!archive || !acknowledgedSaved || cleaned) return;
    const selectedLabels = archive.manifest.selectedTables
      .map((name) => monthTables.find((table) => table.name === name)?.label)
      .filter(Boolean);
    const monthLabel = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${archive.manifest.period.month}-01T12:00:00Z`));
    if (
      !window.confirm(
        `Se eliminarán de Supabase solo los registros del ZIP cargado: ${selectedLabels.join(', ')} de ${monthLabel}. Esta acción no se puede deshacer desde la app. ¿Continuar?`
      )
    ) {
      return;
    }

    setCleaning(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      form.append('archive', archive.file);
      const response = await fetch('/api/respaldo', {
        method: 'POST',
        body: form,
        cache: 'no-store',
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        deleted?: Record<string, number>;
      };
      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || 'No se pudieron limpiar los registros del respaldo.'
        );
      }
      setCleaned(true);
      setSuccess(
        `Limpieza completada. Se eliminaron ${Object.values(result.deleted || {}).reduce(
          (total, count) => total + count,
          0
        )} registros que coincidían exactamente con el ZIP.`
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo limpiar a partir del ZIP.'
      );
    } finally {
      setCleaning(false);
    }
  }

  if (rol !== 'admin') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-center gap-3 font-bold">
          <ShieldAlert className="h-5 w-5" />
          Solo un administrador puede acceder al respaldo mensual.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-uap-azul to-uap-azul-profundo p-7 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/15 p-3">
            <DatabaseBackup className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Respaldo mensual</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
              Crea un archivo JSON en Google Drive. La aplicación solo elimina los registros
              del mes seleccionado después de confirmar que Drive recibió el archivo.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-900">Respaldo local en ZIP</h2>
            <p className="mt-1 text-sm text-slate-500">
              Descarga un archivo y súbelo manualmente a Google Drive u otro lugar seguro.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <label htmlFor="backup-month" className="block text-sm font-bold text-slate-800">
            Mes a archivar y limpiar
          </label>
          <input
            id="backup-month"
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
            }}
            max={currentMonth}
            className="mt-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-uap-azul focus:ring-2 focus:ring-uap-azul/20"
          />
        </div>

        <fieldset className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-bold text-slate-800">
              Seleccioná qué incluir en el ZIP
            </legend>
            <div className="flex gap-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setSelectedTables(monthTables.map((table) => table.name));
                }}
                className="text-uap-azul underline underline-offset-2"
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTables([]);
                }}
                className="text-slate-500 underline underline-offset-2"
              >
                Quitar selección
              </button>
            </div>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {monthTables.map((table) => {
              const isSelected = selectedTables.includes(table.name);
              return (
                <li key={table.name}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 text-sm text-slate-700 transition hover:border-slate-200 hover:bg-white">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => {
                        setSelectedTables((current) =>
                          event.target.checked
                            ? [...current, table.name]
                            : current.filter((name) => name !== table.name)
                        );
                      }}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span>{table.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Al limpiar más adelante, solo se borrarán las tablas que estén incluidas en el ZIP;
            las demás quedan intactas.
          </p>
        </fieldset>

        <button
          type="button"
          onClick={handleGenerateZip}
          disabled={generating || !month || selectedTables.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-uap-azul px-4 py-3 text-sm font-black text-white transition hover:bg-uap-azul-oscuro disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {generating ? 'Generando archivo ZIP…' : 'Generar y descargar ZIP'}
        </button>

        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div>
            <h3 className="font-black text-slate-900">Consultar un respaldo anterior</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Carga un ZIP guardado en tu equipo para ver el mes y los registros archivados. La
              consulta no restaura ni modifica Supabase.
            </p>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-uap-azul/40 bg-blue-50/50 px-4 py-4 text-sm font-bold text-uap-azul transition hover:bg-blue-50">
            {loadingArchive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {loadingArchive ? 'Leyendo ZIP…' : 'Elegir un archivo ZIP'}
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              disabled={loadingArchive}
              onChange={(event) => {
                void handleLoadArchive(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
          </label>
          {archiveMessage && <p className="text-xs font-semibold text-emerald-700">{archiveMessage}</p>}
        </div>

        {archive && (
          <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-uap-azul">
                <FileArchive className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-uap-azul">
                  Archivo del mes{' '}
                  {new Intl.DateTimeFormat('es-AR', {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  }).format(new Date(`${archive.manifest.period.month}-01T12:00:00Z`))}
                </h3>
                <p className="truncate text-xs text-slate-500">{archive.file.name}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {archive.manifest.selectedTables.map((tableName) => {
                const table = monthTables.find((item) => item.name === tableName);
                if (!table) return null;
                const active = activeArchiveTable === tableName;
                return (
                  <button
                    key={tableName}
                    type="button"
                    onClick={() => setActiveArchiveTable(tableName)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'bg-uap-azul text-white'
                        : 'border border-blue-200 bg-white text-uap-azul hover:bg-blue-50'
                    }`}
                  >
                    {table.label} ({archive.rows[tableName]?.length || 0})
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-xs font-black text-slate-700">
                  {monthTables.find((table) => table.name === activeArchiveTable)?.label}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {archive.rows[activeArchiveTable]?.length || 0} registros
                </span>
              </div>
              <div className="max-h-72 space-y-2 overflow-auto p-3">
                {(archive.rows[activeArchiveTable] || []).length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No hay registros en esta tabla para el mes.
                  </p>
                ) : (
                  (archive.rows[activeArchiveTable] || []).slice(0, 100).map((row, index) => (
                    <details
                      key={String(row.id || index)}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-700">
                        <Eye className="h-3.5 w-3.5 shrink-0 text-uap-azul" />
                        <span className="truncate">
                          {String(row.fecha || row.id || `Registro ${index + 1}`)}
                          {row.nombre ? ` · ${String(row.nombre)}` : ''}
                        </span>
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-slate-500">
                        {JSON.stringify(row, null, 2)}
                      </pre>
                    </details>
                  ))
                )}
                {(archive.rows[activeArchiveTable] || []).length > 100 && (
                  <p className="text-center text-[10px] text-slate-400">
                    Se muestran los primeros 100 registros de la tabla.
                  </p>
                )}
              </div>
            </div>

            {!cleaned && (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] leading-relaxed text-amber-900">
                  La limpieza requiere aplicar una vez la migración{' '}
                  <code>20261021_monthly_backup_cleanup.sql</code> en Supabase.
                </p>
                <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-amber-950">
                  <input
                    type="checkbox"
                    checked={acknowledgedSaved}
                    onChange={(event) => setAcknowledgedSaved(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-amber-700"
                  />
                  Ya guardé este ZIP en Drive u otro lugar seguro y quiero limpiar de Supabase
                  exactamente los datos que contiene.
                </label>
                <button
                  type="button"
                  onClick={handleCleanArchive}
                  disabled={!acknowledgedSaved || cleaning}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {cleaning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {cleaning ? 'Verificando y limpiando…' : 'Limpiar de Supabase los datos de este ZIP'}
                </button>
              </div>
            )}
            {cleaned && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                Este archivo ya fue usado para limpiar los registros coincidentes.
              </p>
            )}
          </section>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            {success}
          </p>
        )}
      </section>
    </div>
  );
}
