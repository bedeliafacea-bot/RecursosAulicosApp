'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  DatabaseBackup,
  ExternalLink,
  Loader2,
  Settings2,
  ShieldAlert,
} from 'lucide-react';
import {
  obtenerEstadoRespaldoAction,
  respaldarYLimpiarMesAction,
} from '@/app/actions/respaldo';
import { useAuth } from '@/context/AuthContext';

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

const monthTables = [
  { name: 'jornadas_becuap', label: 'Jornadas de becarios' },
  { name: 'horarios_pactados', label: 'Horarios pactados' },
  { name: 'fotocopias', label: 'Fotocopias' },
  { name: 'pagos_efectivo', label: 'Pagos en efectivo' },
  { name: 'reservas_especiales', label: 'Reservas especiales' },
  { name: 'cierres_caja', label: 'Cierres de caja' },
] as const;
type MonthlyTableName = (typeof monthTables)[number]['name'];

export default function RespaldoMensualPage() {
  const { rol } = useAuth();
  const [month, setMonth] = useState('');
  const [currentMonth, setCurrentMonth] = useState('');
  const [connected, setConnected] = useState(false);
  const [driveReady, setDriveReady] = useState(false);
  const [missingSettings, setMissingSettings] = useState<string[]>([]);
  const [migrationApplied, setMigrationApplied] = useState<boolean | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [selectedTables, setSelectedTables] = useState<MonthlyTableName[]>(
    monthTables.map((table) => table.name)
  );

  useEffect(() => {
    setMonth(previousMonth());
    setCurrentMonth(currentArgentinaMonth());
    const driveStatus = new URLSearchParams(window.location.search).get('drive');
    if (driveStatus === 'connected') {
      setSuccess('Google Drive quedó conectado correctamente.');
    } else if (driveStatus) {
      setError(
        driveStatus === 'access-denied'
          ? 'Se canceló el permiso de Google Drive. Para conectarlo, acepta el acceso solicitado y vuelve a esta página.'
          : 'Google no pudo completar la autorización. Revisa que el URI de redirección coincida exactamente con el registrado en Google Cloud y que la cuenta esté habilitada como usuario de prueba.'
      );
    }
    if (driveStatus) {
      window.history.replaceState(null, '', '/respaldo');
    }

    void refreshStatus();
  }, []);

  async function refreshStatus() {
    setLoadingStatus(true);
    const result = await obtenerEstadoRespaldoAction();
    setConnected(result.ok && Boolean(result.connected));
    setDriveReady(result.ok && Boolean(result.readyToConnect));
    setMissingSettings(result.missingSettings || []);
    setMigrationApplied(result.migrationApplied ?? null);
    if (!result.ok) setError(result.error || 'No se pudo consultar la conexión con Drive.');
    setLoadingStatus(false);
  }

  async function runBackup() {
    if (!month || !confirmed || selectedTables.length === 0) return;
    const selectedLabels = monthTables
      .filter((table) => selectedTables.includes(table.name))
      .map((table) => table.label);
    const monthLabel = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${month}-01T12:00:00Z`));

    if (
      !window.confirm(
        `Se creará un JSON en Google Drive con: ${selectedLabels.join(', ')}. Luego se borrarán de Supabase únicamente esas tablas del mes ${monthLabel}. Las tablas no seleccionadas y los datos maestros se conservarán. ¿Continuar?`
      )
    ) {
      return;
    }

    setRunning(true);
    setError('');
    setSuccess('');
    setFileUrl('');
    const result = await respaldarYLimpiarMesAction(month, selectedTables);
    setRunning(false);

    if (!result.ok) {
      setError(result.error || 'No se pudo completar el respaldo y la limpieza.');
      if (result.fileUrl) setFileUrl(result.fileUrl);
      return;
    }

    setFileUrl(result.fileUrl || '');
    setSuccess(
      `Respaldo guardado en Drive y limpieza completada para ${monthLabel}. Registros borrados: ${Object.values(
        result.deleted || {}
      ).reduce((total, count) => total + count, 0)}.`
    );
    setConfirmed(false);
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
            <h2 className="font-black text-slate-900">Conexión con Google Drive</h2>
            <p className="mt-1 text-sm text-slate-500">
              La cuenta conectada queda como destino compartido para los administradores.
            </p>
          </div>
          {loadingStatus ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Conectado
              </span>
              <a
                href="/api/google/drive/authorize"
                className="text-sm font-bold text-uap-azul underline underline-offset-2"
              >
                Reautorizar
              </a>
            </div>
          ) : driveReady ? (
            <a
              href="/api/google/drive/authorize"
              className="inline-flex items-center gap-2 rounded-xl bg-uap-azul px-4 py-2.5 text-sm font-bold text-white transition hover:bg-uap-azul-medio"
            >
              <CloudUpload className="h-4 w-4" />
              Conectar Google Drive
            </a>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              Falta configurar
            </span>
          )}
        </div>

        {!loadingStatus && !connected && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-950">
              <Settings2 className="h-4 w-4" />
              {driveReady
                ? 'Configuración lista: falta autorizar la cuenta de Google'
                : 'Pasos pendientes para activar Google Drive'}
            </div>
            <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-amber-950">
              {missingSettings.length > 0 && (
                <li>
                  Configurar en el servidor: <code>{missingSettings.join(', ')}</code>. Reiniciar
                  la app después de agregar las variables.
                </li>
              )}
              {migrationApplied === false && (
                <li>
                  Aplicar la migración{' '}
                  <code>supabase/migrations/20261021_google_drive_backup_tokens.sql</code> en
                  Supabase.
                </li>
              )}
              {migrationApplied === null && (
                <li>
                  Configurar <code>SUPABASE_SERVICE_ROLE_KEY</code> para que el servidor pueda
                  comprobar la migración.
                </li>
              )}
              {missingSettings.some((setting) => setting.startsWith('GOOGLE_TOKEN_ENCRYPTION_KEY')) && (
                <li>
                  Generar una clave Base64 de 32 bytes; mantenerla privada y estable. En el
                  README están los pasos.
                </li>
              )}
              {driveReady && (
                <li>
                  Pulsar <strong>Conectar Google Drive</strong> y aceptar los permisos con la
                  cuenta que será el destino compartido de respaldos.
                </li>
              )}
            </ol>
            <p className="text-[11px] leading-relaxed text-amber-900">
              En Google Cloud debe estar habilitada Google Drive API, y el URI de callback
              configurado en la app tiene que coincidir exactamente con el autorizado en
              OAuth. No compartas client secrets, tokens ni claves por chat.
            </p>
          </div>
        )}

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
              setConfirmed(false);
            }}
            max={currentMonth}
            className="mt-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-uap-azul focus:ring-2 focus:ring-uap-azul/20"
          />
        </div>

        <fieldset className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-bold text-slate-800">
              Seleccioná qué guardar y limpiar
            </legend>
            <div className="flex gap-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setSelectedTables(monthTables.map((table) => table.name));
                  setConfirmed(false);
                }}
                className="text-uap-azul underline underline-offset-2"
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTables([]);
                  setConfirmed(false);
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
                        setConfirmed(false);
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
            Solo se borrarán de Supabase las tablas marcadas, y únicamente para el mes
            elegido. Las que queden sin marcar se conservarán.
          </p>
        </fieldset>

        <p className="text-xs leading-relaxed text-slate-500">
          Alumnos, evaluaciones, usuarios, catálogos, la matriz semanal de reservas y la
          configuración del sistema se conservan siempre.
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-700"
          />
          <span>
            Entiendo que solo los registros de las tablas seleccionadas y del mes elegido se
            eliminarán de Supabase después de guardarse en Drive.
          </span>
        </label>

        <button
          type="button"
          onClick={runBackup}
          disabled={!connected || loadingStatus || running || !month || !confirmed || selectedTables.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {running ? 'Subiendo respaldo y limpiando…' : 'Respaldar en Drive y limpiar el mes'}
        </button>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-bold">{error}</p>
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-bold underline"
              >
                Abrir el respaldo que sí llegó a Drive
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-bold">{success}</p>
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-bold underline"
              >
                Abrir archivo en Google Drive
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
