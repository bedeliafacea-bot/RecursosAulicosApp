'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fechaHoyAR } from '@/lib/horas';
import {
  guardarCierreCajaAction,
  obtenerHistorialCierresAction,
  GuardarCierreInput,
} from '@/app/actions/caja';
import {
  ReciboItem,
  MercadoPagoItem,
  TransferenciaItem,
  CierreCaja,
} from '@/lib/types/database.types';
import {
  DollarSign,
  Receipt,
  CreditCard,
  Building,
  Printer,
  Save,
  History,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  X,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react';

export default function FacturacionPage() {
  const { rol, perfil } = useAuth();
  const fechaHoy = fechaHoyAR();

  // 1. GENERADOR DE RECIBOS
  const [desdeRecibo, setDesdeRecibo] = useState<number>(1001);
  const [hastaRecibo, setHastaRecibo] = useState<number>(1020);
  const [inputAnulados, setInputAnulados] = useState<string>('');
  const [inputEfectivo, setInputEfectivo] = useState<string>('');
  const [inputTransfer, setInputTransfer] = useState<string>('');
  const [recibos, setRecibos] = useState<ReciboItem[]>([]);

  // 2. MERCADO PAGO
  const [mercadoPagoList, setMercadoPagoList] = useState<MercadoPagoItem[]>([]);
  const [mpFecha, setMpFecha] = useState(fechaHoy);
  const [mpMonto, setMpMonto] = useState<number | ''>('');

  // 3. TRANSFERENCIAS GALICIA
  const [transferenciasList, setTransferenciasList] = useState<TransferenciaItem[]>([]);
  const [trRecibo, setTrRecibo] = useState<string>('');
  const [trFecha, setTrFecha] = useState(fechaHoy);
  const [trMonto, setTrMonto] = useState<number | ''>('');

  // Estados de interfaz y persistencia
  const [guardando, setGuardando] = useState(false);
  const [cierreExitoso, setCierreExitoso] = useState(false);
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [historialCierres, setHistorialCierres] = useState<CierreCaja[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Referencias para navegación rápida por Enter
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const mpMontoRef = useRef<HTMLInputElement | null>(null);

  // Generar recibos iniciales
  const generarRecibos = (mostrarErrores = false) => {
    const d = Number(desdeRecibo);
    const h = Number(hastaRecibo);

    if (isNaN(d) || isNaN(h) || h < d) {
      if (mostrarErrores) alert('Ingresá un rango de recibos válido.');
      return;
    }

    if (h - d > 150) {
      if (mostrarErrores) alert('El rango máximo permitido es de 150 recibos por cierre.');
      return;
    }

    const anuladosSet = new Set(
      inputAnulados
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
    );
    const efSet = new Set(
      inputEfectivo
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
    );
    const trSet = new Set(
      inputTransfer
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
    );

    const generados: ReciboItem[] = [];
    for (let num = d; num <= h; num++) {
      const numStr = String(num);
      let tipo: ReciboItem['tipo'] = 'recibo';

      if (anuladosSet.has(numStr)) {
        tipo = 'anulado';
      } else if (trSet.has(numStr)) {
        tipo = 'transferencia';
      } else if (efSet.has(numStr)) {
        tipo = 'efectivo';
      }

      // Si ya existía un monto previamente ingresado, preservarlo
      const previo = recibos.find((r) => r.numero === numStr);
      generados.push({
        numero: numStr,
        tipo,
        monto: tipo === 'anulado' ? 0 : previo?.monto || 0,
      });
    }

    setRecibos(generados);
  };

  useEffect(() => {
    if (recibos.length === 0) {
      generarRecibos();
    }
  }, []);

  if (rol === 'alumno') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-uap border border-red-100 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-uap-azul mb-2">Acceso Restringido</h2>
        <p className="text-sm text-uap-gris leading-relaxed">
          El módulo de Control y Cierre de Caja está habilitado únicamente para Secretarios y Administradores.
        </p>
      </div>
    );
  }

  // Cálculos en tiempo real
  const totalRecibosValidos = recibos
    .filter((r) => r.tipo !== 'anulado')
    .reduce((acc, cur) => acc + (Number(cur.monto) || 0), 0);

  const totalMercadoPago = mercadoPagoList.reduce(
    (acc, cur) => acc + (Number(cur.monto) || 0),
    0
  );

  const totalTransferencias = transferenciasList.reduce(
    (acc, cur) => acc + (Number(cur.monto) || 0),
    0
  );

  const recibosEfectivo = recibos.filter((recibo) => recibo.tipo === 'efectivo');
  const totalEfectivoInformado = recibosEfectivo.reduce(
    (acc, recibo) => acc + (Number(recibo.monto) || 0),
    0
  );

  const diferenciaCaja = totalRecibosValidos - totalMercadoPago;
  const totalEfectivoCalculado = Math.max(diferenciaCaja - totalTransferencias, 0);

  // Manejo de cambio de monto en recibo con navegación rápida por Enter
  const handleMontoReciboChange = (numero: string, nuevoMonto: number) => {
    setRecibos((prev) =>
      prev.map((r) => (r.numero === numero ? { ...r, monto: nuevoMonto } : r))
    );
  };

  const handleReciboKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Buscar el siguiente recibo que NO esté anulado
      for (let next = index + 1; next < recibos.length; next++) {
        if (recibos[next].tipo !== 'anulado') {
          const nextInput = inputRefs.current[recibos[next].numero];
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
            return;
          }
        }
      }
      // Último recibo: pasar a Mercado Pago, como en Facturacion.html
      mpMontoRef.current?.focus();
    }
  };

  const handleToggleTipoRecibo = (numero: string) => {
    setRecibos((prev) =>
      prev.map((r) => {
        if (r.numero !== numero) return r;
        const nuevoTipo =
          r.tipo === 'recibo'
            ? 'efectivo'
            : r.tipo === 'efectivo'
            ? 'transferencia'
            : r.tipo === 'transferencia'
            ? 'anulado'
            : 'recibo';
        return {
          ...r,
          tipo: nuevoTipo,
          monto: nuevoTipo === 'anulado' ? 0 : r.monto,
        };
      })
    );
  };

  // Cargar Mercado Pago
  const handleAgregarMP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpMonto || Number(mpMonto) <= 0) return;
    setMercadoPagoList([
      ...mercadoPagoList,
      {
        id: Math.random().toString(),
        fecha: mpFecha,
        monto: Number(mpMonto),
      },
    ]);
    setMpMonto('');
  };

  // Cargar Transferencia Galicia
  const handleAgregarTransferencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trRecibo || !trMonto || Number(trMonto) <= 0) {
      alert('Ingresá número de recibo y monto de la transferencia.');
      return;
    }

    setTransferenciasList([
      ...transferenciasList,
      {
        recibo: trRecibo.trim(),
        fecha: trFecha,
        monto: Number(trMonto),
      },
    ]);
    setTrRecibo('');
    setTrMonto('');
  };

  // Guardar Cierre de Caja
  const handleGuardarCierre = async () => {
    if (recibos.length === 0) {
      alert('No hay recibos generados para cerrar.');
      return;
    }

    const confirmacion = confirm(
      `¿Deseás guardar este cierre de caja con una diferencia de $${diferenciaCaja.toFixed(2)}?`
    );
    if (!confirmacion) return;

    setGuardando(true);

    const payload: GuardarCierreInput = {
      totalRecibos: totalRecibosValidos,
      totalML: totalMercadoPago,
      totalEfectivo: totalEfectivoCalculado,
      totalTransfer: totalTransferencias, // CORREGIDO BUG 1
      diferencia: diferenciaCaja,
      recibos,
      mercadoPago: mercadoPagoList,
      efectivo: [],
      transferencias: transferenciasList, // CORREGIDO BUG 1
    };

    const res = await guardarCierreCajaAction(payload);
    if (res.ok) {
      setCierreExitoso(true);
      setTimeout(() => setCierreExitoso(false), 5000);
      alert('✅ ¡Cierre de caja guardado exitosamente en base de datos!');
    } else {
      alert('❌ Error al guardar cierre: ' + (res.error || 'Desconocido'));
    }
    setGuardando(false);
  };

  const handleAbrirHistorial = async () => {
    setModalHistorialOpen(true);
    setCargandoHistorial(true);
    const res = await obtenerHistorialCierresAction();
    if (res.ok && res.data) {
      setHistorialCierres(res.data);
    }
    setCargandoHistorial(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Institucional (Oculto en Impresión) */}
      <div className="no-print bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-uap-azul text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-uap-azul">
              Control de Caja
            </h1>
            <p className="text-sm text-uap-gris mt-0.5">
              Balance de recibos emitidos, Mercado Pago, Banco Galicia y efectivo físico
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleAbrirHistorial}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-uap-azul text-xs font-bold rounded-xl transition-colors"
          >
            <History className="w-4 h-4" />
            <span>Historial</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-uap-azul text-xs font-bold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cierre</span>
          </button>

          <button
            onClick={handleGuardarCierre}
            disabled={guardando}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {guardando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Guardar Cierre</span>
          </button>
        </div>
      </div>

      {/* GENERADOR DE RANGO DE RECIBOS (Oculto en Impresión) */}
      <div className="no-print bg-white rounded-3xl p-6 shadow-sm border border-uap-borde space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Receipt className="w-5 h-5 text-uap-azul-medio" />
          <h2 className="text-sm font-black text-uap-azul">
            Configuración de Talonario de Recibos
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
              Desde N°
            </label>
            <input
              type="number"
              value={desdeRecibo}
              onChange={(e) => setDesdeRecibo(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
              Hasta N°
            </label>
            <input
              type="number"
              value={hastaRecibo}
              onChange={(e) => setHastaRecibo(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
              Anulados (separar con coma)
            </label>
            <input
              type="text"
              value={inputAnulados}
              onChange={(e) => setInputAnulados(e.target.value)}
              placeholder="ej: 1005, 1012"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
              Efectivo (separar con coma)
            </label>
            <input
              type="text"
              value={inputEfectivo}
              onChange={(e) => setInputEfectivo(e.target.value)}
              placeholder="ej: 1003, 1010"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
              Transferencias (separar con coma)
            </label>
            <input
              type="text"
              value={inputTransfer}
              onChange={(e) => setInputTransfer(e.target.value)}
              placeholder="ej: 1008, 1014"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => generarRecibos(true)}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-black text-white text-xs font-black uppercase rounded-xl transition-all shadow-sm"
          >
            Generar Talonario
          </button>
        </div>
      </div>

      {/* CONTENEDOR DE 4 COLUMNAS (Oculto en Impresión) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {/* ========================================================
            COLUMNA 1: RECIBOS FÍSICOS
        ======================================================== */}
        <div className="bg-white rounded-3xl p-5 shadow-uap border border-uap-borde flex flex-col max-h-[640px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-3">
              <img
                src="https://i.postimg.cc/fyMcjMcn/logo-uap.png"
                alt="Logo UAP"
                className="h-9 w-20 object-contain"
              />
              <div>
                <h3 className="text-sm font-black text-uap-azul">1. Recibos Físicos</h3>
                <p className="text-[11px] text-slate-400">Pulsá Enter para pasar al siguiente</p>
              </div>
            </div>
            <span className="text-sm font-black text-uap-azul">
              ${totalRecibosValidos.toFixed(2)}
            </span>
          </div>

          <div className="overflow-y-auto space-y-2 pr-1 flex-1">
            {recibos.map((r, idx) => (
              <div
                key={r.numero}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  r.tipo === 'anulado'
                    ? 'bg-slate-100 border-slate-200 opacity-60'
                    : r.tipo === 'transferencia'
                    ? 'bg-blue-50/80 border-blue-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-black text-xs min-w-[50px] ${
                    r.tipo === 'anulado' ? 'text-slate-400 line-through' : 'text-uap-azul'
                  }`}>
                    #{r.numero}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleTipoRecibo(r.numero)}
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border transition-colors ${
                      r.tipo === 'anulado'
                        ? 'bg-red-100 text-red-800 border-red-200 line-through'
                        : r.tipo === 'transferencia'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : r.tipo === 'efectivo'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'text-slate-400 border-transparent hover:bg-slate-100'
                    }`}
                    aria-label={`Cambiar tipo del recibo ${r.numero}`}
                    title="Cambiar tipo de recibo"
                  >
                    {r.tipo === 'recibo' ? <MoreHorizontal className="w-3.5 h-3.5" /> : r.tipo}
                  </button>
                </div>

                {r.tipo === 'anulado' ? (
                  <span className="w-28 text-right text-[10px] font-black uppercase text-red-600 line-through">
                    Anulado
                  </span>
                ) : (
                  <div className="flex items-center gap-1 w-28">
                    <span className="text-xs font-bold text-slate-400">$</span>
                    <input
                      ref={(el) => {
                        inputRefs.current[r.numero] = el;
                      }}
                      type="number"
                      step="0.01"
                      value={r.monto || ''}
                      onChange={(e) =>
                        handleMontoReciboChange(r.numero, Number(e.target.value))
                      }
                      onKeyDown={(e) => handleReciboKeyDown(e, idx)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-uap-azul"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            COLUMNA 2: MERCADO PAGO
        ======================================================== */}
        <div className="bg-white rounded-3xl p-5 shadow-uap border border-uap-borde flex flex-col max-h-[640px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-3">
              <img
                src="https://i.postimg.cc/KYZcxG53/Mercado_pago.png"
                alt="Mercado Pago"
                className="h-9 w-24 object-contain"
              />
              <div>
                <h3 className="text-sm font-black text-sky-700">2. Mercado Pago</h3>
                <p className="text-[11px] text-slate-400">Cobros por QR / App</p>
              </div>
            </div>
            <span className="text-sm font-black text-sky-700">
              ${totalMercadoPago.toFixed(2)}
            </span>
          </div>

          <form onSubmit={handleAgregarMP} className="space-y-2 mb-3 bg-sky-50/60 p-3 rounded-2xl border border-sky-100">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={mpFecha}
                onChange={(e) => setMpFecha(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Monto $"
                ref={mpMontoRef}
                value={mpMonto}
                onChange={(e) => setMpMonto(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase rounded-lg shadow-sm"
            >
              + Agregar MP
            </button>
          </form>

          <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
            {mercadoPagoList.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-extrabold text-slate-700">${m.monto.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">{m.fecha}</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMercadoPagoList(mercadoPagoList.filter((_, i) => i !== idx))
                  }
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            COLUMNA 3: TRANSFERENCIAS BANCO GALICIA
        ======================================================== */}
        <div className="bg-white rounded-3xl p-5 shadow-uap border border-uap-borde flex flex-col max-h-[640px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-3">
              <img
                src="https://i.postimg.cc/s2Kb9TDd/Galicia.png"
                alt="Banco Galicia"
                className="h-9 w-24 object-contain"
              />
              <div>
                <h3 className="text-sm font-black text-purple-700">3. Banco Galicia</h3>
                <p className="text-[11px] text-slate-400">Transferencias acreditadas</p>
              </div>
            </div>
            <span className="text-sm font-black text-purple-700">
              ${totalTransferencias.toFixed(2)}
            </span>
          </div>

          <form onSubmit={handleAgregarTransferencia} className="space-y-2 mb-3 bg-purple-50/60 p-3 rounded-2xl border border-purple-100">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="N° Recibo"
                value={trRecibo}
                onChange={(e) => setTrRecibo(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Monto $"
                value={trMonto}
                onChange={(e) => setTrMonto(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>
            <input
              type="date"
              value={trFecha}
              onChange={(e) => setTrFecha(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <button
              type="submit"
              className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase rounded-lg shadow-sm"
            >
              + Agregar Transferencia
            </button>
          </form>

          <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
            {transferenciasList.map((t, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-extrabold text-slate-700">${t.monto.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">
                    Recibo #{t.recibo} • {t.fecha}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTransferenciasList(transferenciasList.filter((_, i) => i !== idx))
                  }
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            COLUMNA 4: BALANCE Y DIFERENCIA DE CAJA
        ======================================================== */}
        <div className="bg-gradient-to-br from-uap-azul via-uap-azul-medio to-uap-azul-profundo text-white rounded-3xl p-6 shadow-2xl border border-white/20 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-white/20 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-black tracking-wide">Diferencia de Caja</h3>
            </div>

            <p className="text-xs text-white/80 leading-relaxed mb-4">
              Representa el importe que debe encontrarse en efectivo físico + transferencias bancarias en la oficina.
            </p>

            <div className="bg-black/25 rounded-2xl p-4 border border-white/10 space-y-2 mb-4">
              <div className="flex justify-between text-xs font-semibold text-white/80">
                <span>Total Recibos Válidos:</span>
                <span className="font-bold text-white">${totalRecibosValidos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-sky-200">
                <span>(-) Mercado Pago:</span>
                <span className="font-bold">-${totalMercadoPago.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between text-xs font-bold text-emerald-300">
                <span>Diferencia Neta:</span>
                <span className="text-sm font-black">${diferenciaCaja.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center py-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-200">
                Saldo Físico a Rendir
              </span>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">
                ${diferenciaCaja.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-center">
            <span className="text-[10px] text-white/60">
              Fórmula: Diferencia = Recibos Válidos - Mercado Pago
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          INFORME IMPRIMIBLE A4 OFICIAL DE CIERRE DE CAJA
      ======================================================== */}
      <div className="hidden print:block print-cash-report">
        <header className="print-cash-header">
          <img src="/img/logo-uap.png" alt="Logo UAP" />
          <div>
            <h1>INFORME DE CIERRE DE CAJA</h1>
            <p>Fecha: {fechaHoy}</p>
          </div>
          <span aria-hidden="true" />
        </header>

        <div className="print-cash-columns">
          <section className="print-cash-column">
            <header className="print-cash-column-title">
              <img src="/img/logo-uap.png" alt="" />
              <div>
                <h2>Recibos físicos</h2>
                <p>Control por numeración</p>
              </div>
            </header>
            <div>
              {recibos.map((recibo, index) => (
                <div
                  key={recibo.numero}
                  className={`print-cash-row ${recibo.tipo === 'anulado' ? 'print-cash-void' : ''}`}
                >
                  <span>#{index + 1}</span>
                  <span>{recibo.numero.padStart(6, '0')}</span>
                  <strong>${Number(recibo.monto).toFixed(2)}</strong>
                </div>
              ))}
              {recibos.length === 0 && (
                <p className="print-cash-empty">No se generaron recibos.</p>
              )}
            </div>
            <p className="print-cash-column-total">
              Total recibos válidos: <strong>${totalRecibosValidos.toFixed(2)}</strong>
            </p>
          </section>

          <section className="print-cash-column">
            <header className="print-cash-column-title print-cash-mp-title">
              <h2>Mercado Pago</h2>
            </header>
            <div>
              {mercadoPagoList.map((item, index) => (
                <div key={item.id || index} className="print-cash-row">
                  <span>#{index + 1}</span>
                  <span>{item.fecha ? item.fecha.split('-').reverse().join('/') : ''}</span>
                  <strong>${Number(item.monto).toFixed(2)}</strong>
                </div>
              ))}
              {mercadoPagoList.length === 0 && (
                <p className="print-cash-empty">No se informó Mercado Pago.</p>
              )}
            </div>
            <p className="print-cash-column-total">
              Total Mercado Pago: <strong>${totalMercadoPago.toFixed(2)}</strong>
            </p>
          </section>
        </div>

        <div className="print-cash-difference">
          <strong>DIFERENCIA FINAL</strong>
          <strong>${diferenciaCaja.toFixed(2)}</strong>
        </div>

        <section className="print-cash-section print-cash-cash-section">
          <h2>Efectivo informado</h2>
          {recibosEfectivo.length > 0 ? (
            <div>
              {recibosEfectivo.map((recibo, index) => (
                <div key={recibo.numero} className="print-cash-row">
                  <span>#{index + 1}</span>
                  <span>Recibo {recibo.numero.padStart(6, '0')}</span>
                  <strong>${Number(recibo.monto).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="print-cash-empty">No se informó efectivo.</p>
          )}
          <p className="print-cash-section-total">
            Total efectivo informado: <strong>${totalEfectivoInformado.toFixed(2)}</strong>
          </p>
        </section>

        <section className="print-cash-section print-cash-transfer-section">
          <h2>Transferencias</h2>
          {transferenciasList.length > 0 ? (
            <div>
              {transferenciasList.map((transferencia, index) => (
                <div key={`${transferencia.recibo}-${index}`} className="print-cash-row">
                  <span>#{index + 1}</span>
                  <span>
                    Recibo {transferencia.recibo} •{' '}
                    {transferencia.fecha.split('-').reverse().join('/')}
                  </span>
                  <strong>${Number(transferencia.monto).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="print-cash-empty">No se informaron transferencias.</p>
          )}
          <p className="print-cash-section-total">
            Total transferencias: <strong>${totalTransferencias.toFixed(2)}</strong>
          </p>
        </section>
      </div>

      {/* ========================================================
          MODAL HISTORIAL DE CIERRES
      ======================================================== */}
      {modalHistorialOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-uap-azul text-white flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-uap-azul">
                    Historial de Cierres de Caja
                  </h3>
                  <p className="text-xs text-slate-400">
                    Últimos 30 cierres guardados en base de datos PostgreSQL
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalHistorialOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cargandoHistorial ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-uap-azul" />
                <span className="text-xs font-bold">Cargando histórico...</span>
              </div>
            ) : historialCierres.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No hay cierres guardados previamente.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                      <th className="py-3 px-3">Fecha y Hora</th>
                      <th className="py-3 px-3 text-right">Recibos</th>
                      <th className="py-3 px-3 text-right">Mercado Pago</th>
                      <th className="py-3 px-3 text-right">Transferencias</th>
                      <th className="py-3 px-3 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historialCierres.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-uap-texto">
                          {new Date(c.fecha).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                          ${Number(c.total_recibos).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-sky-700">
                          ${Number(c.total_mercado_pago).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                          ${Number(c.total_transferencias || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-uap-azul text-sm">
                          ${Number(c.diferencia).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
