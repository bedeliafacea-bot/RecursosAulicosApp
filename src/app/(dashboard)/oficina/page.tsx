'use client';

import React, { useEffect, useState } from 'react';
import {
  obtenerDepartamentosAction,
  registrarGastoFotocopiaAction,
  registrarPagoEfectivoAction,
  registrarRetiroEfectivoAction,
  obtenerResumenOficinaAction,
  ResumenDepartamento,
  UltimoMovimiento,
} from '@/app/actions/oficina';
import { Departamento, RetiroEfectivo } from '@/lib/types/database.types';
import { useAuth } from '@/context/AuthContext';
import { fechaHoyAR, mesAnioActualAR } from '@/lib/horas';
import {
  FileText,
  DollarSign,
  Calculator,
  Printer,
  Plus,
  TrendingUp,
  Layers,
  History,
  CheckCircle2,
  Calendar,
  Loader2,
  RefreshCw,
  Building2,
  FileCheck2,
  MinusCircle,
} from 'lucide-react';

export default function OficinaPage() {
  const { rol } = useAuth();
  const fechaHoy = fechaHoyAR();
  const [tabActiva, setTabActiva] = useState<'depto' | 'efectivo' | 'informe'>('depto');

  // Mes y Año dinámico (default hoy)
  const [mesSeleccionado, setMesSeleccionado] = useState(() => mesAnioActualAR().mes);
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => mesAnioActualAR().anio);

  // Datos
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [resumenDeptos, setResumenDeptos] = useState<ResumenDepartamento[]>([]);
  const [totalEfectivoMes, setTotalEfectivoMes] = useState(0);
  const [totalRetirosEfectivoMes, setTotalRetirosEfectivoMes] = useState(0);
  const [retirosEfectivoMes, setRetirosEfectivoMes] = useState<RetiroEfectivo[]>([]);
  const [copiasDeptosMes, setCopiasDeptosMes] = useState(0);
  const [copiasEfectivoMes, setCopiasEfectivoMes] = useState(0);
  const [gastosDeptosTotal, setGastosDeptosTotal] = useState(0);
  const [ultimoMovimiento, setUltimoMovimiento] = useState<UltimoMovimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  // Formulario Consumo Depto
  const [fecDepto, setFecDepto] = useState(fechaHoy);
  const [nombreDepto, setNombreDepto] = useState('');
  const [cantDepto, setCantDepto] = useState<number | ''>('');
  const [valDepto, setValDepto] = useState<number>(150);
  const [guardandoDepto, setGuardandoDepto] = useState(false);
  const [msgDepto, setMsgDepto] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Formulario Pago Efectivo
  const [fecEf, setFecEf] = useState(fechaHoy);
  const [cantEf, setCantEf] = useState<number | ''>('');
  const [valEf, setValEf] = useState<number>(150);
  const [guardandoEf, setGuardandoEf] = useState(false);
  const [msgEf, setMsgEf] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Formulario de retiros de efectivo
  const [fecRetiro, setFecRetiro] = useState(fechaHoy);
  const [descripcionRetiro, setDescripcionRetiro] = useState('');
  const [montoRetiro, setMontoRetiro] = useState<number | ''>('');
  const [guardandoRetiro, setGuardandoRetiro] = useState(false);
  const [msgRetiro, setMsgRetiro] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Calculadora Rápida Lateral
  const [calcCant, setCalcCant] = useState<number | ''>(10);
  const [calcPrecio, setCalcPrecio] = useState<number>(150);

  const cargarDatos = async () => {
    setLoading(true);
    const [resDeptos, resResumen] = await Promise.all([
      obtenerDepartamentosAction(),
      obtenerResumenOficinaAction(mesSeleccionado, anioSeleccionado),
    ]);

    if (resDeptos.ok && resDeptos.data) setDepartamentos(resDeptos.data);
    if (resResumen.ok) {
      setErrorCarga('');
      setResumenDeptos(resResumen.resumenDeptos || []);
      setTotalEfectivoMes(resResumen.totalEfectivoMes || 0);
      setTotalRetirosEfectivoMes(resResumen.totalRetirosEfectivoMes || 0);
      setRetirosEfectivoMes(resResumen.retirosEfectivoMes || []);
      setCopiasDeptosMes(resResumen.copiasDeptosMes || 0);
      setCopiasEfectivoMes(resResumen.copiasEfectivoMes || 0);
      setGastosDeptosTotal(resResumen.gastosDeptosTotal || 0);
      setUltimoMovimiento(resResumen.ultimoMovimiento || null);
    } else {
      setErrorCarga(resResumen.error || 'No se pudieron cargar los movimientos de Oficina.');
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [mesSeleccionado, anioSeleccionado]);

  const handleGuardarDepto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreDepto || !cantDepto || Number(cantDepto) <= 0) {
      setMsgDepto({ tipo: 'error', texto: 'Completá departamento y cantidad de copias.' });
      return;
    }

    setGuardandoDepto(true);
    setMsgDepto(null);

    const deptoObj = departamentos.find((d) => d.nombre.toLowerCase() === nombreDepto.toLowerCase());

    const res = await registrarGastoFotocopiaAction({
      fecha: fecDepto,
      departamento_id: deptoObj?.id,
      departamento_nombre: nombreDepto,
      cantidad: Number(cantDepto),
      valor_unitario: Number(valDepto),
    });

    if (res.ok) {
      setMsgDepto({ tipo: 'ok', texto: '✅ Consumo registrado correctamente.' });
      setCantDepto('');
      cargarDatos();
    } else {
      setMsgDepto({ tipo: 'error', texto: res.error || 'Error al guardar consumo.' });
    }
    setGuardandoDepto(false);
  };

  const handleGuardarEfectivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cantEf || Number(cantEf) <= 0) {
      setMsgEf({ tipo: 'error', texto: 'Ingresá la cantidad de copias cobradas.' });
      return;
    }

    setGuardandoEf(true);
    setMsgEf(null);

    const res = await registrarPagoEfectivoAction({
      fecha: fecEf,
      cantidad_copias: Number(cantEf),
      valor_unitario: Number(valEf),
    });

    if (res.ok) {
      setMsgEf({ tipo: 'ok', texto: '✅ Cobro en efectivo registrado correctamente.' });
      setCantEf('');
      cargarDatos();
    } else {
      setMsgEf({ tipo: 'error', texto: res.error || 'Error al registrar cobro.' });
    }
    setGuardandoEf(false);
  };

  const handleGuardarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecRetiro || !descripcionRetiro.trim() || !montoRetiro || Number(montoRetiro) <= 0) {
      setMsgRetiro({
        tipo: 'error',
        texto: 'Completá la fecha, el motivo y un importe mayor a cero.',
      });
      return;
    }

    setGuardandoRetiro(true);
    setMsgRetiro(null);
    const res = await registrarRetiroEfectivoAction({
      fecha: fecRetiro,
      descripcion: descripcionRetiro,
      monto: Number(montoRetiro),
    });

    if (res.ok) {
      setMsgRetiro({ tipo: 'ok', texto: 'Retiro de efectivo registrado correctamente.' });
      setDescripcionRetiro('');
      setMontoRetiro('');
      await cargarDatos();
    } else {
      setMsgRetiro({ tipo: 'error', texto: res.error || 'No se pudo registrar el retiro.' });
    }
    setGuardandoRetiro(false);
  };

  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Institucional (Oculto en Impresión) */}
      <div className="no-print bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-uap-azul via-uap-azul-medio to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-uap-azul/20">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-uap-azul">
              Gestión de Oficina y Fotocopiado
            </h1>
            <p className="text-sm text-uap-gris mt-0.5">
              Control de consumos por departamento, ingresos de caja en efectivo y balances
            </p>
          </div>
        </div>

        <button
          onClick={cargarDatos}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-uap-azul text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Selector de Pestañas y Periodo (Oculto en Impresión) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-uap-borde">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setTabActiva('depto')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              tabActiva === 'depto'
                ? 'bg-uap-azul text-white shadow-sm'
                : 'text-slate-600 hover:text-uap-azul'
            }`}
          >
            Consumo Departamentos
          </button>
          <button
            onClick={() => setTabActiva('efectivo')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              tabActiva === 'efectivo'
                ? 'bg-uap-azul text-white shadow-sm'
                : 'text-slate-600 hover:text-uap-azul'
            }`}
          >
            Pago Efectivo (Mostrador)
          </button>
          <button
            onClick={() => setTabActiva('informe')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              tabActiva === 'informe'
                ? 'bg-uap-azul text-white shadow-sm'
                : 'text-slate-600 hover:text-uap-azul'
            }`}
          >
            Informe Mensual A4
          </button>
        </div>

        {errorCarga && (
          <div
            role="alert"
            className="no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          >
            {errorCarga}
            {errorCarga.includes('retiros_efectivo') && (
              <span className="mt-1 block text-xs">
                Para activar los retiros, aplicá la migración
                {' '}<code>20261022_cash_withdrawals.sql</code> en Supabase.
              </span>
            )}
          </div>
        )}

        {/* Selector de Mes y Año Dinámico */}
        <div className="flex items-center gap-2">
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-uap-texto focus:ring-2 focus:ring-uap-azul"
          >
            {nombresMeses.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-uap-texto focus:ring-2 focus:ring-uap-azul"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenedor Principal: 2 Columnas (Formularios / Informe a la izquierda + Métricas y Calculadora a la derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ========================================================
            COLUMNA IZQUIERDA (2 Columnas de ancho)
        ======================================================== */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: CONSUMO DEPARTAMENTO */}
          {tabActiva === 'depto' && (
            <div className="no-print bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                <Building2 className="w-5 h-5 text-uap-azul" />
                <h2 className="text-lg font-black text-uap-azul">
                  Registrar Consumo por Departamento
                </h2>
              </div>

              {msgDepto && (
                <div
                  className={`mb-5 p-3.5 rounded-xl text-xs font-bold ${
                    msgDepto.tipo === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {msgDepto.texto}
                </div>
              )}

              <form onSubmit={handleGuardarDepto} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                      Fecha del Consumo
                    </label>
                    <input
                      type="date"
                      value={fecDepto}
                      onChange={(e) => setFecDepto(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                      Departamento
                    </label>
                    <input
                      type="text"
                      list="lista-deptos"
                      value={nombreDepto}
                      onChange={(e) => setNombreDepto(e.target.value)}
                      placeholder="Seleccionar o escribir..."
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm font-semibold"
                    />
                    <datalist id="lista-deptos">
                      {departamentos.map((d) => (
                        <option key={d.id} value={d.nombre} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                      Cantidad de Fotocopias
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cantDepto}
                      onChange={(e) => setCantDepto(e.target.value ? Number(e.target.value) : '')}
                      placeholder="ej: 120"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                      Valor Unitario ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valDepto}
                      onChange={(e) => setValDepto(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm font-semibold"
                    />
                  </div>
                </div>

                {/* Subtotal en tiempo real */}
                <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-uap-azul">Total a imputar:</span>
                  <span className="text-2xl font-black text-uap-azul">
                    ${((Number(cantDepto) || 0) * (Number(valDepto) || 0)).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={guardandoDepto}
                  className="w-full py-3 px-6 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {guardandoDepto ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Guardar Gasto en Cuenta Departamental</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: PAGO EFECTIVO (MOSTRADOR) */}
          {tabActiva === 'efectivo' && (
            <div className="no-print bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-black text-uap-azul">
                  Registrar Cobro en Efectivo (Mostrador)
                </h2>
              </div>

              {msgEf && (
                <div
                  className={`mb-5 p-3.5 rounded-xl text-xs font-bold ${
                    msgEf.tipo === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {msgEf.texto}
                </div>
              )}

              <form onSubmit={handleGuardarEfectivo} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                    Fecha del Cobro
                  </label>
                  <input
                    type="date"
                    value={fecEf}
                    onChange={(e) => setFecEf(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                      Cantidad de Copias
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cantEf}
                      onChange={(e) => setCantEf(e.target.value ? Number(e.target.value) : '')}
                      placeholder="ej: 35"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                      Valor Unitario ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valEf}
                      onChange={(e) => setValEf(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Total cobrado:</span>
                  <span className="text-2xl font-black text-emerald-700">
                    ${((Number(cantEf) || 0) * (Number(valEf) || 0)).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={guardandoEf}
                  className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {guardandoEf ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Ingresar Dinero a Caja</span>
                </button>
              </form>

              <section className="mt-8 border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <MinusCircle className="h-5 w-5 text-rose-600" />
                  <div>
                    <h3 className="text-base font-black text-uap-azul">
                      Retiro de dinero en efectivo
                    </h3>
                    <p className="text-xs text-slate-500">
                      Registrá pagos o compras realizados con dinero de la caja.
                    </p>
                  </div>
                </div>

                {msgRetiro && (
                  <div
                    role="status"
                    className={`mb-4 rounded-xl border p-3 text-xs font-bold ${
                      msgRetiro.tipo === 'ok'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {msgRetiro.texto}
                  </div>
                )}

                <form onSubmit={handleGuardarRetiro} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="fecha-retiro-efectivo"
                      className="mb-1.5 block text-xs font-black uppercase tracking-wider text-uap-texto"
                    >
                      Fecha del retiro
                    </label>
                    <input
                      id="fecha-retiro-efectivo"
                      type="date"
                      value={fecRetiro}
                      onChange={(event) => setFecRetiro(event.target.value)}
                      required
                      className="w-full rounded-xl border border-uap-borde bg-slate-50 px-3.5 py-2.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="monto-retiro-efectivo"
                      className="mb-1.5 block text-xs font-black uppercase tracking-wider text-uap-texto"
                    >
                      Importe retirado ($)
                    </label>
                    <input
                      id="monto-retiro-efectivo"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={montoRetiro}
                      onChange={(event) =>
                        setMontoRetiro(event.target.value ? Number(event.target.value) : '')
                      }
                      placeholder="ej: 2500"
                      required
                      className="w-full rounded-xl border border-uap-borde bg-slate-50 px-3.5 py-2.5 text-sm font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="descripcion-retiro-efectivo"
                      className="mb-1.5 block text-xs font-black uppercase tracking-wider text-uap-texto"
                    >
                      Motivo o detalle
                    </label>
                    <input
                      id="descripcion-retiro-efectivo"
                      type="text"
                      maxLength={160}
                      value={descripcionRetiro}
                      onChange={(event) => setDescripcionRetiro(event.target.value)}
                      placeholder="Ej.: compra de materiales"
                      required
                      className="w-full rounded-xl border border-uap-borde bg-slate-50 px-3.5 py-2.5 text-sm font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={guardandoRetiro}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-rose-800 disabled:opacity-60 sm:col-span-2"
                  >
                    {guardandoRetiro && <Loader2 className="h-4 w-4 animate-spin" />}
                    Registrar retiro
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-rose-900">
                      Retiros de {nombresMeses[mesSeleccionado - 1]}
                    </span>
                    <strong className="text-sm text-rose-800">
                      ${totalRetirosEfectivoMes.toFixed(2)}
                    </strong>
                  </div>
                  {retirosEfectivoMes.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500">No hay retiros registrados en este mes.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-rose-100">
                      {retirosEfectivoMes.map((retiro) => (
                        <li
                          key={retiro.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                        >
                          <span className="min-w-0">
                            <strong className="text-slate-700">{retiro.descripcion}</strong>
                            <span className="ml-2 text-slate-500">{retiro.fecha}</span>
                          </span>
                          <strong className="text-rose-800">${Number(retiro.monto).toFixed(2)}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 3 / PLANILLA: INFORME MENSUAL A4 POR DEPARTAMENTO */}
          <div
            className={`bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde print:shadow-none print:border-none print:p-0 ${
              tabActiva === 'informe' ? 'block' : 'hidden print:block'
            }`}
          >
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-black text-uap-azul">
                  Informe Mensual de Consumo por Departamento
                </h2>
                <p className="text-xs text-slate-400">
                  Período: {nombresMeses[mesSeleccionado - 1]} / {anioSeleccionado}
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-bold rounded-xl shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir A4</span>
              </button>
            </div>

            {/* Formato Oficial de Impresión */}
            <div className="print-page-portrait space-y-4">
              <div className="text-center pb-4 border-b-2 border-uap-azul flex items-center justify-between">
                <img
                  src="/img/logo-uap.png"
                  alt="Logo UAP"
                  className="w-16 h-auto"
                />
                <div className="text-center flex-1 px-4">
                  <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-500">
                    Universidad Adventista del Plata
                  </h3>
                  <h2 className="text-lg font-black text-uap-azul">
                    INFORME DE CONSUMOS DE FOTOCOPIAS
                  </h2>
                  <p className="text-xs font-bold text-slate-600">
                    Mes: {nombresMeses[mesSeleccionado - 1]} {anioSeleccionado} • Recursos Áulicos
                  </p>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-500">
                  Emitido: {fechaHoy}
                </div>
              </div>

              {resumenDeptos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No se registraron consumos de fotocopias para este período.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-50 font-black text-uap-texto">
                      <th className="py-2.5 px-3">Departamento Imputado</th>
                      <th className="py-2.5 px-3 text-right">Cantidad de Copias</th>
                      <th className="py-2.5 px-3 text-right">Valor Unitario</th>
                      <th className="py-2.5 px-3 text-right">Importe Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {resumenDeptos.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-uap-texto">{d.departamento}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">{d.cantidad}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          ${d.precioUnit.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-uap-azul">
                          ${d.importe.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-400 bg-slate-50 font-black text-uap-texto">
                      <td className="py-3 px-3 uppercase">Total Mensual Consumido:</td>
                      <td className="py-3 px-3 text-right font-mono text-sm">{copiasDeptosMes}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">—</td>
                      <td className="py-3 px-3 text-right font-mono text-base text-uap-azul">
                        ${gastosDeptosTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* Pie de Firma de Impresión */}
              <div className="pt-12 flex justify-end">
                <div className="text-center w-60 border-t border-black pt-2">
                  <p className="font-black text-xs">Rafael Carro</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500">
                    Recursos Áulicos | Bedelía UAP
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMNA DERECHA: CALCULADORA RÁPIDA Y MÉTRICAS (Oculto en Impresión)
        ======================================================== */}
        <div className="no-print space-y-6">
          {/* CALCULADORA RÁPIDA */}
          <div className="bg-gradient-to-br from-uap-azul via-uap-azul-medio to-uap-azul-profundo text-white rounded-3xl p-6 shadow-xl border border-white/10">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/20 mb-4">
              <Calculator className="w-5 h-5 text-blue-300" />
              <h3 className="text-base font-black tracking-wide">Calculadora Rápida</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-white/80 uppercase mb-1">
                  Cantidad de Copias
                </label>
                <input
                  type="number"
                  min="1"
                  value={calcCant}
                  onChange={(e) => setCalcCant(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white/15 border border-white/20 rounded-xl text-white font-extrabold text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/80 uppercase mb-1">
                  Precio Unitario ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={calcPrecio}
                  onChange={(e) => setCalcPrecio(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/15 border border-white/20 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>

              <div className="pt-2 text-center bg-black/20 rounded-2xl p-3 border border-white/10 mt-3">
                <span className="text-[10px] uppercase tracking-widest text-blue-200 font-black">
                  Total a Cobrar
                </span>
                <div className="text-3xl font-black text-white mt-1">
                  ${((Number(calcCant) || 0) * (Number(calcPrecio) || 0)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* RESUMEN DE MÉTRICAS DEL MES */}
          <div className="bg-white rounded-3xl p-6 shadow-uap border border-uap-borde space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <TrendingUp className="w-5 h-5 text-uap-azul-medio" />
              <h3 className="text-sm font-black text-uap-azul">
                Métricas del Mes ({nombresMeses[mesSeleccionado - 1]})
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-600">Gastos Departamentos</span>
                <span className="font-black text-uap-azul text-sm">${gastosDeptosTotal.toFixed(2)}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-600">Copias Departamentos</span>
                <span className="font-black text-slate-800 text-sm">{copiasDeptosMes}</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <span className="font-bold text-emerald-900">Ingresos en efectivo</span>
                <span className="font-black text-emerald-700 text-sm">${totalEfectivoMes.toFixed(2)}</span>
              </div>

              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                <span className="font-bold text-rose-900">Retiros en efectivo</span>
                <span className="font-black text-rose-700 text-sm">
                  ${totalRetirosEfectivoMes.toFixed(2)}
                </span>
              </div>

              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <span className="font-bold text-indigo-900">Ingresos menos retiros del mes</span>
                <span className="font-black text-indigo-700 text-sm">
                  ${(totalEfectivoMes - totalRetirosEfectivoMes).toFixed(2)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <span className="font-bold text-emerald-900">Copias en Efectivo</span>
                <span className="font-black text-emerald-800 text-sm">{copiasEfectivoMes}</span>
              </div>
            </div>
          </div>

          {/* ÚLTIMO MOVIMIENTO REGISTRADO */}
          {ultimoMovimiento && (
            <div className="bg-white rounded-3xl p-6 shadow-uap border border-uap-borde">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Último Movimiento
                </h3>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-extrabold text-uap-texto truncate">
                  {ultimoMovimiento.detalle}
                </div>
                <div className="text-[11px] text-slate-400">
                  Fecha: {ultimoMovimiento.fecha}
                  {ultimoMovimiento.cantidad !== undefined && ` • ${ultimoMovimiento.cantidad} copias`}
                </div>
                <div className={`pt-1 text-lg font-black ${
                  ultimoMovimiento.tipo === 'retiro' ? 'text-rose-700' : 'text-uap-azul'
                }`}>
                  {ultimoMovimiento.tipo === 'retiro' ? 'Retiro: −' : ''}
                  ${ultimoMovimiento.total.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
