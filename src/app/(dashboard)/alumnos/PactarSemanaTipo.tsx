'use client';

import React, { useMemo, useState } from 'react';
import { Eraser, Paintbrush, Plus, Wand2 } from 'lucide-react';
import { formatearMinutos, minutosRangosPactados, parsearHorarioRapido } from '@/lib/horas';

export type HorarioDiaPactado = { entrada1: string; salida1: string; entrada2: string; salida2: string };

// ==============================================================================
// VISTA "SEMANA TIPO + CALENDARIO" PARA PACTAR HORARIOS
// Edita la misma planilla que la vista de tabla: 1) se elige el horario habitual
// de cada día de la semana y se aplica al mes, 2) se ajustan días sueltos
// "pintándolos" en el calendario con un horario elegido.
// ==============================================================================

const HORARIOS_SUGERIDOS = ['07:30 - 11:30', '13:00 - 17:00'];

// Lunes primero, como en la planilla de Bedelía (0 = domingo)
const DIAS_SEMANA: Array<{ wd: number; nombre: string; corto: string }> = [
  { wd: 1, nombre: 'Lunes', corto: 'Lun' },
  { wd: 2, nombre: 'Martes', corto: 'Mar' },
  { wd: 3, nombre: 'Miércoles', corto: 'Mié' },
  { wd: 4, nombre: 'Jueves', corto: 'Jue' },
  { wd: 5, nombre: 'Viernes', corto: 'Vie' },
  { wd: 6, nombre: 'Sábado', corto: 'Sáb' },
  { wd: 0, nombre: 'Domingo', corto: 'Dom' },
];

// Tonos claros con texto oscuro (contraste AA); el texto del horario siempre
// está escrito en la celda, así que el color no es la única pista.
const COLORES = [
  'bg-blue-100 text-blue-900 border-blue-300',
  'bg-orange-100 text-orange-900 border-orange-300',
  'bg-emerald-100 text-emerald-900 border-emerald-300',
  'bg-violet-100 text-violet-900 border-violet-300',
  'bg-pink-100 text-pink-900 border-pink-300',
  'bg-cyan-100 text-cyan-900 border-cyan-300',
];

function rangoDe(h: HorarioDiaPactado): string {
  if (!h.entrada1 || !h.salida1) return '';
  const t1 = `${h.entrada1} - ${h.salida1}`;
  return h.entrada2 && h.salida2 ? `${t1} / ${h.entrada2} - ${h.salida2}` : t1;
}

function horarioDe(rango: string): HorarioDiaPactado {
  return parsearHorarioRapido(rango) || { entrada1: '', salida1: '', entrada2: '', salida2: '' };
}

