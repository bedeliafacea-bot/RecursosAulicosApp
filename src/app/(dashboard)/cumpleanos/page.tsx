'use client';

import React, { useEffect, useState } from 'react';
import { obtenerCumpleanosProximosAction, Cumpleanero } from '@/app/actions/cumpleanos';
import { Gift, Calendar, Sparkles, Cake, Loader2, RefreshCw, UserCheck } from 'lucide-react';

export default function CumpleanosPage() {
  const [cumples, setCumples] = useState<Cumpleanero[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const res = await obtenerCumpleanosProximosAction();
    if (res.ok && res.data) {
      setCumples(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const cumplenHoy = cumples.filter((c) => c.esHoy);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Gift className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-uap-azul">
              Próximos Cumpleaños de Becarios
            </h1>
            <p className="text-sm text-uap-gris mt-0.5">
              Alumnos del Plan Becuap que cumplen años en los próximos 15 días
            </p>
          </div>
        </div>

        <button
          onClick={cargar}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-uap-azul text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Banner Si Alguien Cumple Hoy */}
      {cumplenHoy.length > 0 && (
        <div className="p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl text-white shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
              🎂
            </div>
            <div>
              <div className="text-xs uppercase font-black tracking-widest text-white/80">
                ¡Festejo Especial Hoy!
              </div>
              <h3 className="text-xl md:text-2xl font-black">
                {cumplenHoy.map((c) => c.nombre).join(', ')}
              </h3>
              <p className="text-xs text-white/90 mt-0.5">
                ¡No te olvides de saludarlo en su jornada de hoy en Bedelía!
              </p>
            </div>
          </div>
          <Sparkles className="w-8 h-8 text-amber-200 hidden sm:block animate-pulse" />
        </div>
      )}

      {/* Grid Listado de Cumpleañeros */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-uap-azul-medio" />
            <h2 className="text-lg font-black text-uap-azul">Calendario de los próximos 15 días</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Total: <b>{cumples.length}</b> alumnos
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-uap-azul" />
            <span className="text-xs font-semibold">Buscando fechas de nacimiento...</span>
          </div>
        ) : cumples.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Cake className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-bold text-slate-600">No hay cumpleaños en los próximos 15 días</p>
            <p className="text-xs text-slate-400 mt-1">
              Las fechas se actualizan automáticamente según los legajos registrados en el sistema.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cumples.map((c) => (
              <div
                key={c.id}
                className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${
                  c.esHoy
                    ? 'bg-rose-50 border-rose-200 shadow-md ring-2 ring-rose-400/30'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:shadow-md'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-uap-texto">
                      {c.nombre}
                    </span>
                    {c.esHoy && (
                      <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                        Hoy
                      </span>
                    )}
                  </div>
                  {c.carrera && (
                    <p className="text-xs text-slate-500 font-medium truncate max-w-[180px]">
                      {c.carrera}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 font-mono">
                    Legajo: #{c.id}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className={`text-base font-black ${c.esHoy ? 'text-rose-600' : 'text-uap-azul'}`}>
                    {c.fechaTexto}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {c.esHoy ? '¡Festeja hoy!' : `Faltan ${c.diasFaltantes} días`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
