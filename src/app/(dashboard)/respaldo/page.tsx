'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  DatabaseBackup,
  ExternalLink,
  Loader2,
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
  'Jornadas de becarios',
  'Horarios pactados',
  'Fotocopias',
  'Pagos en efectivo',
  'Reservas especiales',
  'Cierres de caja',
];

export default function RespaldoMensualPage() {
  const { rol } = useAuth();
  const [month, setMonth] = useState('');
  const [currentMonth, setCurrentMonth] = useState('');
  const [connected, setConnected] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setMonth(previousMonth());
    setCurrentMonth(currentArgentinaMonth());
    const driveStatus = new URLSearchParams(window.location.search).get('drive');
    if (driveStatus === 'connected') {
      setSuccess('Google Drive quedó conectado correctamente.');
    } else if (driveStatus) {
      setError(
        'No se pudo conectar Google Drive. Verificá la configuración OAuth del servidor e intentá nuevamente.'
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
    if (!result.ok) setError(result.error || 'No se pudo consultar la conexión con Drive.');
    setLoadingStatus(false);
  }

  async function runBackup() {
    if (!month || !confirmed) return;
    const monthLabel = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${month}-01T12:00:00Z`));

    if (
      !window.confirm(
        `Se creará un JSON en Google Drive y luego se borrarán los registros operativos de ${monthLabel}. Los datos maestros y las evaluaciones se conservarán. ¿Continuar?`
      )
    ) {
      return;
    }

    setRunning(true);
    setError('');
    setSuccess('');
    setFileUrl('');
    const result = await respaldarYLimpiarMesAction(month);
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
          ) : (
            <a
              href="/api/google/drive/authorize"
              className="inline-flex items-center gap-2 rounded-xl bg-uap-azul px-4 py-2.5 text-sm font-bold text-white transition hover:bg-uap-azul-medio"
            >
              <CloudUpload className="h-4 w-4" />
              Conectar Google Drive
            </a>
          )}
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
              setConfirmed(false);
            }}
            max={currentMonth}
            className="mt-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-uap-azul focus:ring-2 focus:ring-uap-azul/20"
          />
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-800">
            Se incluirán únicamente registros con fecha de estas tablas:
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {monthTables.map((table) => (
              <li key={table} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                {table}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Se conservarán alumnos, evaluaciones, usuarios, catálogos, la matriz semanal de
            reservas y la configuración del sistema.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-700"
          />
          <span>
            Entiendo que los registros del mes elegido se eliminarán de Supabase después de
            guardarse en Drive.
          </span>
        </label>

        <button
          type="button"
          onClick={runBackup}
          disabled={!connected || loadingStatus || running || !month || !confirmed}
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
