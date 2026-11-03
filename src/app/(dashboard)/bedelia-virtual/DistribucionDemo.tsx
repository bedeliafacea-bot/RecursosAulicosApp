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

interface MateriaCompartida {
  id: string;
  nombre: string;
  docentes: string[];
  carreras: string[];
}

interface Asignacion {
  id: string;
  dia: number;
  franjaInicio: number;
  franjaFin: number;
  aula: string;
  materias: MateriaCompartida[];
  observacion: string;
  inscriptos: number;
}

interface FormularioAsignacion {
  materias: MateriaCompartida[];
  observacion: string;
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
    franjaInicio: 6,
    franjaFin: 7,
    aula: 'A5',
    materias: [
      {
        id: 'demo-materia-1',
        nombre: 'Movimientos religiosos contemporáneos',
        docentes: ['Pérez, F.'],
        carreras: ['4º LC', '5º ISI (2017)', '3º LA'],
      },
    ],
    observacion: 'PARLANTE Y MICRO',
    inscriptos: 32,
  },
  {
    id: 'demo-2',
    dia: 0,
    franjaInicio: 6,
    franjaFin: 6,
    aula: 'AN 1',
    materias: [
      {
        id: 'demo-materia-2',
        nombre: 'Taller de laboratorio',
        docentes: ['Docente de ejemplo C'],
        carreras: ['2º FCS'],
      },
    ],
    observacion: '',
    inscriptos: 24,
  },
  {
    id: 'demo-3',
    dia: 0,
    franjaInicio: 8,
    franjaFin: 8,
    aula: 'A5',
    materias: [
      {
        id: 'demo-materia-3',
        nombre: 'Seminario de ejemplo',
        docentes: ['Docente de ejemplo D'],
        carreras: ['3º CP'],
      },
    ],
    observacion: '',
    inscriptos: 28,
  },
  {
    id: 'demo-4',
    dia: 1,
    franjaInicio: 1,
    franjaFin: 1,
    aula: 'AN 2',
    materias: [
      {
        id: 'demo-materia-4',
        nombre: 'Introducción a la carrera',
        docentes: ['Docente de ejemplo E'],
        carreras: ['1º AE'],
      },
    ],
    observacion: '',
    inscriptos: 56,
  },
  {
    id: 'demo-5',
    dia: 2,
    franjaInicio: 8,
    franjaFin: 8,
    aula: 'LH 2',
    materias: [
      {
        id: 'demo-materia-5',
        nombre: 'Práctica de ejemplo',
        docentes: ['Docente de ejemplo F'],
        carreras: ['2º ISI'],
      },
    ],
    observacion: '',
    inscriptos: 20,
  },
  {
    id: 'demo-6',
    dia: 3,
    franjaInicio: 9,
    franjaFin: 9,
    aula: 'A12',
    materias: [
      {
        id: 'demo-materia-6',
        nombre: 'Clase de demostración',
        docentes: ['Docente de ejemplo G'],
        carreras: ['1º FCS'],
      },
    ],
    observacion: '',
    inscriptos: 21,
  },
];

const formularioVacio: FormularioAsignacion = {
  materias: [{ id: 'materia-nueva', nombre: '', docentes: [''], carreras: [''] }],
  observacion: '',
  inscriptos: '',
};

const gruposAulas = ['Todas', 'Secundario', 'Aulas nuevas', 'Lincoln Hall'];

function seSuperponen(
  primera: Pick<Asignacion, 'franjaInicio' | 'franjaFin'>,
  segunda: Pick<Asignacion, 'franjaInicio' | 'franjaFin'>,
) {
  return primera.franjaInicio <= segunda.franjaFin && segunda.franjaInicio <= primera.franjaFin;
}

function horarioCompleto(inicio: number, fin: number) {
  const horaInicio = franjas[inicio].horario.split('–')[0].trim();
  const horaFin = franjas[fin].horario.split('–')[1].trim();
  return `${horaInicio} – ${horaFin}`;
}

