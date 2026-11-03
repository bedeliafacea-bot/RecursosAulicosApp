import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileSpreadsheet,
  FlaskConical,
  FolderOpen,
} from 'lucide-react';

const sharePoint = 'https://uapeduar.sharepoint.com/sites/BedeliaVirtual';

const horarios = [
  {
    cuatrimestre: '1ºC',
    carpeta: '(1º C) Horarios por carreras',
    carreras: [
      { nombre: 'TEOLOGÍA', carpeta: 'TEOLOGÍA' },
      { nombre: 'SALUD (FCS)', carpeta: 'SALUD (FCS)' },
      { nombre: 'HUMANIDADES (FHECIS)', carpeta: 'HUMANIDADES (FHECIS)' },
      { nombre: 'ECONÓMICAS (FACEA)', carpeta: 'ECONÓMICAS (FACEA)' },
    ],
    distribucion: 'DISTRIBUCIÓN DE AULAS (1ºC).xlsm',
    periodoDemo: '1c',
  },
  {
    cuatrimestre: '2ºC',
    carpeta: '(2º C) Horarios por carreras',
    carreras: [
      { nombre: 'TEOLOGÍA', carpeta: 'TEOLOGÍA' },
      { nombre: 'SALUD (FCS)', carpeta: 'SALUD' },
      { nombre: 'HUMANIDADES (FHECIS)', carpeta: 'HUMANIDADES' },
      { nombre: 'ECONÓMICAS (FACEA)', carpeta: 'ECONÓMICAS' },
    ],
    distribucion: 'DISTRIBUCIÓN DE AULAS (2ºC).xlsm',
    periodoDemo: '2c',
  },
];

function Acceso({
  href,
  children,
  icon: Icon,
  destacado = false,
}: {
  href: string;
  children: ReactNode;
  icon: LucideIcon;
  destacado?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uap-azul ${
        destacado
          ? 'border-uap-azul bg-uap-azul text-white shadow-md shadow-uap-azul/15 hover:-translate-y-0.5 hover:bg-uap-azul-oscuro hover:shadow-lg'
          : 'border-uap-borde bg-white text-uap-texto shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          destacado
            ? 'bg-white/15 text-white'
            : 'bg-blue-50 text-uap-azul group-hover:bg-blue-100'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold leading-snug">{children}</span>
      <ArrowUpRight
        className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
          destacado ? 'text-white/70' : 'text-uap-gris'
        }`}
        aria-hidden="true"
      />
    </a>
  );
}

export default function BedeliaVirtualPage() {
  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-uap-fondo px-4 py-6 sm:-m-6 sm:px-6 sm:py-8 lg:-m-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-uap-azul via-uap-azul-oscuro to-uap-azul-profundo px-6 py-7 text-white shadow-xl shadow-uap-azul/15 sm:px-9 sm:py-9">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3 bg-cover bg-center opacity-10 mix-blend-screen"
            style={{ backgroundImage: "url('/img/universidad-adventista-del-plata.jpg')" }}
            aria-hidden="true"
          />
          <div className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-blue-100">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Universidad Adventista del Plata
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Bedelia Virtual
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100/85 sm:text-base">
              Horarios de cursado y distribución de aulas por cuatrimestre y carrera.
            </p>
          </div>
        </header>

        <section aria-labelledby="horarios-cursado">
          <div className="mb-5">
            <h2 id="horarios-cursado" className="text-xl font-black tracking-tight text-uap-azul">
              Horarios de cursado
            </h2>
            <p className="mt-1 text-sm text-uap-gris">
              Seleccioná una carrera para consultar sus horarios o abrí la distribución de aulas.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {horarios.map((horario, index) => {
              const carpetaUrl = `${sharePoint}/Documentos%20compartidos/Horarios%20Cursado/${encodeURIComponent(horario.carpeta)}`;
              return (
                <section
                  key={horario.cuatrimestre}
                  aria-labelledby={`horarios-${horario.cuatrimestre}`}
                  className="overflow-hidden rounded-3xl border border-uap-borde bg-white shadow-uap"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-uap-azul text-sm font-black text-white shadow-md shadow-blue-900/15">
                        {index + 1}º
                      </span>
                      <div>
                        <h3
                          id={`horarios-${horario.cuatrimestre}`}
                          className="text-lg font-black text-uap-azul"
                        >
                          HORARIOS {horario.cuatrimestre}
                        </h3>
                        <p className="text-xs font-semibold text-uap-gris">Por carrera</p>
                      </div>
                    </div>
                    <CalendarDays className="h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" />
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {horario.carreras.map((carrera) => (
                        <Acceso
                          key={carrera.nombre}
                          href={`${carpetaUrl}/${encodeURIComponent(carrera.carpeta)}`}
                          icon={FolderOpen}
                        >
                          {carrera.nombre}
                        </Acceso>
                      ))}
                    </div>
                    <Acceso
                      href={`${sharePoint}/Documentos%20compartidos/Horarios%20Cursado/${encodeURIComponent(horario.distribucion)}?web=1`}
                      icon={FileSpreadsheet}
                      destacado
                    >
                      {horario.distribucion.replace('.xlsm', '')}
                    </Acceso>
                    <a
                      href={`/bedelia-virtual/distribucion/${horario.periodoDemo}`}
                      className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                          <FlaskConical className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-uap-texto">
                            Ver propuesta en la app
                          </span>
                          <span className="mt-0.5 block text-[11px] font-semibold text-emerald-700">
                            Prototipo · datos de ejemplo
                          </span>
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-emerald-700 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="otros-accesos">
          <div className="mb-5">
            <h2 id="otros-accesos" className="text-xl font-black tracking-tight text-uap-azul">
              Otros accesos
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Acceso
              href="https://uapeduar-my.sharepoint.com/:x:/g/personal/micaela_melo_uap_edu_ar/IQCf-bDRJCR7Q4cMnQrMcvntAbX10p7stMpSk7yRcjaIx-E?e=cg116p"
              icon={FileSpreadsheet}
            >
              Mesas julio 2026
            </Acceso>
            <Acceso
              href={`${sharePoint}/Documentos%20compartidos/Seguimiento%20de%20Prestamos.xlsx?web=1`}
              icon={FileSpreadsheet}
            >
              Prestamos y Reservas
            </Acceso>
          </div>
        </section>
      </div>
    </div>
  );
}
