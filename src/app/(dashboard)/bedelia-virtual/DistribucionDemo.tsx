'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  DoorOpen,
  FlaskConical,
  Plus,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';

type Periodo = '1c' | '2c';

interface Aula {
  id: string;
  capacidad: number;
  edificio: string;
}

interface Asignacion {
  id: string;
  dia: number;
  franja: number;
  aula: string;
  materia: string;
  carrera: string;
  docente: string;
  inscriptos: number;
}

interface FormularioAsignacion {
  materia: string;
  carrera: string;
  docente: string;
  inscriptos: string;
}

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const franjas = [
  { numero: '1º', horario: '07:30 – 08:30', turno: 'Mañana' },
  { numero: '2º', horario: '08:30 – 09:30', turno: 'Mañana' },
  { numero: '3º', horario: '09:30 – 10:30', turno: 'Mañana' },
  { numero: '4º', horario: '10:30 – 11:30', turno: 'Mañana' },
  { numero: '5º', horario: '11:30 – 12:30', turno: 'Mañana' },
  { numero: '6º', horario: '12:30 – 13:30', turno: 'Mañana' },
  { numero: '1º', horario: '13:30 – 14:30', turno: 'Tarde' },
  { numero: '2º', horario: '14:30 – 15:30', turno: 'Tarde' },
  { numero: '3º', horario: '15:30 – 16:30', turno: 'Tarde' },
  { numero: '4º', horario: '16:30 – 17:30', turno: 'Tarde' },
  { numero: '5º', horario: '17:30 – 18:30', turno: 'Tarde' },
  { numero: '6º', horario: '18:30 – 19:30', turno: 'Tarde' },
  { numero: '7º', horario: '19:30 – 20:30', turno: 'Tarde' },
  { numero: '8º', horario: '20:30 – 21:30', turno: 'Tarde' },
];

const aulas: Aula[] = [
  { id: 'A5', capacidad: 65, edificio: 'Secundario' },
  { id: 'A11', capacidad: 18, edificio: 'Secundario' },
  { id: 'A12', capacidad: 25, edificio: 'Secundario' },
  { id: 'A13', capacidad: 25, edificio: 'Secundario' },
  { id: 'AN 1', capacidad: 45, edificio: 'Aulas nuevas' },
  { id: 'AN 2', capacidad: 85, edificio: 'Aulas nuevas' },
  { id: 'AN 3', capacidad: 40, edificio: 'Aulas nuevas' },
  { id: 'LH 2', capacidad: 25, edificio: 'Lincoln Hall' },
];

const asignacionesIniciales: Asignacion[] = [
  {
    id: 'demo-1',
    dia: 0,
    franja: 6,
    aula: 'A5',
    materia: 'Materia de ejemplo',
    carrera: '1º ISI',
    docente: 'Docente de ejemplo A',
    inscriptos: 32,
  },
  {
    id: 'demo-2',
    dia: 0,
    franja: 6,
    aula: 'AN 1',
    materia: 'Taller de laboratorio',
    carrera: '2º FCS',
    docente: 'Docente de ejemplo B',
    inscriptos: 24,
  },
  {
    id: 'demo-3',
    dia: 0,
    franja: 7,
    aula: 'A5',
    materia: 'Seminario de ejemplo',
    carrera: '3º CP',
    docente: 'Docente de ejemplo C',
    inscriptos: 28,
  },
  {
    id: 'demo-4',
    dia: 1,
    franja: 1,
    aula: 'AN 2',
    materia: 'Introducción a la carrera',
    carrera: '1º AE',
    docente: 'Docente de ejemplo D',
    inscriptos: 56,
  },
  {
    id: 'demo-5',
    dia: 2,
    franja: 8,
    aula: 'LH 2',
    materia: 'Práctica de ejemplo',
    carrera: '2º ISI',
    docente: 'Docente de ejemplo E',
    inscriptos: 20,
  },
  {
    id: 'demo-6',
    dia: 3,
    franja: 9,
    aula: 'A12',
    materia: 'Clase de demostración',
    carrera: '1º FCS',
    docente: 'Docente de ejemplo F',
    inscriptos: 21,
  },
];

const formularioVacio: FormularioAsignacion = {
  materia: '',
  carrera: '',
  docente: '',
  inscriptos: '',
};

const gruposAulas = ['Todas', 'Secundario', 'Aulas nuevas', 'Lincoln Hall'];