function diaDeSemana(anio: number, mes: number, dia: number): number {
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/** Horario más repetido en cada día de la semana del mes cargado. */
function semanaTipoDesde(
  horarios: Record<number, HorarioDiaPactado>,
  anio: number,
  mes: number
): Record<number, string | null> {
  const conteo: Record<number, Record<string, number>> = {};
  for (const [diaTexto, h] of Object.entries(horarios)) {
    const rango = rangoDe(h);
    if (!rango) continue;
    const wd = diaDeSemana(anio, mes, Number(diaTexto));
    conteo[wd] = conteo[wd] || {};
    conteo[wd][rango] = (conteo[wd][rango] || 0) + 1;
  }
  const patron: Record<number, string | null> = {};
  for (const { wd } of DIAS_SEMANA) {
    const opciones = Object.entries(conteo[wd] || {}).sort((a, b) => b[1] - a[1]);
    patron[wd] = opciones[0]?.[0] ?? null;
  }
  return patron;
}

export default function PactarSemanaTipo({
  anio,
  mes,
  nombreMes,
  horarios,
  onCambiar,
}: {
  anio: number;
  mes: number;
  nombreMes: string;
  horarios: Record<number, HorarioDiaPactado>;
  onCambiar: (siguiente: Record<number, HorarioDiaPactado>) => void;
}) {
  const totalDias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  const [extras, setExtras] = useState<string[]>([]);
  const [patron, setPatron] = useState<Record<number, string | null>>(() =>
    semanaTipoDesde(horarios, anio, mes)
  );
  const [pincel, setPincel] = useState<string | null>(() => {
    const p = semanaTipoDesde(horarios, anio, mes);
    return p[1] || p[2] || HORARIOS_SUGERIDOS[0];
  });
  const [texto, setTexto] = useState('');
  const [errorTexto, setErrorTexto] = useState('');

  // Horarios disponibles: sugeridos + los que ya usa el mes + los agregados a mano
  const opciones = useMemo(() => {
    const vistos = new Set<string>();
    const lista: string[] = [];
    const sumar = (r: string) => {
      if (r && !vistos.has(r) && minutosRangosPactados(r) !== null) {
        vistos.add(r);
        lista.push(r);
      }
    };
    HORARIOS_SUGERIDOS.forEach(sumar);
    Object.values(horarios).forEach((h) => sumar(rangoDe(h)));
    Object.values(patron).forEach((r) => r && sumar(r));
    extras.forEach(sumar);
    return lista;
  }, [horarios, patron, extras]);

  const colorDe = (rango: string) => COLORES[Math.max(0, opciones.indexOf(rango)) % COLORES.length];
  const minutosDe = (rango: string) => minutosRangosPactados(rango) || 0;

  const minutosSemanaTipo = useMemo(() => {
    let total = 0;
    for (let d = 1; d <= totalDias; d++) {
      const r = patron[diaDeSemana(anio, mes, d)];
      if (r) total += minutosDe(r);
    }
    return total;
  }, [patron, anio, mes, totalDias]);

  const diasConDatos = Object.values(horarios).filter((h) => rangoDe(h)).length;

  const aplicarSemanaTipo = () => {
    if (
      diasConDatos > 0 &&
      !confirm(
        `Esto reemplaza los horarios de todo ${nombreMes} por la semana tipo. ` +
          'Después podés ajustar días sueltos en el calendario. ¿Continuar?'
      )
    ) {
      return;
    }
    const siguiente: Record<number, HorarioDiaPactado> = {};
    for (let d = 1; d <= totalDias; d++) {
      const r = patron[diaDeSemana(anio, mes, d)];
      if (r) siguiente[d] = horarioDe(r);
    }
    onCambiar(siguiente);
  };

  const pintarDia = (dia: number) => {
    const siguiente = { ...horarios };
    if (pincel) siguiente[dia] = horarioDe(pincel);
    else delete siguiente[dia];
    onCambiar(siguiente);
  };

  const agregarHorario = () => {
    const h = parsearHorarioRapido(texto);
    if (!h) {
      setErrorTexto('No entendí el horario. Probá con 8-12, 730-1130 o 8-12 / 14-16.');
      return;
    }
    const rango = rangoDe(h);
    setExtras((prev) => (prev.includes(rango) ? prev : [...prev, rango]));
    setPincel(rango);
    setTexto('');
    setErrorTexto('');
  };

  const antesDelPrimero = (diaDeSemana(anio, mes, 1) + 6) % 7;
  const celdas: Array<number | null> = [
    ...Array.from({ length: antesDelPrimero }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];
  while (celdas.length % 7) celdas.push(null);

  const pillClase = (activo: boolean, rango: string | null) =>
    `min-h-[36px] rounded-full px-3 text-xs font-extrabold transition ${
      activo
        ? rango
          ? `border-2 ${colorDe(rango)}`
          : 'border-2 border-slate-500 bg-slate-100 text-slate-800'
        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`;

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* ------------------------------------------------------------------
          PASO 1: SEMANA TIPO
      ------------------------------------------------------------------ */}
      <section className="min-w-0 flex-[1_1_320px] space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-uap-azul text-xs font-black text-white">
            1
          </span>
          <h4 className="font-black text-uap-azul">Semana tipo</h4>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Elegí el horario habitual de cada día y aplicalo a todo el mes. Los feriados se dejan libres después en el calendario.
        </p>

        <div className="space-y-2">
          {DIAS_SEMANA.map(({ wd, nombre }) => {
            const actual = patron[wd];
            return (
              <div key={wd} className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black text-uap-texto">{nombre}</span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {actual ? `${formatearMinutos(minutosDe(actual))} hs` : 'sin horario'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opciones.map((rango) => (
                    <button
                      key={rango}
                      type="button"
                      aria-pressed={actual === rango}
                      onClick={() => setPatron((p) => ({ ...p, [wd]: rango }))}
                      className={pillClase(actual === rango, rango)}
                    >
                      {rango.replace(/ - /g, '–')}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={!actual}
                    onClick={() => setPatron((p) => ({ ...p, [wd]: null }))}
                    className={pillClase(!actual, null)}
                  >
                    Libre
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5 rounded-xl bg-blue-50/70 p-3">
          <label htmlFor="pactar-horario-rapido" className="block text-xs font-black text-uap-texto">
            Agregar otro horario
          </label>
          <div className="flex gap-2">
            <input
              id="pactar-horario-rapido"
              type="text"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setErrorTexto('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregarHorario();
                }
              }}
              placeholder="Ej: 8-12 · 730-1130 · 8-12 / 14-16"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-uap-texto focus:border-uap-azul focus:outline-none focus:ring-1 focus:ring-uap-azul"
            />
            <button
              type="button"
              onClick={agregarHorario}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-uap-azul px-3 text-xs font-black text-white hover:bg-uap-azul-oscuro"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
          {errorTexto && <p className="text-xs font-bold text-red-700">{errorTexto}</p>}
          <p className="text-[11px] text-slate-500">Siempre en 24 hs. Con “/” se agrega un segundo turno.</p>
        </div>

        <button
          type="button"
          onClick={aplicarSemanaTipo}
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-uap-azul px-4 text-xs font-black uppercase tracking-wide text-white shadow-md hover:bg-uap-azul-oscuro"
        >
          <Wand2 className="h-4 w-4" />
          Aplicar a {nombreMes} · {formatearMinutos(minutosSemanaTipo)} hs
        </button>
      </section>

      {/* ------------------------------------------------------------------
          PASO 2: CALENDARIO PARA PINTAR DÍAS SUELTOS
      ------------------------------------------------------------------ */}
      <section className="min-w-0 flex-[999_1_520px] space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-uap-azul text-xs font-black text-white">
            2
          </span>
          <h4 className="font-black text-uap-azul">Ajustá días sueltos</h4>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Elegí un horario y tocá los días para pintarlos. Con <b>Libre</b> se borra el día.
        </p>

        <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-2.5">
          <span className="inline-flex items-center gap-1 pr-1 text-[11px] font-black uppercase text-slate-500">
            <Paintbrush className="h-3.5 w-3.5" />
            Pincel
          </span>
          {opciones.map((rango) => (
            <button
              key={rango}
              type="button"
              aria-pressed={pincel === rango}
              onClick={() => setPincel(rango)}
              className={`${pillClase(pincel === rango, rango)} min-h-[40px]`}
            >
              {rango.replace(/ - /g, '–')} · {formatearMinutos(minutosDe(rango))}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={pincel === null}
            onClick={() => setPincel(null)}
            className={`${pillClase(pincel === null, null)} inline-flex min-h-[40px] items-center gap-1`}
          >
            <Eraser className="h-3.5 w-3.5" />
            Libre
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {DIAS_SEMANA.map(({ wd, corto }) => (
            <div key={wd} className="py-1 text-center text-[10px] font-black uppercase text-slate-500">
              {corto}
            </div>
          ))}
          {celdas.map((dia, i) => {
            if (dia === null) return <div key={`v${i}`} className="min-h-[72px]" />;
            const h = horarios[dia];
            const rango = h ? rangoDe(h) : '';
            const incompleto =
              Boolean(h) &&
              (Boolean(h.entrada1) !== Boolean(h.salida1) || Boolean(h.entrada2) !== Boolean(h.salida2));
            const minutos = rango ? minutosRangosPactados(rango) : null;
            const invalido = incompleto || (Boolean(rango) && minutos === null);
            const finde = [0, 6].includes(diaDeSemana(anio, mes, dia));
            const clase = invalido
              ? 'border-red-300 bg-red-50 text-red-800'
              : rango
              ? colorDe(rango)
              : `border-dashed border-slate-300 ${finde ? 'bg-slate-100' : 'bg-white'} text-slate-500`;
            return (
              <button
                key={dia}
                type="button"
                onClick={() => pintarDia(dia)}
                aria-label={`${dia} de ${nombreMes}: ${invalido ? 'revisar horario' : rango || 'libre'}`}
                className={`flex min-h-[72px] flex-col items-start gap-0.5 rounded-xl border p-1.5 text-left transition hover:ring-2 hover:ring-uap-azul/40 ${clase}`}
              >
                <span className="text-xs font-black">{dia}</span>
                <span className="text-[10px] font-bold leading-tight">
                  {invalido ? 'Revisar' : rango ? rango.split(' / ').map((t) => (
                    <span key={t} className="block">{t.replace(' - ', '–')}</span>
                  )) : finde ? '' : 'Libre'}
                </span>
                {minutos ? <span className="mt-auto text-[10px] font-black">{formatearMinutos(minutos)}</span> : null}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          Para ajustar minutos de un día puntual usá la vista <b>Planilla</b>: los cambios se comparten entre las dos vistas.
        </p>
      </section>
    </div>
  );
}
