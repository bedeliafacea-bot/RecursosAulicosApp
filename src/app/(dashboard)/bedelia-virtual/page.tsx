import {
  CalendarDays,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  QrCode,
  TableProperties,
  Workflow,
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
  },
];

function Acceso({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: typeof FileSpreadsheet;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-11 items-center gap-3 rounded-[3px] border border-[#0078d4] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#323130] transition-colors hover:bg-[#f3f9fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0078d4]"
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-[#605e5c]" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
      <ExternalLink
        className="h-3.5 w-3.5 shrink-0 text-[#8a8886] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      />
    </a>
  );
}

export default function BedeliaVirtualPage() {
  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-white px-4 py-8 text-[#323130] sm:-m-6 sm:px-6 sm:py-10 lg:-m-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-9 text-3xl font-semibold tracking-tight text-[#323130]">
          Bedelia Virtual
        </h1>

        <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
          {horarios.map((horario) => {
            const carpetaUrl = `${sharePoint}/Documentos%20compartidos/Horarios%20Cursado/${encodeURIComponent(horario.carpeta)}`;
            return (
              <section key={horario.cuatrimestre} aria-labelledby={`horarios-${horario.cuatrimestre}`}>
                <h2
                  id={`horarios-${horario.cuatrimestre}`}
                  className="mb-5 text-xl font-semibold text-[#323130]"
                >
                  HORARIOS {horario.cuatrimestre}
                </h2>
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
                <div className="mt-4">
                  <Acceso
                    href={`${sharePoint}/Documentos%20compartidos/Horarios%20Cursado/${encodeURIComponent(horario.distribucion)}?web=1`}
                    icon={FileSpreadsheet}
                  >
                    {horario.distribucion.replace('.xlsm', '')}
                  </Acceso>
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
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

        <div className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          <section aria-labelledby="audiovisuales">
            <h2 id="audiovisuales" className="mb-6 text-xl font-semibold">
              AUDIOVISUALES
            </h2>
            <Acceso
              href={`${sharePoint}/Documentos%20compartidos/Registro%20QR%20DOCENTES.xlsx?web=1`}
              icon={QrCode}
            >
              Registro QR DOCENTES
            </Acceso>
          </section>

          <section aria-labelledby="inventario">
            <h2 id="inventario" className="mb-6 text-xl font-semibold">
              Inventario de aulas y equipos
            </h2>
            <Acceso
              href={`${sharePoint}/SitePages/Inventario-de-aulas-y-equipos-de-Recursos-%C3%A1ulicos.aspx`}
              icon={TableProperties}
            >
              Inventario de aulas y equipos
            </Acceso>
          </section>

          <section aria-labelledby="solicitudes">
            <h2 id="solicitudes" className="mb-6 text-xl font-semibold">
              Solicitudes a departamentos
            </h2>
            <Acceso
              href={`${sharePoint}/SiteAssets/SitePages/SCHome/Seguimiento%20de%20solicitudes.xlsx?web=1`}
              icon={Workflow}
            >
              Seguimiento de solicitudes
            </Acceso>
          </section>
        </div>

        <section className="mt-12 max-w-md" aria-labelledby="fechas-mesas">
          <h2 id="fechas-mesas" className="mb-6 text-xl font-semibold leading-9">
            Fechas mesas de exámenes
            <br />
            (Profesores)
          </h2>
          <Acceso
            href={`${sharePoint}/Documentos%20compartidos/Horarios%20Mesas`}
            icon={CalendarDays}
          >
            Horarios Mesas
          </Acceso>
        </section>
      </div>
    </div>
  );
}
