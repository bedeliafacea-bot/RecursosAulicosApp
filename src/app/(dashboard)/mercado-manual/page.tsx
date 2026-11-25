'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, Download, Plus, Printer } from 'lucide-react';
import { analizarTextoPegado } from '@/lib/mercado-manual';
import type { FilaPegada } from '@/lib/mercado-manual';

interface RegistroMercado {
  id: string;
  fecha: string;
  hora: string;
  operacion: string;
  estado: string;
  monto: number;
}

const STORAGE_PREFIX = 'recursos-aulicos:mercado-manual:v1:';

function fechaLocalActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function esRegistroMercado(valor: unknown): valor is RegistroMercado {
  if (!valor || typeof valor !== 'object') return false;
  const registro = valor as Record<string, unknown>;
  return (
    typeof registro.id === 'string' &&
    typeof registro.fecha === 'string' &&
    typeof registro.hora === 'string' &&
    typeof registro.operacion === 'string' &&
    typeof registro.estado === 'string' &&
    typeof registro.monto === 'number' &&
    Number.isFinite(registro.monto)
  );
}

function escaparCsv(valor: string) {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

function mensajeError(error: unknown) {
  return error instanceof Error ? error.message : 'Error desconocido.';
}

function formatoFecha(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function MercadoManualPage() {
  const { user } = useAuth();
  const storageKey = user?.id ? `${STORAGE_PREFIX}${user.id}` : null;
  const [registros, setRegistros] = useState<RegistroMercado[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [operacion, setOperacion] = useState('');
  const [estado, setEstado] = useState('');
  const [monto, setMonto] = useState('');
  const [textoPegado, setTextoPegado] = useState('');
  const [filasPegadas, setFilasPegadas] = useState<FilaPegada[]>([]);
  const [filasOmitidas, setFilasOmitidas] = useState(0);
  const [errorPegado, setErrorPegado] = useState('');
  const [avisoImportacion, setAvisoImportacion] = useState('');

  useEffect(() => {
    setFecha((actual) => actual || fechaLocalActual());
  }, []);

  useEffect(() => {
    setLoadedKey(null);
    setRegistros([]);
    setStorageError('');

    if (!storageKey) {
      setStorageError('Necesitás iniciar sesión para usar este registro.');
      return;
    }

    try {
      const guardado = window.localStorage.getItem(storageKey);
      const datos: unknown = guardado ? JSON.parse(guardado) : [];
      if (!Array.isArray(datos) || !datos.every(esRegistroMercado)) {
        throw new Error('Los datos guardados no tienen el formato esperado.');
      }
      setRegistros(datos);
      setLoadedKey(storageKey);
    } catch (error) {
      setStorageError(`No se pudieron cargar los datos de este navegador. ${mensajeError(error)}`);
    }
  }, [storageKey]);

  const cargado = storageKey !== null && loadedKey === storageKey;
  const registrosDelDia = useMemo(
    () =>
      registros
        .filter((registro) => registro.fecha === fecha)
        .sort((a, b) => b.hora.localeCompare(a.hora) || b.id.localeCompare(a.id)),
    [fecha, registros]
  );
  const totalDelDia = registrosDelDia.reduce((total, registro) => total + registro.monto, 0);
  const registrosImpresion = useMemo(
    () =>
      [...registrosDelDia].sort(
        (a, b) => a.hora.localeCompare(b.hora) || a.id.localeCompare(b.id)
      ),
    [registrosDelDia]
  );

  function guardarRegistros(nuevosRegistros: RegistroMercado[]) {
    if (!storageKey || !cargado) return false;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nuevosRegistros));
      setRegistros(nuevosRegistros);
      setStorageError('');
      return true;
    } catch (error) {
      setStorageError(`No se pudieron guardar los cambios en este navegador. ${mensajeError(error)}`);
      return false;
    }
  }

  function agregarRegistro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const montoNumerico = Number(monto);
    if (!fecha || !Number.isFinite(montoNumerico) || montoNumerico < 0) {
      setStorageError('Revisá la fecha y el monto antes de guardar.');
      return;
    }

    const nuevoRegistro: RegistroMercado = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fecha,
      hora,
      operacion: operacion.trim(),
      estado: estado.trim(),
      monto: montoNumerico,
    };
    if (!guardarRegistros([...registros, nuevoRegistro])) return;
    setHora('');
    setOperacion('');
    setEstado('');
    setMonto('');
  }

  function prepararPegado() {
    setErrorPegado('');
    setAvisoImportacion('');
    setFilasPegadas([]);
    setFilasOmitidas(0);
    if (!fecha) {
      setErrorPegado('Elegí la fecha de la actividad antes de analizar el texto.');
      return;
    }

    const resultado = analizarTextoPegado(textoPegado, fecha);
    if (resultado.operacionesDetectadas === 0) {
      setErrorPegado('No encontré operaciones con el formato “Operación 123…”.');
      return;
    }
    if (resultado.filas.length === 0) {
      setErrorPegado(`Encontré ${resultado.operacionesDetectadas} operación(es), pero no pude interpretar sus datos completos.`);
      return;
    }

    setFilasPegadas(resultado.filas);
    setFilasOmitidas(resultado.omitidas);
  }

  function importarPegado() {
    const existentes = new Set(
      registros.map((registro) => `${registro.fecha}|${registro.hora}|${registro.operacion}`)
    );
    const nuevasFilas: RegistroMercado[] = [];
    let duplicadas = 0;

    for (const fila of filasPegadas) {
      const clave = `${fila.fecha}|${fila.hora}|${fila.operacion}`;
      if (existentes.has(clave)) {
        duplicadas += 1;
        continue;
      }
      existentes.add(clave);
      nuevasFilas.push({
        ...fila,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
    }

    if (nuevasFilas.length === 0) {
      setAvisoImportacion(`No se agregaron filas nuevas. ${duplicadas} ya estaban cargadas.`);
      return;
    }

    if (!guardarRegistros([...registros, ...nuevasFilas])) return;
    const fechaMasReciente = nuevasFilas
      .map((fila) => fila.fecha)
      .sort((a, b) => b.localeCompare(a))[0];
    setFecha(fechaMasReciente);
    setAvisoImportacion(
      `Se agregaron ${nuevasFilas.length} operación(es)${duplicadas ? `; ${duplicadas} duplicada(s) no se repitieron` : ''}.`
    );
  }

  function descargarCsv() {
    const filas = [
      ['Hora', 'Número de operación', 'Estado', 'Monto'],
      ...registrosDelDia.map((registro) => [
        registro.hora,
        escaparCsv(registro.operacion),
        escaparCsv(registro.estado),
        String(registro.monto),
      ]),
    ];
    const contenido = `\uFEFF${filas.map((fila) => fila.join(';')).join('\r\n')}`;
    const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `mercado-${fecha}.csv`;
    enlace.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
    <div className="no-print-zone mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-uap-azul-medio">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Registro manual
          </div>
          <h1 className="text-3xl font-black tracking-tight text-uap-azul">Actividad de Mercado Pago</h1>
          <p className="mt-2 max-w-2xl text-sm text-uap-gris">
            Cargá las operaciones que ves en la actividad. Este registro es independiente de Caja y no modifica Mercado Pago.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!cargado || registrosDelDia.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-uap-azul px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-uap-azul-oscuro disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir formulario
          </button>
          <button
            type="button"
            onClick={descargarCsv}
            disabled={!cargado || registrosDelDia.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-uap-azul bg-white px-4 py-2 text-sm font-bold text-uap-azul shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar CSV del día
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-uap-borde bg-white p-5 shadow-uap">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm font-bold text-uap-azul">
            <span>Fecha del registro</span>
            <input
              type="date"
              required
              value={fecha}
              onChange={(event) => {
                setFecha(event.target.value);
                setFilasPegadas([]);
                setFilasOmitidas(0);
                setErrorPegado('');
                setAvisoImportacion('');
              }}
              className="min-h-10 rounded-lg border border-uap-borde px-3 text-sm font-semibold text-slate-700 focus:border-uap-azul-medio focus:outline-none focus:ring-2 focus:ring-uap-azul-medio/20"
            />
          </label>
          <div className="flex gap-5 text-sm">
            <div><span className="text-uap-gris">Operaciones</span><strong className="ml-2 text-uap-azul">{registrosDelDia.length}</strong></div>
            <div><span className="text-uap-gris">Monto cargado</span><strong className="ml-2 text-uap-azul">{totalDelDia.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</strong></div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <label htmlFor="mercado-texto-pegado" className="block text-sm font-bold text-uap-azul">
            Pegá aquí la actividad copiada de Mercado Pago
          </label>
          <p className="mt-1 text-xs text-uap-gris">
            Reconoce la hora, número de operación, estado, monto y encabezados como “24 de noviembre”. Lo que no pueda interpretar se informa antes de guardar.
          </p>
          <textarea
            id="mercado-texto-pegado"
            rows={7}
            value={textoPegado}
            onChange={(event) => {
              setTextoPegado(event.target.value);
              setFilasPegadas([]);
              setErrorPegado('');
              setAvisoImportacion('');
            }}
            placeholder={'Pegá el texto copiado. Por ejemplo:\n10:54\nVenta con código QR\nOperación 123456789\nAprobado\n+\n$\n750'}
            className="mt-3 w-full rounded-lg border border-uap-borde px-3 py-2 font-mono text-xs leading-5 text-slate-800 focus:border-uap-azul-medio focus:outline-none focus:ring-2 focus:ring-uap-azul-medio/20"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={prepararPegado}
              disabled={!cargado}
              className="min-h-10 rounded-lg border border-uap-azul px-4 py-2 text-sm font-bold text-uap-azul transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ordenar y revisar
            </button>
            {filasPegadas.length > 0 && (
              <button
                type="button"
                onClick={importarPegado}
                className="min-h-10 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Guardar {filasPegadas.length} operación(es)
              </button>
            )}
          </div>
          {errorPegado && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{errorPegado}</p>}
          {filasOmitidas > 0 && (
            <p role="status" className="mt-3 text-sm font-medium text-amber-700">
              No se pudieron interpretar {filasOmitidas} operación(es); revisá el texto antes de importar.
            </p>
          )}
          {avisoImportacion && <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{avisoImportacion}</p>}
          {filasPegadas.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-uap-borde">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Hora</th>
                    <th scope="col" className="px-4 py-3">Número de operación</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from(new Set(filasPegadas.map((fila) => fila.fecha)))
                    .sort((a, b) => b.localeCompare(a))
                    .flatMap((fechaGrupo) => [
                      <tr key={`fecha-${fechaGrupo}`} className="bg-blue-50">
                        <th colSpan={4} scope="rowgroup" className="px-4 py-2 text-xs font-extrabold uppercase text-uap-azul">
                          {formatoFecha(fechaGrupo)}
                        </th>
                      </tr>,
                      ...filasPegadas
                        .filter((fila) => fila.fecha === fechaGrupo)
                        .sort((a, b) => b.hora.localeCompare(a.hora))
                        .map((fila) => (
                          <tr key={`${fila.fecha}-${fila.hora}-${fila.operacion}`} className="text-slate-700">
                            <td className="whitespace-nowrap px-4 py-3 font-semibold">{fila.hora}</td>
                            <td className="px-4 py-3 font-mono text-xs">{fila.operacion}</td>
                            <td className="px-4 py-3">{fila.estado}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                              {fila.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                            </td>
                          </tr>
                        )),
                    ])}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={agregarRegistro} className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-xs font-bold text-slate-600">
            Hora
            <input
              required
              type="time"
              value={hora}
              onChange={(event) => setHora(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-uap-borde px-3 text-sm font-medium text-slate-800 focus:border-uap-azul-medio focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            Número de operación
            <input
              required
              type="text"
              value={operacion}
              onChange={(event) => setOperacion(event.target.value)}
              placeholder="Ej. 191553067010"
              className="min-h-11 w-full rounded-lg border border-uap-borde px-3 text-sm font-medium text-slate-800 focus:border-uap-azul-medio focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            Estado
            <input
              required
              type="text"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              placeholder="Aprobado"
              className="min-h-11 w-full rounded-lg border border-uap-borde px-3 text-sm font-medium text-slate-800 focus:border-uap-azul-medio focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            Monto ($)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              placeholder="0,00"
              className="min-h-11 w-full rounded-lg border border-uap-borde px-3 text-sm font-medium text-slate-800 focus:border-uap-azul-medio focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={!cargado}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar
          </button>
        </form>

        {storageError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {storageError}
          </p>
        )}

        {!cargado && !storageError && (
          <p className="mt-4 text-sm text-uap-gris">Cargando tus registros locales...</p>
        )}

        {cargado && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-uap-borde">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Hora</th>
                  <th scope="col" className="px-4 py-3">Número de operación</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosDelDia.map((registro) => (
                  <tr key={registro.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{registro.hora}</td>
                    <td className="px-4 py-3 font-mono text-xs">{registro.operacion}</td>
                    <td className="px-4 py-3">{registro.estado}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                      {registro.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                    </td>
                  </tr>
                ))}
                {registrosDelDia.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-uap-gris">
                      No hay operaciones cargadas para esta fecha. Completá el formulario para agregar la primera.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-uap-gris">
          Los datos se guardan en este navegador y en tu perfil; no se comparten ni se sincronizan con otros dispositivos. Descargá el CSV para conservar una copia.
        </p>
      </section>
    </div>
    <section className="print-mercado-report">
      <header className="print-mercado-header">
        <img src="/img/logo-uap.png" alt="Logo de la Universidad Adventista del Plata" />
        <div>
          <p className="print-mercado-institution">Universidad Adventista del Plata</p>
        </div>
      </header>
      <div className="print-mercado-title">
        <h1>Registro Mercado Pago</h1>
        <p>Mercado Pago · {fecha ? formatoFecha(fecha) : ''}</p>
      </div>
      <table className="print-mercado-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Número de operación</th>
            <th>Estado</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {registrosImpresion.map((registro) => (
            <tr key={registro.id}>
              <td>{registro.hora}</td>
              <td>{registro.operacion}</td>
              <td>{registro.estado}</td>
              <td className="print-mercado-amount">
                {registro.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
    </>
  );
}
