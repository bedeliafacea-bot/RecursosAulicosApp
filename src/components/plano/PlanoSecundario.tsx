'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AulaPlanoSecu } from '@/lib/types/database.types';
import {
  obtenerAulasPlanoAction,
  toggleAulaEstadoAction,
  guardarEstadoPlanoAction,
} from '@/app/actions/plano';
import { Tv, Radio, Layers, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface Props {
  onClose?: () => void;
  isModal?: boolean;
}

export default function PlanoSecundario({ onClose, isModal = false }: Props) {
  const [aulas, setAulas] = useState<Record<string, AulaPlanoSecu>>({});
  const [planoActivo, setPlanoActivo] = useState<'PB' | 'PA' | 'AMBOS'>('AMBOS');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      const res = await obtenerAulasPlanoAction();
      if (res.ok && res.data) {
        const mapa: Record<string, AulaPlanoSecu> = {};
        res.data.forEach((a) => {
          mapa[a.id] = a;
        });
        setAulas(mapa);
      }
      setLoading(false);
    };

    cargarDatos();

    // Suscripción Realtime a cambios en aulas_plano_secu
    const channel = supabase
      .channel('realtime_aulas_plano_secu')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aulas_plano_secu',
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as AulaPlanoSecu;
            setAulas((prev) => ({
              ...prev,
              [updated.id]: updated,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleAula = async (aulaId: string) => {
    const actual = aulas[aulaId];
    if (!actual) return;

    const nuevoEstado = !actual.activo;

    // Optimistic UI: actualizamos en memoria inmediatamente
    setAulas((prev) => ({
      ...prev,
      [aulaId]: {
        ...prev[aulaId],
        activo: nuevoEstado,
      },
    }));

    // Sincronizamos en backend Supabase
    setIsUpdating(true);
    await toggleAulaEstadoAction(aulaId, nuevoEstado);
    setIsUpdating(false);
  };

  const totalControlesEntregados = Object.values(aulas).filter((a) => a.activo).length;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-uap-azul" />
        <span className="text-xs font-bold">Conectando con Supabase Realtime...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Controles y Selector de Plantas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setPlanoActivo('AMBOS')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                planoActivo === 'AMBOS'
                  ? 'bg-uap-azul text-white shadow-sm'
                  : 'text-slate-600 hover:text-uap-azul'
              }`}
            >
              Ambas Plantas
            </button>
            <button
              onClick={() => setPlanoActivo('PB')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                planoActivo === 'PB'
                  ? 'bg-uap-azul text-white shadow-sm'
                  : 'text-slate-600 hover:text-uap-azul'
              }`}
            >
              Planta Baja (PB)
            </button>
            <button
              onClick={() => setPlanoActivo('PA')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                planoActivo === 'PA'
                  ? 'bg-uap-azul text-white shadow-sm'
                  : 'text-slate-600 hover:text-uap-azul'
              }`}
            >
              Planta Alta (PA)
            </button>
          </div>
        </div>

        {/* Badge Realtime y Métricas */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Realtime Activo</span>
          </div>

          <div className="bg-white px-3 py-1 rounded-xl border border-slate-200 text-xs font-extrabold text-uap-azul shadow-sm">
            Controles entregados: <b className="text-emerald-600 text-sm">{totalControlesEntregados}</b>
          </div>
        </div>
      </div>

      {/* Contenedor de Planos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* ========================================================
            PLANTA BAJA
        ======================================================== */}
        {(planoActivo === 'AMBOS' || planoActivo === 'PB') && (
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-uap border border-uap-borde">
            <div className="flex items-center justify-between pb-3 border-b-2 border-uap-azul mb-4">
              <h3 className="font-black text-uap-azul text-sm tracking-wider uppercase">
                PLANTA BAJA (Secundaria)
              </h3>
              <span className="text-[11px] text-slate-400 font-bold">7 columnas × 6 filas</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {/* Fila 1 */}
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 font-bold p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                BAÑOS
              </div>
              <AulaButton aulaId="Aula 15" data={aulas['Aula 15']} onToggle={handleToggleAula} />
              <AulaButton aulaId="Aula 14" data={aulas['Aula 14']} onToggle={handleToggleAula} />
              <AulaButton aulaId="Aula 13" data={aulas['Aula 13']} onToggle={handleToggleAula} />
              <AulaButton aulaId="Aula 12" data={aulas['Aula 12']} onToggle={handleToggleAula} />
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-600 font-black p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                BEDELIA
              </div>
              <AulaButton aulaId="Aula 11" data={aulas['Aula 11']} onToggle={handleToggleAula} />

              {/* Fila 2 */}
              <AulaButton aulaId="Aula 17" data={aulas['Aula 17']} onToggle={handleToggleAula} />
              <div className="col-span-5 bg-transparent" />
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                Archivos
              </div>

              {/* Fila 3 */}
              <AulaButton aulaId="Aula 18" data={aulas['Aula 18']} onToggle={handleToggleAula} />
              <div className="col-span-5 bg-transparent" />
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                Baños
              </div>

              {/* Fila 4 */}
              <AulaButton aulaId="Aula 19" data={aulas['Aula 19']} onToggle={handleToggleAula} />
              <div className="col-span-5 bg-transparent" />
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                Baños
              </div>

              {/* Fila 5 */}
              <AulaButton
                aulaId="Aula 20"
                subtitulo="ARTES VISUALES"
                data={aulas['Aula 20']}
                onToggle={handleToggleAula}
              />
              <div className="col-span-5 bg-transparent" />
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                Biblioteca
              </div>

              {/* Fila 6 (Base) */}
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-600 font-bold p-1 min-h-[54px] rounded-lg flex flex-col items-center justify-center text-[9px] leading-tight">
                <span>Sala profesores</span>
                <small className="text-slate-400">Galicia</small>
              </div>
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-1 min-h-[54px] rounded-lg flex items-center justify-center text-[9px]">
                Hall entrada
              </div>
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-1 min-h-[54px] rounded-lg flex items-center justify-center text-[9px]">
                Bedelia sec.
              </div>
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-1 min-h-[54px] rounded-lg flex items-center justify-center text-[9px]">
                Oficinas sec.
              </div>
              <div className="col-span-2">
                <AulaButton aulaId="Aula 5" data={aulas['Aula 5']} onToggle={handleToggleAula} />
              </div>
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-1 min-h-[54px] rounded-lg flex items-center justify-center text-[9px]">
                Lab. Física
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PLANTA ALTA
        ======================================================== */}
        {(planoActivo === 'AMBOS' || planoActivo === 'PA') && (
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-uap border border-uap-borde">
            <div className="flex items-center justify-between pb-3 border-b-2 border-uap-azul mb-4">
              <h3 className="font-black text-uap-azul text-sm tracking-wider uppercase">
                PLANTA ALTA (Secundaria)
              </h3>
              <span className="text-[11px] text-slate-400 font-bold">6 columnas × 5 filas</span>
            </div>

            <div className="grid grid-cols-6 gap-1.5 text-center text-xs">
              {/* Fila 1 */}
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 font-bold p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                BAÑOS
              </div>
              <div className="col-span-2">
                <AulaButton aulaId="Aula 32" data={aulas['Aula 32']} onToggle={handleToggleAula} />
              </div>
              <div className="col-span-2">
                <AulaButton aulaId="Aula 33" data={aulas['Aula 33']} onToggle={handleToggleAula} />
              </div>
              <div className="bg-transparent" />

              {/* Fila 2 */}
              <AulaButton aulaId="Aula 30" data={aulas['Aula 30']} onToggle={handleToggleAula} />
              <div className="col-span-5 bg-transparent" />

              {/* Fila 3 */}
              <AulaButton aulaId="Aula 29" data={aulas['Aula 29']} onToggle={handleToggleAula} />
              <div className="col-span-5 bg-transparent" />

              {/* Fila 4 */}
              <AulaButton aulaId="LAB 2" data={aulas['LAB 2']} onToggle={handleToggleAula} />
              <div className="col-span-5 bg-transparent" />

              {/* Fila 5 (Base) */}
              <AulaButton aulaId="Aula 27" data={aulas['Aula 27']} onToggle={handleToggleAula} />
              <AulaButton aulaId="Aula 26" data={aulas['Aula 26']} onToggle={handleToggleAula} />
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                LAB TEC
              </div>
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                Aula tecnología
              </div>
              <div className="bg-slate-100 border border-dashed border-slate-300 text-slate-500 p-2 min-h-[54px] rounded-lg flex items-center justify-center text-[10px]">
                LAB SIS
              </div>
              <div className="bg-transparent" />
            </div>
          </div>
        )}
      </div>

      {/* Referencias y Guía de Uso */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-emerald-500 border border-emerald-600 shadow-sm" />
            <span className="font-semibold text-slate-700">Verde: Control de TV entregado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-white border border-slate-300 shadow-sm" />
            <span className="font-semibold text-slate-700">Blanco: Aula libre / Control en Bedelía</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-slate-100 border border-dashed border-slate-300" />
            <span className="font-semibold text-slate-500">Gris: Áreas fijas no interactivas</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          Tip: Hacé clic sobre cualquier aula para alternar su estado en tiempo real.
        </p>
      </div>
    </div>
  );
}

function AulaButton({
  aulaId,
  subtitulo,
  data,
  onToggle,
}: {
  aulaId: string;
  subtitulo?: string;
  data?: AulaPlanoSecu;
  onToggle: (id: string) => void;
}) {
  const activo = data?.activo ?? false;
  const tv = data?.tv;

  return (
    <button
      type="button"
      onClick={() => onToggle(aulaId)}
      className={`w-full min-h-[54px] p-1.5 rounded-lg border text-center transition-all duration-150 flex flex-col items-center justify-center relative select-none transform active:scale-95 ${
        activo
          ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
          : 'bg-white text-slate-800 border-slate-300 hover:border-uap-azul hover:shadow-md'
      }`}
    >
      <span className="font-black text-xs leading-none tracking-tight">{aulaId}</span>
      {subtitulo && (
        <span className={`text-[8px] font-bold mt-0.5 leading-none ${activo ? 'text-emerald-100' : 'text-slate-500'}`}>
          {subtitulo}
        </span>
      )}
      {tv && (
        <span
          className={`text-[8px] font-medium mt-1 leading-none truncate max-w-full px-1 py-0.5 rounded ${
            activo ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {tv}
        </span>
      )}
    </button>
  );
}