function nuevaMateria(): MateriaCompartida {
  return {
    id: `materia-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nombre: '',
    docentes: [''],
    carreras: [''],
  };
}

export default function DistribucionDemo({ periodo }: { periodo: Periodo }) {
  const [diaSeleccionado, setDiaSeleccionado] = useState(0);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('Todas');
  const [asignaciones, setAsignaciones] = useState(asignacionesIniciales);
  const [celdaNueva, setCeldaNueva] = useState<{ aula: string; franjaInicio: number } | null>(null);
  const [franjaFin, setFranjaFin] = useState(0);
  const [diaFormulario, setDiaFormulario] = useState(0);
  const [aulaFormulario, setAulaFormulario] = useState('');
  const [franjaInicioFormulario, setFranjaInicioFormulario] = useState(0);
  const [asignacionEditandoId, setAsignacionEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [error, setError] = useState('');
  const asignacionEditando = asignaciones.find((item) => item.id === asignacionEditandoId) ?? null;

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
  const franjasDisponibles = aulasVisibles.reduce(
    (total, aula) =>
      total +
      franjas.filter(
        (_, franjaIndex) =>
          !asignacionesDelDia.some(
            (asignacion) =>
              asignacion.aula === aula.id &&
              franjaIndex >= asignacion.franjaInicio &&
              franjaIndex <= asignacion.franjaFin,
          ),
      ).length,
    0,
  );

  const abrirNuevaAsignacion = (aula: string, franjaInicio: number) => {
    setCeldaNueva({ aula, franjaInicio });
    setDiaFormulario(diaSeleccionado);
    setAulaFormulario(aula);
    setFranjaInicioFormulario(franjaInicio);
    setFranjaFin(franjaInicio);
    setAsignacionEditandoId(null);
    setFormulario(formularioVacio);
    setError('');
  };

  const abrirEdicionAsignacion = (asignacion: Asignacion) => {
    setCeldaNueva(null);
    setAsignacionEditandoId(asignacion.id);
    setDiaFormulario(asignacion.dia);
    setAulaFormulario(asignacion.aula);
    setFranjaInicioFormulario(asignacion.franjaInicio);
    setFranjaFin(asignacion.franjaFin);
    setFormulario({
      materias: asignacion.materias.map((materia) => ({
        ...materia,
        docentes: [...materia.docentes],
        carreras: [...materia.carreras],
      })),
      observacion: asignacion.observacion,
      inscriptos: String(asignacion.inscriptos),
    });
    setError('');
  };

  const actualizarMateria = (materiaId: string, cambios: Partial<MateriaCompartida>) => {
    setFormulario((actual) => ({
      ...actual,
      materias: actual.materias.map((materia) =>
        materia.id === materiaId ? { ...materia, ...cambios } : materia,
      ),
    }));
  };

  const guardarAsignacion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!celdaNueva && !asignacionEditandoId) return;

    const aula = aulas.find((item) => item.id === aulaFormulario);
    const inscriptos = Number(formulario.inscriptos);

    if (!aula) {
      setError('Seleccioná un aula válida.');
      return;
    }

    if (franjaFin < franjaInicioFormulario || franjas[franjaFin].turno !== franjas[franjaInicioFormulario].turno) {
      setError('La hora de fin debe ser posterior y pertenecer al mismo turno.');
      return;
    }

    if (!Number.isInteger(inscriptos) || inscriptos < 1) {
      setError('Indicá una cantidad válida de estudiantes.');
      return;
    }

    if (inscriptos > aula.capacidad) {
      setError(`El aula ${aulaFormulario} tiene capacidad para ${aula.capacidad} personas.`);
      return;
    }

    const materias = formulario.materias.map((materia) => ({
      ...materia,
      nombre: materia.nombre.trim(),
      docentes: materia.docentes.map((docente) => docente.trim()),
      carreras: materia.carreras.map((carrera) => carrera.trim()),
    }));
    if (
      !materias.length ||
      materias.some(
        (materia) =>
          !materia.nombre ||
          !materia.docentes.length ||
          materia.docentes.some((docente) => !docente) ||
          !materia.carreras.length ||
          materia.carreras.some((carrera) => !carrera),
      )
    ) {
      setError('Cada materia debe tener nombre, al menos un docente y una carrera.');
      return;
    }

    const docentesNormalizados = materias.flatMap((materia) =>
      materia.docentes.map((docente) => docente.toLocaleLowerCase()),
    );
    const carrerasNormalizadas = materias.flatMap((materia) =>
      materia.carreras.map((carrera) => carrera.toLocaleLowerCase()),
    );
    const nuevaFranja = { franjaInicio: franjaInicioFormulario, franjaFin };
    const asignacionesEnConflicto = asignaciones.filter(
      (item) =>
        item.id !== asignacionEditandoId &&
        item.dia === diaFormulario &&
        seSuperponen(item, nuevaFranja),
    );

    if (asignacionesEnConflicto.some((item) => item.aula === aulaFormulario)) {
      setError('Esa aula ya tiene una clase asignada en parte de ese horario.');
      return;
    }

    const docenteOcupado = asignacionesEnConflicto.some((item) =>
      item.materias.some((materia) =>
        materia.docentes.some((docente) => docentesNormalizados.includes(docente.trim().toLocaleLowerCase())),
      ),
    );
    if (docenteOcupado) {
      setError('Uno de los docentes ya tiene una clase asignada en parte de ese horario.');
      return;
    }

    const carreraOcupada = asignacionesEnConflicto.some(
      (item) =>
        item.materias.some((materia) =>
          materia.carreras.some((carrera) => carrerasNormalizadas.includes(carrera.trim().toLocaleLowerCase())),
        ),
    );
    if (carreraOcupada) {
      setError('Una de las carreras o cursos ya tiene una clase asignada en parte de ese horario.');
      return;
    }

    const guardada: Asignacion = {
      id: asignacionEditandoId ?? `demo-${Date.now()}`,
      dia: diaFormulario,
      franjaInicio: franjaInicioFormulario,
      franjaFin,
      aula: aulaFormulario,
      materias,
      observacion: formulario.observacion.trim(),
      inscriptos,
    };

    setAsignaciones((actuales) =>
      asignacionEditandoId
        ? actuales.map((item) => (item.id === asignacionEditandoId ? guardada : item))
        : [...actuales, guardada],
    );
    setDiaSeleccionado(diaFormulario);
    setCeldaNueva(null);
    setAsignacionEditandoId(null);
  };

  const cerrarDialogo = () => {
    setCeldaNueva(null);
    setAsignacionEditandoId(null);
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
                    setAsignacionEditandoId(null);
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
                          franjaIndex >= item.franjaInicio &&
                          franjaIndex <= item.franjaFin &&
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
                              onClick={() => abrirEdicionAsignacion(asignacion)}
                              className="flex min-h-[82px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-center transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-uap-azul"
                              aria-label={`${asignacion.materias.map((materia) => materia.nombre).join(', ')}, aula ${aula.id}, editar`}
                            >
                              {asignacion.materias.map((materia) => (
                                <span key={materia.id} className="block w-full leading-tight">
                                  <span className="block text-[11px] font-extrabold text-slate-950">
                                    {materia.nombre}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] font-medium text-slate-700">
                                    ({materia.docentes.join(' / ')})
                                  </span>
                                  <span className="mt-0.5 block text-[10px] font-extrabold text-slate-950">
                                    {materia.carreras.join(', ')}
                                  </span>
                                </span>
                              ))}
                              {asignacion.observacion && (
                                <span className="mt-0.5 block w-full text-[10px] font-black uppercase leading-tight text-red-600">
                                  {asignacion.observacion}
                                </span>
                              )}
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

      {(celdaNueva || asignacionEditando) && (
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
            className="my-auto w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-uap-azul-medio">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                  Solo para esta demo
                </span>
                <h2 id="dialogo-aula-titulo" className="mt-1 text-xl font-black text-uap-azul">
                  {celdaNueva ? 'Agregar clase' : 'Editar distribución'}
                </h2>
                <p className="mt-1 text-sm text-uap-gris">
                  Completá la información que se mostrará en la grilla.
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

            <form onSubmit={guardarAsignacion} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <fieldset className="rounded-2xl border border-uap-borde p-4">
                <legend className="px-1 text-xs font-bold text-uap-texto">Día, aula y horario</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-uap-gris">Día</span>
                    <select
                      value={diaFormulario}
                      onChange={(event) => setDiaFormulario(Number(event.target.value))}
                      className="min-h-11 w-full rounded-xl border border-uap-borde bg-white px-3 text-sm font-bold text-uap-texto outline-none focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                    >
                      {dias.map((dia, index) => <option key={dia} value={index}>{dia}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-uap-gris">Aula</span>
                    <select
                      value={aulaFormulario}
                      onChange={(event) => setAulaFormulario(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-uap-borde bg-white px-3 text-sm font-bold text-uap-texto outline-none focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                    >
                      {aulas.map((aula) => (
                        <option key={aula.id} value={aula.id}>{aula.id} · {aula.capacidad} pers.</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-uap-gris">Desde</span>
                    <select
                      value={franjaInicioFormulario}
                      onChange={(event) => {
                        const inicio = Number(event.target.value);
                        setFranjaInicioFormulario(inicio);
                        if (franjaFin < inicio || franjas[franjaFin].turno !== franjas[inicio].turno) {
                          setFranjaFin(inicio);
                        }
                      }}
                      className="min-h-11 w-full rounded-xl border border-uap-borde bg-white px-3 text-sm font-bold text-uap-texto outline-none focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                    >
                      {franjas.map((franja, index) => (
                        <option key={index} value={index}>{franja.numero} hora · {franja.horario.split('–')[0].trim()}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-uap-gris">Hasta</span>
                    <select
                      value={franjaFin}
                      onChange={(event) => setFranjaFin(Number(event.target.value))}
                      className="min-h-11 w-full rounded-xl border border-uap-borde bg-white px-3 text-sm font-bold text-uap-texto outline-none focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                    >
                      {franjas.map((franja, index) => {
                        if (
                          index < franjaInicioFormulario ||
                          franja.turno !== franjas[franjaInicioFormulario].turno
                        ) return null;
                        return (
                          <option key={index} value={index}>{franja.numero} hora · {franja.horario.split('–')[1].trim()}</option>
                        );
                      })}
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-[11px] text-uap-gris">
                  Duración: {franjaFin - franjaInicioFormulario + 1} {franjaFin === franjaInicioFormulario ? 'hora' : 'horas'} · {horarioCompleto(franjaInicioFormulario, franjaFin)}
                </p>
              </fieldset>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-uap-texto">Materias, docentes y carreras</h3>
                  <button
                    type="button"
                    onClick={() => setFormulario((actual) => ({ ...actual, materias: [...actual.materias, nuevaMateria()] }))}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-uap-azul transition-colors hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Agregar otra materia
                  </button>
                </div>

                {formulario.materias.map((materia, materiaIndex) => (
                  <fieldset key={materia.id} className="space-y-3 rounded-2xl border border-uap-borde bg-slate-50/60 p-4">
                    <legend className="px-1 text-xs font-extrabold text-uap-azul">Materia {materiaIndex + 1}</legend>
                    <div className="flex items-start gap-2">
                      <label className="block min-w-0 flex-1">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-uap-gris">Materia</span>
                        <input
                          required
                          autoFocus={materiaIndex === 0 && Boolean(celdaNueva)}
                          aria-label={`Materia ${materiaIndex + 1}`}
                          value={materia.nombre}
                          onChange={(event) => actualizarMateria(materia.id, { nombre: event.target.value })}
                          className="min-h-11 w-full rounded-xl border border-uap-borde bg-white px-3 text-sm text-uap-texto outline-none focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                          placeholder="Nombre de la materia"
                        />
                      </label>
                      {formulario.materias.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Quitar materia ${materiaIndex + 1}`}
                          onClick={() => setFormulario((actual) => ({
                            ...actual,
                            materias: actual.materias.filter((item) => item.id !== materia.id),
                          }))}
                          className="mt-5 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <fieldset className="space-y-2">
                        <legend className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-uap-gris">
                          Docentes
                        </legend>
                        {materia.docentes.map((docente, docenteIndex) => (
                          <div key={docenteIndex} className="flex items-center gap-2">
                            <input
                              required
                              aria-label={`Materia ${materiaIndex + 1}, docente ${docenteIndex + 1}`}
                              value={docente}
                              onChange={(event) => {
                                const docentes = [...materia.docentes];
                                docentes[docenteIndex] = event.target.value;
                                actualizarMateria(materia.id, { docentes });
                              }}
                              className="min-h-10 min-w-0 flex-1 rounded-lg border border-uap-borde bg-white px-3 text-sm text-uap-texto outline-none focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                              placeholder="Apellido, inicial"
                            />
                            {materia.docentes.length > 1 && (
                              <button
                                type="button"
                                aria-label={`Quitar docente ${docenteIndex + 1} de materia ${materiaIndex + 1}`}
                                onClick={() => actualizarMateria(materia.id, {
                                  docentes: materia.docentes.filter((_, index) => index !== docenteIndex),
                                })}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => actualizarMateria(materia.id, { docentes: [...materia.docentes, ''] })}
                          className="inline-flex min-h-8 items-center gap-1 text-xs font-bold text-uap-azul hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Agregar docente
                        </button>
                      </fieldset>

                      <fieldset className="space-y-2">
                        <legend className="mb-1 text-[10px] font-bold uppercase tracking-wide text-uap-gris">Carreras / años que comparten</legend>
                        {materia.carreras.map((carrera, carreraIndex) => (
                          <div key={carreraIndex} className="flex items-center gap-2">
                            <input
                              required
                              aria-label={`Materia ${materiaIndex + 1}, carrera ${carreraIndex + 1}`}
                              value={carrera}
                              onChange={(event) => {
                                const carreras = [...materia.carreras];
                                carreras[carreraIndex] = event.target.value;
                                actualizarMateria(materia.id, { carreras });
                              }}
                              className="min-h-10 min-w-0 flex-1 rounded-lg border border-uap-borde bg-white px-3 text-sm text-uap-texto outline-none focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                              placeholder="Ej.: 2º AE"
                            />
                            {materia.carreras.length > 1 && (
                              <button
                                type="button"
                                aria-label={`Quitar carrera ${carreraIndex + 1} de materia ${materiaIndex + 1}`}
                                onClick={() => actualizarMateria(materia.id, {
                                  carreras: materia.carreras.filter((_, index) => index !== carreraIndex),
                                })}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => actualizarMateria(materia.id, { carreras: [...materia.carreras, ''] })}
                          className="inline-flex min-h-8 items-center gap-1 text-xs font-bold text-uap-azul hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Agregar carrera / año
                        </button>
                      </fieldset>
                    </div>
                  </fieldset>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder={`Capacidad del aula: ${aulas.find((aula) => aula.id === aulaFormulario)?.capacidad}`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-uap-texto">Observaciones</span>
                  <textarea
                    rows={2}
                    value={formulario.observacion}
                    onChange={(event) => setFormulario({ ...formulario, observacion: event.target.value })}
                    className="w-full rounded-xl border border-uap-borde px-3 py-2 text-sm text-uap-texto outline-none transition focus:border-uap-azul focus:ring-2 focus:ring-blue-100"
                    placeholder="Ej.: PARLANTE Y MICRO"
                  />
                  <span className="mt-1 block text-[10px] font-semibold text-red-600">
                    La observación se mostrará en rojo en la grilla.
                  </span>
                </label>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {asignacionEditandoId && (
                  <button
                    type="button"
                    onClick={() => {
                      setAsignaciones((actuales) => actuales.filter((item) => item.id !== asignacionEditandoId));
                      cerrarDialogo();
                    }}
                    className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
                  >
                    Quitar de la demo
                  </button>
                )}
                <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
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
                    {asignacionEditandoId ? 'Guardar cambios' : 'Agregar a la demo'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