export default function DistribucionDemo({ periodo }: { periodo: Periodo }) {
  const [diaSeleccionado, setDiaSeleccionado] = useState(0);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('Todas');
  const [asignaciones, setAsignaciones] = useState(asignacionesIniciales);
  const [celdaNueva, setCeldaNueva] = useState<{ aula: string; franja: number } | null>(null);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<Asignacion | null>(null);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [error, setError] = useState('');

  const periodoTexto = periodo === '1c' ? '1º cuatrimestre' : '2º cuatrimestre';
  const periodoEtiqueta = periodo === '1c' ? '1ºC' : '2ºC';

  const aulasVisibles = useMemo(
    () =>
      grupoSeleccionado === 'Todas'
        ? aulas
        : aulas.filter((aula) => aula.edificio === grupoSeleccionado),
    [grupoSeleccionado],
  );

  const asignacionesDelDia = asignaciones.filter(
    (asignacion) => asignacion.dia === diaSeleccionado,
  );
  const aulasOcupadas = new Set(asignacionesDelDia.map((asignacion) => asignacion.aula)).size;
  const franjasDisponibles =
    aulasVisibles.length * franjas.length -
    asignacionesDelDia.filter((asignacion) =>
      aulasVisibles.some((aula) => aula.id === asignacion.aula),
    ).length;

  const abrirNuevaAsignacion = (aula: string, franja: number) => {
    setCeldaNueva({ aula, franja });
    setAsignacionSeleccionada(null);
    setFormulario(formularioVacio);
    setError('');
  };

  const guardarAsignacion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!celdaNueva) return;

    const aula = aulas.find((item) => item.id === celdaNueva.aula);
    const inscriptos = Number(formulario.inscriptos);

    if (inscriptos > (aula?.capacidad ?? 0)) {
      setError(`El aula ${celdaNueva.aula} tiene capacidad para ${aula?.capacidad} personas.`);
      return;
    }

    const docenteOcupado = asignaciones.some(
      (item) =>
        item.dia === diaSeleccionado &&
        item.franja === celdaNueva.franja &&
        item.docente.trim().toLocaleLowerCase() === formulario.docente.trim().toLocaleLowerCase(),
    );
    if (docenteOcupado) {
      setError('Ese docente ya tiene una clase asignada en esta franja.');
      return;
    }

    const carreraOcupada = asignaciones.some(
      (item) =>
        item.dia === diaSeleccionado &&
        item.franja === celdaNueva.franja &&
        item.carrera.trim().toLocaleLowerCase() === formulario.carrera.trim().toLocaleLowerCase(),
    );
    if (carreraOcupada) {
      setError('Esa carrera o curso ya tiene una clase asignada en esta franja.');
      return;
    }

    setAsignaciones((actuales) => [
      ...actuales,
      {
        id: `demo-${Date.now()}`,
        dia: diaSeleccionado,
        franja: celdaNueva.franja,
        aula: celdaNueva.aula,
        materia: formulario.materia.trim(),
        carrera: formulario.carrera.trim(),
        docente: formulario.docente.trim(),
        inscriptos,
      },
    ]);
    setCeldaNueva(null);
  };

  const cerrarDialogo = () => {
    setCeldaNueva(null);
    setAsignacionSeleccionada(null);
    setError('');
  };

  const reiniciarDemo = () => {
    setAsignaciones(asignacionesIniciales);
    setDiaSeleccionado(0);
    setGrupoSeleccionado('Todas');
    cerrarDialogo();
  };

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-uap-fondo px-4 py-6 sm:-m-6 sm:px-6 sm:py-8 lg:-m-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Link
          href="/bedelia-virtual"
          className="inline-flex items-center gap-2 text-sm font-bold text-uap-azul transition-colors hover:text-uap-azul-medio"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a Bedelia Virtual
        </Link>

        <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-uap-azul via-uap-azul-oscuro to-uap-azul-profundo px-6 py-7 text-white shadow-xl shadow-uap-azul/15 sm:px-9 sm:py-8">
          <div className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-300/15 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-100">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                Prototipo de demostración
              </span>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Distribución de aulas · {periodoEtiqueta}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100/85">
                Vista de prueba inspirada en la planilla oficial. Los cambios son temporales y no modifican SharePoint.
              </p>
            </div>
            <button
              type="button"
              onClick={reiniciarDemo}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reiniciar demo
            </button>
          </div>
        </header>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <p>
            <strong>Datos ficticios para mostrar la propuesta.</strong> Esta pantalla todavía no guarda información en la base de datos ni reemplaza la distribución oficial.
          </p>
        </div>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen del día">
          <div className="flex items-center gap-3 rounded-2xl border border-uap-borde bg-white p-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-uap-azul">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-2xl font-black text-uap-azul">{asignacionesDelDia.length}</span>
              <span className="text-xs font-semibold text-uap-gris">Clases ubicadas hoy</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-uap-borde bg-white p-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <DoorOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-2xl font-black text-uap-azul">{aulasOcupadas}</span>
              <span className="text-xs font-semibold text-uap-gris">Aulas ocupadas hoy</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-uap-borde bg-white p-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-2xl font-black text-uap-azul">{franjasDisponibles}</span>
              <span className="text-xs font-semibold text-uap-gris">Franjas libres visibles</span>
            </span>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-uap-borde bg-white shadow-uap">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-uap-azul">Disponibilidad por aula</h2>
                <p className="mt-1 text-sm text-uap-gris">
                  {periodoTexto} · Seleccioná un día y tocá una franja libre para agregar una clase.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Filtrar por edificio">
                {gruposAulas.map((grupo) => (
                  <button
                    key={grupo}
                    type="button"
                    onClick={() => setGrupoSeleccionado(grupo)}
                    aria-pressed={grupoSeleccionado === grupo}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uap-azul ${
                      grupoSeleccionado === grupo
                        ? 'border-uap-azul bg-uap-azul text-white'
                        : 'border-uap-borde bg-white text-uap-texto hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {grupo}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Día de cursado">
              {dias.map((dia, index) => (
                <button
                  key={dia}
                  type="button"
                  role="tab"
                  id={`dia-tab-${index}`}
                  aria-selected={diaSeleccionado === index}
                  aria-controls="matriz-aulas"
                  onClick={() => {
                    setDiaSeleccionado(index);
                    setAsignacionSeleccionada(null);
                  }}
                  className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uap-azul ${
                    diaSeleccionado === index
                      ? 'bg-blue-50 text-uap-azul ring-1 ring-inset ring-blue-200'
                      : 'text-uap-gris hover:bg-slate-50 hover:text-uap-azul'
                  }`}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-semibold text-uap-gris sm:px-6">
            <span className="font-extrabold uppercase tracking-wide text-uap-texto">Referencias</span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-200" />
              Disponible
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-blue-100 ring-1 ring-blue-200" />
              Clase asignada
            </span>
          </div>

          <div
            id="matriz-aulas"
            role="tabpanel"
            aria-labelledby={`dia-tab-${diaSeleccionado}`}
            className="max-h-[70vh] overflow-auto"
          >
            <table className="w-full min-w-[1050px] border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 min-w-40 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wide text-uap-gris">
                    Hora / turno
                  </th>
                  {aulasVisibles.map((aula) => (
                    <th
                      key={aula.id}
                      className="min-w-36 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 text-center last:border-r-0"
                    >
                      <span className="block text-sm font-black text-uap-azul">{aula.id}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-uap-gris">
                        {aula.edificio} · {aula.capacidad} pers.
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {franjas.map((franja, franjaIndex) => (
                  <tr
                    key={`${franja.turno}-${franjaIndex}`}
                    className={franjaIndex === 6 ? 'border-t-2 border-t-blue-200' : ''}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 border-b border-r border-slate-200 px-4 py-2 ${
                        franjaIndex === 6 ? 'border-t-2 border-t-blue-200' : ''
                      } ${franja.turno === 'Tarde' ? 'bg-blue-50/90' : 'bg-white'}`}
                    >
                      <span className="block text-xs font-black text-uap-azul">
                        {franja.numero} hora
                      </span>
                      <span className="mt-0.5 block whitespace-nowrap text-[10px] font-semibold text-uap-gris">
                        {franja.horario}
                      </span>
                    </th>
                    {aulasVisibles.map((aula) => {
                      const asignacion = asignaciones.find(
                        (item) =>
                          item.dia === diaSeleccionado &&
                          item.franja === franjaIndex &&
                          item.aula === aula.id,
                      );
                      return (
                        <td
                          key={aula.id}
                          className={`border-b border-r border-slate-100 p-1.5 last:border-r-0 ${
                            franjaIndex === 6 ? 'border-t-2 border-t-blue-200' : ''
                          }`}
                        >
                          {asignacion ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAsignacionSeleccionada(asignacion);
                                setCeldaNueva(null);
                              }}
                              className="flex min-h-[64px] w-full flex-col items-start justify-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-uap-azul"
                              aria-label={`${asignacion.materia}, ${asignacion.carrera}, aula ${aula.id}. Ver detalles`}
                            >
                              <span className="line-clamp-2 text-[11px] font-extrabold leading-tight text-uap-azul">
                                {asignacion.materia}
                              </span>
                              <span className="mt-1 text-[10px] font-semibold text-blue-800">
                                {asignacion.carrera}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => abrirNuevaAsignacion(aula.id, franjaIndex)}
                              className="group flex min-h-[64px] w-full items-center justify-center rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600"
                              aria-label={`Agregar una clase ${franja.numero} hora, ${franja.horario}, aula ${aula.id}`}
                            >
                              <Plus className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-uap-gris sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>Deslizá la grilla horizontalmente para ver todas las aulas.</span>
            <span>{aulasVisibles.length} aulas · {dias[diaSeleccionado]}</span>
          </div>
        </section>
      </div>

      {(celdaNueva || asignacionSeleccionada) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cerrarDialogo();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogo-aula-titulo"
            className="my-auto w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-uap-azul-medio">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                  Solo para esta demo
                </span>
                <h2 id="dialogo-aula-titulo" className="mt-1 text-xl font-black text-uap-azul">
                  {celdaNueva ? 'Agregar clase' : asignacionSeleccionada?.materia}
                </h2>
                <p className="mt-1 text-sm text-uap-gris">
                  {celdaNueva
                    ? `${dias[diaSeleccionado]} · ${franjas[celdaNueva.franja].horario} · Aula ${celdaNueva.aula}`
                    : `${dias[asignacionSeleccionada?.dia ?? 0]} · ${franjas[asignacionSeleccionada?.franja ?? 0].horario} · Aula ${asignacionSeleccionada?.aula}`}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarDialogo}
                aria-label="Cerrar"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-uap-azul"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {celdaNueva && (
              <form onSubmit={guardarAsignacion} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-uap-texto">Materia</span>
                  <input
                    required
                    autoFocus
                    value={formulario.materia}
                    onChange={(event) => setFormulario({ ...formulario, materia: event.target.value })}
                    className="min-h-11 w-full rounded-xl border border-uap-borde px-3 text-sm text-uap-texto outline-none transition focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                    placeholder="Ej.: Materia de ejemplo"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-uap-texto">Carrera / curso</span>
                    <input
                      required
                      value={formulario.carrera}
                      onChange={(event) => setFormulario({ ...formulario, carrera: event.target.value })}
                      className="min-h-11 w-full rounded-xl border border-uap-borde px-3 text-sm text-uap-texto outline-none transition focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                      placeholder="Ej.: 1º ISI"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-uap-texto">Docente</span>
                    <input
                      required
                      value={formulario.docente}
                      onChange={(event) => setFormulario({ ...formulario, docente: event.target.value })}
                      className="min-h-11 w-full rounded-xl border border-uap-borde px-3 text-sm text-uap-texto outline-none transition focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                      placeholder="Nombre del docente"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-uap-texto">
                    <Users className="h-3.5 w-3.5 text-uap-gris" aria-hidden="true" />
                    Cantidad de estudiantes
                  </span>
                  <input
                    required
                    type="number"
                    min="1"
                    max="300"
                    value={formulario.inscriptos}
                    onChange={(event) => setFormulario({ ...formulario, inscriptos: event.target.value })}
                    className="min-h-11 w-full rounded-xl border border-uap-borde px-3 text-sm text-uap-texto outline-none transition focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                    placeholder={`Capacidad del aula: ${aulas.find((aula) => aula.id === celdaNueva.aula)?.capacidad}`}
                  />
                </label>
                {error && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
                    {error}
                  </p>
                )}
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cerrarDialogo}
                    className="min-h-11 rounded-xl border border-uap-borde px-4 text-sm font-bold text-uap-texto transition-colors hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-uap-azul px-4 text-sm font-bold text-white transition-colors hover:bg-uap-azul-oscuro"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Agregar a la demo
                  </button>
                </div>
              </form>
            )}

            {asignacionSeleccionada && (
              <div className="space-y-4">
                <dl className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-uap-gris">Carrera / curso</dt>
                    <dd className="mt-1 font-extrabold text-uap-texto">{asignacionSeleccionada.carrera}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-uap-gris">Docente</dt>
                    <dd className="mt-1 font-extrabold text-uap-texto">{asignacionSeleccionada.docente}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-uap-gris">Horario</dt>
                    <dd className="mt-1 font-extrabold text-uap-texto">{franjas[asignacionSeleccionada.franja].horario}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-uap-gris">Inscriptos</dt>
                    <dd className="mt-1 font-extrabold text-uap-texto">{asignacionSeleccionada.inscriptos} estudiantes</dd>
                  </div>
                </dl>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setAsignaciones((actuales) =>
                        actuales.filter((item) => item.id !== asignacionSeleccionada.id),
                      );
                      cerrarDialogo();
                    }}
                    className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
                  >
                    Quitar de la demo
                  </button>
                  <button
                    type="button"
                    onClick={cerrarDialogo}
                    className="min-h-11 rounded-xl bg-uap-azul px-4 text-sm font-bold text-white transition-colors hover:bg-uap-azul-oscuro"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
