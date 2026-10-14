'use client';

import React, { useEffect, useState } from 'react';
import {
  obtenerReservasPorDiaAction,
  registrarReservaMatrizAction,
  actualizarReservaMatrizAction,
  cambiarEstadoReservaMatrizAction,
  eliminarReservaMatrizAction,
  obtenerProfesoresActivosAction,
  obtenerReservasEspecialesAction,
  registrarReservaEspecialAction,
  toggleEstadoReservaEspecialAction,
} from '@/app/actions/reservas';
import {
  ReservaMatriz,
  ReservaEspecial,
  Profesor,
  DiaSemana,
  EstadoReserva,
} from '@/lib/types/database.types';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  Clock,
  Plus,
  Printer,
  Sparkles,
  Layers,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Search,
  Check,
  X,
  FileCheck,
} from 'lucide-react';

interface BloqueHorario {
  nombre: string;
  inicio: string;
  fin: string;
}

const BLOQUES_MANANA: BloqueHorario[] = [
  { nombre: '1º Bloque', inicio: '07:30', fin: '08:10' },
  { nombre: '2º Bloque', inicio: '08:15', fin: '08:55' },
  { nombre: '3º Bloque', inicio: '08:55', fin: '09:35' },
  { nombre: '4º Bloque', inicio: '09:50', fin: '10:30' },
  { nombre: '5º Bloque', inicio: '10:30', fin: '11:10' },
  { nombre: '6º Bloque', inicio: '11:20', fin: '12:00' },
  { nombre: '7º Bloque', inicio: '12:00', fin: '12:40' },
  { nombre: '8º Bloque', inicio: '12:40', fin: '13:20' },
];

const BLOQUES_TARDE: BloqueHorario[] = [
  { nombre: '1º Bloque', inicio: '13:30', fin: '14:20' },
  { nombre: '2º Bloque', inicio: '14:30', fin: '15:20' },
  { nombre: '3º Bloque', inicio: '15:30', fin: '16:20' },
  { nombre: '4º Bloque', inicio: '16:30', fin: '17:20' },
  { nombre: '5º Bloque', inicio: '17:30', fin: '18:20' },
  { nombre: '6º Bloque', inicio: '18:30', fin: '19:20' },
  { nombre: '7º Bloque', inicio: '19:30', fin: '20:20' },
  { nombre: '8º Bloque', inicio: '20:30', fin: '21:20' },
];

const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function ReservasPage() {
  const { rol } = useAuth();
  const [diaActual, setDiaActual] = useState<DiaSemana>('Lunes');
  const [reservas, setReservas] = useState<ReservaMatriz[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [reservasEspeciales, setReservasEspeciales] = useState<ReservaEspecial[]>([]);
  const [vistaActiva, setVistaActiva] = useState<'matriz' | 'especiales'>('matriz');
  const [loading, setLoading] = useState(true);

  // Modal Nueva / Editar Reserva Matriz
  const [modalReservaOpen, setModalReservaOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [reservaIdEditando, setReservaIdEditando] = useState<string | null>(null);
  const [profesorInput, setProfesorInput] = useState('');
  const [aulaInput, setAulaInput] = useState('');
  const [recursoInput, setRecursoInput] = useState('Proyector');
  const [horaInicioInput, setHoraInicioInput] = useState('07:30');
  const [horaFinInput, setHoraFinInput] = useState('08:55');
  const [tramosExtra, setTramosExtra] = useState<{ inicio: string; fin: string }[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Modal Nueva Reserva Especial
  const [modalEspecialOpen, setModalEspecialOpen] = useState(false);
  const [espFecha, setEspFecha] = useState(new Date().toISOString().split('T')[0]);
  const [espDepto, setEspDepto] = useState('');
  const [espEquipo, setEspEquipo] = useState('');
  const [espHorario, setEspHorario] = useState('');
  const [espObs, setEspObs] = useState('');
  const [espTel, setEspTel] = useState('');
  const [guardandoEsp, setGuardandoEsp] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    const [resMatriz, resProfes, resEsp] = await Promise.all([
      obtenerReservasPorDiaAction(diaActual),
      obtenerProfesoresActivosAction(),
      obtenerReservasEspecialesAction(),
    ]);

    if (resMatriz.ok && resMatriz.data) setReservas(resMatriz.data);
    if (resProfes.ok && resProfes.data) setProfesores(resProfes.data);
    if (resEsp.ok && resEsp.data) setReservasEspeciales(resEsp.data);
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [diaActual]);

  const horaAMinutos = (hora: string): number => {
    const [h, m] = hora.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const calcularIndiceInicio = (reserva: ReservaMatriz, bloques: BloqueHorario[]): number => {
    const iniR = horaAMinutos(reserva.hora_inicio);
    const finR = horaAMinutos(reserva.hora_fin);

    for (let i = 0; i < bloques.length; i++) {
      const iniB = horaAMinutos(bloques[i].inicio);
      const finB = horaAMinutos(bloques[i].fin);
      if (iniR < finB && finR > iniB) return i;
    }
    return -1;
  };

  const calcularIndiceFin = (reserva: ReservaMatriz, bloques: BloqueHorario[]): number => {
    const iniR = horaAMinutos(reserva.hora_inicio);
    const finR = horaAMinutos(reserva.hora_fin);

    let ultimo = -1;
    for (let i = 0; i < bloques.length; i++) {
      const iniB = horaAMinutos(bloques[i].inicio);
      const finB = horaAMinutos(bloques[i].fin);
      if (iniR < finB && finR > iniB) ultimo = i;
    }
    return ultimo;
  };

  const handleToggleEstado = async (reserva: ReservaMatriz) => {
    const siguiente: Record<EstadoReserva, EstadoReserva> = {
      Pendiente: 'Pausado',
      Pausado: 'Finalizado',
      Finalizado: 'Pendiente',
    };
    const nuevoEstado = siguiente[reserva.estado];

    // Optimistic update
    setReservas((prev) =>
      prev.map((r) => (r.id === reserva.id ? { ...r, estado: nuevoEstado } : r))
    );

    await cambiarEstadoReservaMatrizAction(reserva.id, nuevoEstado);
  };

  const handleEliminar = async (id: string, profesor: string) => {
    if (!confirm(`¿Eliminar la reserva de ${profesor}?`)) return;
    setReservas((prev) => prev.filter((r) => r.id !== id));
    await eliminarReservaMatrizAction(id);
  };

  const handleAbrirCrear = () => {
    setModoEdicion(false);
    setReservaIdEditando(null);
    setProfesorInput('');
    setAulaInput('');
    setRecursoInput('Proyector');
    setHoraInicioInput('07:30');
    setHoraFinInput('08:55');
    setTramosExtra([]);
    setModalReservaOpen(true);
  };

  const handleAbrirEditar = (r: ReservaMatriz) => {
    setModoEdicion(true);
    setReservaIdEditando(r.id);
    setProfesorInput(r.profesor_nombre);
    setAulaInput(r.aula);
    setRecursoInput(r.recurso);
    setHoraInicioInput(r.hora_inicio.slice(0, 5));
    setHoraFinInput(r.hora_fin.slice(0, 5));
    setTramosExtra([]);
    setModalReservaOpen(true);
  };

  const handleGuardarReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profesorInput || !aulaInput || !horaInicioInput || !horaFinInput) {
      alert('Por favor completá todos los campos.');
      return;
    }

    setGuardando(true);

    if (modoEdicion && reservaIdEditando) {
      const res = await actualizarReservaMatrizAction({
        id: reservaIdEditando,
        dia: diaActual,
        profesor_nombre: profesorInput,
        hora_inicio: horaInicioInput,
        hora_fin: horaFinInput,
        aula: aulaInput,
        recurso: recursoInput,
        estado: 'Pendiente',
      });
      if (!res.ok) alert(res.error || 'Error al actualizar.');
    } else {
      // Registrar tramo principal
      await registrarReservaMatrizAction({
        dia: diaActual,
        profesor_nombre: profesorInput,
        hora_inicio: horaInicioInput,
        hora_fin: horaFinInput,
        aula: aulaInput,
        recurso: recursoInput,
      });

      // Registrar tramos extras si los hubiera
      for (const tramo of tramosExtra) {
        if (tramo.inicio && tramo.fin) {
          await registrarReservaMatrizAction({
            dia: diaActual,
            profesor_nombre: profesorInput,
            hora_inicio: tramo.inicio,
            hora_fin: tramo.fin,
            aula: aulaInput,
            recurso: recursoInput,
          });
        }
      }
    }

    setGuardando(false);
    setModalReservaOpen(false);
    cargarDatos();
  };

  const handleGuardarEspecial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espDepto || !espEquipo || !espHorario) {
      alert('Completá departamento, equipo y horario.');
      return;
    }

    setGuardandoEsp(true);
    const res = await registrarReservaEspecialAction({
      fecha: espFecha,
      departamento: espDepto,
      equipo: espEquipo,
      horario: espHorario,
      observaciones: espObs,
      telefono: espTel,
    });

    if (res.ok) {
      setModalEspecialOpen(false);
      setEspDepto('');
      setEspEquipo('');
      setEspHorario('');
      setEspObs('');
      setEspTel('');
      cargarDatos();
    } else {
      alert(res.error || 'Error al guardar.');
    }
    setGuardandoEsp(false);
  };

  const handleToggleEspecial = async (id: string, campo: 'entregado' | 'devuelto', actual: boolean) => {
    const nuevo = !actual;
    setReservasEspeciales((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [campo]: nuevo } : e))
    );
    await toggleEstadoReservaEspecialAction(id, campo, nuevo);
  };

  // Agrupar profesores únicos con reservas en este día
  const profesoresUnicos = Array.from(new Set(reservas.map((r) => r.profesor_nombre))).sort();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Institucional */}
      <div className="no-print bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-uap-azul via-uap-azul-medio to-blue-700 text-white flex items-center justify-center shadow-lg shadow-uap-azul/20">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-uap-azul">
              Matriz Horaria y Reserva de Equipos
            </h1>
            <p className="text-sm text-uap-gris mt-0.5">
              Control semanal de aulas, proyectores y recursos para IAP Mañana y UAP Tarde
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-uap-azul text-xs font-bold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Horario</span>
          </button>

          {rol !== 'alumno' && (
            <button
              onClick={handleAbrirCrear}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Reserva</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector de Subvistas y Días */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-uap-borde">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setVistaActiva('matriz')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              vistaActiva === 'matriz'
                ? 'bg-uap-azul text-white shadow-sm'
                : 'text-slate-600 hover:text-uap-azul'
            }`}
          >
            Matriz Semanal Áulica
          </button>
          <button
            onClick={() => setVistaActiva('especiales')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              vistaActiva === 'especiales'
                ? 'bg-uap-azul text-white shadow-sm'
                : 'text-slate-600 hover:text-uap-azul'
            }`}
          >
            Reservas Especiales ({reservasEspeciales.length})
          </button>
        </div>

        {vistaActiva === 'matriz' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {DIAS_SEMANA.map((dia) => (
              <button
                key={dia}
                onClick={() => setDiaActual(dia)}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap ${
                  diaActual === dia
                    ? 'bg-blue-100 text-uap-azul border-2 border-uap-azul font-black shadow-sm'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dia}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          VISTA 1: MATRIZ SEMANAL IAP MAÑANA / UAP TARDE
      ======================================================== */}
      {vistaActiva === 'matriz' && (
        <div className="space-y-8">
          {/* Cabecera de Impresión Oficial (solo visible en @media print) */}
          <div className="hidden print:block text-center pb-4 border-b border-black mb-4">
            <h2 className="text-xl font-bold uppercase tracking-wide">
              Universidad Adventista del Plata - Recursos Áulicos
            </h2>
            <p className="text-sm font-semibold">
              Cronograma de Reservas y Aulas - Día: {diaActual.toUpperCase()}
            </p>
          </div>

          {/* TABLA 1: IAP - MAÑANA */}
          <div className="bg-white rounded-3xl p-6 shadow-uap border border-uap-borde">
            <div className="flex items-center justify-between pb-3 border-b-2 border-uap-azul mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <h3 className="font-black text-uap-azul text-sm tracking-wider uppercase">
                  IAP - MAÑANA (Secundaria)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">8 Bloques de Clase</span>
            </div>

            <RenderMatrizTabla
              bloques={BLOQUES_MANANA}
              profesores={profesoresUnicos}
              reservas={reservas}
              calcularIndiceInicio={calcularIndiceInicio}
              calcularIndiceFin={calcularIndiceFin}
              onToggleEstado={handleToggleEstado}
              onEditar={handleAbrirEditar}
              onEliminar={handleEliminar}
              puedeEditar={rol !== 'alumno'}
            />
          </div>

          {/* TABLA 2: UAP - TARDE */}
          <div className="bg-white rounded-3xl p-6 shadow-uap border border-uap-borde">
            <div className="flex items-center justify-between pb-3 border-b-2 border-uap-azul mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <h3 className="font-black text-uap-azul text-sm tracking-wider uppercase">
                  UAP - TARDE (Universidad)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">8 Bloques de Clase</span>
            </div>

            <RenderMatrizTabla
              bloques={BLOQUES_TARDE}
              profesores={profesoresUnicos}
              reservas={reservas}
              calcularIndiceInicio={calcularIndiceInicio}
              calcularIndiceFin={calcularIndiceFin}
              onToggleEstado={handleToggleEstado}
              onEditar={handleAbrirEditar}
              onEliminar={handleEliminar}
              puedeEditar={rol !== 'alumno'}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          VISTA 2: RESERVAS ESPECIALES DE EQUIPOS
      ======================================================== */}
      {vistaActiva === 'especiales' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-uap-azul">Registro de Reservas Especiales</h2>
              <p className="text-xs text-slate-500">Préstamo de proyectores portátiles, audio y notebooks para eventos</p>
            </div>
            {rol !== 'alumno' && (
              <button
                onClick={() => setModalEspecialOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black rounded-xl shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Reserva Especial</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                  <th className="py-3 px-3">Fecha / Horario</th>
                  <th className="py-3 px-3">Departamento</th>
                  <th className="py-3 px-3">Equipo</th>
                  <th className="py-3 px-3">Contacto / Tel</th>
                  <th className="py-3 px-3">Observaciones</th>
                  <th className="py-3 px-3 text-center">Entregado</th>
                  <th className="py-3 px-3 text-center">Devuelto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservasEspeciales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No hay reservas especiales registradas.
                    </td>
                  </tr>
                ) : (
                  reservasEspeciales.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-uap-texto">{e.fecha}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{e.horario}</div>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-uap-azul">{e.departamento}</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700">{e.equipo}</td>
                      <td className="py-3.5 px-3 text-slate-500 font-medium">{e.telefono || '—'}</td>
                      <td className="py-3.5 px-3 text-slate-500 italic max-w-xs truncate">{e.observaciones || '—'}</td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleEspecial(e.id, 'entregado', e.entregado)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                            e.entregado
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {e.entregado ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleEspecial(e.id, 'devuelto', e.devuelto)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                            e.devuelto
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {e.devuelto ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL CREAR / EDITAR RESERVA MATRIZ
      ======================================================== */}
      {modalReservaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-uap-azul mb-4">
              {modoEdicion ? 'Editar Reserva de Clase' : 'Nueva Reserva de Clase'}
            </h3>

            <form onSubmit={handleGuardarReserva} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                  Profesor
                </label>
                <input
                  type="text"
                  list="lista-profesores"
                  value={profesorInput}
                  onChange={(e) => setProfesorInput(e.target.value)}
                  placeholder="Nombre y apellido del profesor"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
                />
                <datalist id="lista-profesores">
                  {profesores.map((p) => (
                    <option key={p.id} value={p.nombre} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Aula
                  </label>
                  <input
                    type="text"
                    value={aulaInput}
                    onChange={(e) => setAulaInput(e.target.value)}
                    placeholder="ej: Aula 15 o LAB 2"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Recurso
                  </label>
                  <select
                    value={recursoInput}
                    onChange={(e) => setRecursoInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio font-semibold"
                  >
                    <option value="Proyector">Proyector</option>
                    <option value="Audio">Audio</option>
                    <option value="Proyector + Audio">Proyector + Audio</option>
                    <option value="Notebook ASSUS">Notebook ASSUS</option>
                    <option value="TV Móvil">TV Móvil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={horaInicioInput}
                    onChange={(e) => setHoraInicioInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={horaFinInput}
                    onChange={(e) => setHoraFinInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                  />
                </div>
              </div>

              {!modoEdicion && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">¿Tiene otros tramos en el día?</span>
                    <button
                      type="button"
                      onClick={() => setTramosExtra([...tramosExtra, { inicio: '', fin: '' }])}
                      className="text-xs font-black text-uap-azul hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar tramo</span>
                    </button>
                  </div>

                  {tramosExtra.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="time"
                        value={t.inicio}
                        onChange={(e) => {
                          const copia = [...tramosExtra];
                          copia[idx].inicio = e.target.value;
                          setTramosExtra(copia);
                        }}
                        className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <span>a</span>
                      <input
                        type="time"
                        value={t.fin}
                        onChange={(e) => {
                          const copia = [...tramosExtra];
                          copia[idx].fin = e.target.value;
                          setTramosExtra(copia);
                        }}
                        className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setTramosExtra(tramosExtra.filter((_, i) => i !== idx))}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalReservaOpen(false)}
                  disabled={guardando}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Guardar Reserva</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL NUEVA RESERVA ESPECIAL
      ======================================================== */}
      {modalEspecialOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-uap-azul mb-4">Nueva Reserva Especial</h3>
            <form onSubmit={handleGuardarEspecial} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={espFecha}
                    onChange={(e) => setEspFecha(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Horario
                  </label>
                  <input
                    type="text"
                    value={espHorario}
                    onChange={(e) => setEspHorario(e.target.value)}
                    placeholder="ej: 14:00 - 18:00"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                  Departamento Solicitante
                </label>
                <input
                  type="text"
                  value={espDepto}
                  onChange={(e) => setEspDepto(e.target.value)}
                  placeholder="ej: Teología o Bienestar Estudiantil"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Equipo Solicitado
                  </label>
                  <input
                    type="text"
                    value={espEquipo}
                    onChange={(e) => setEspEquipo(e.target.value)}
                    placeholder="ej: Proyector Epson + Parlante"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                    Teléfono Contacto
                  </label>
                  <input
                    type="text"
                    value={espTel}
                    onChange={(e) => setEspTel(e.target.value)}
                    placeholder="ej: 343-5123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1">
                  Observaciones
                </label>
                <textarea
                  value={espObs}
                  onChange={(e) => setEspObs(e.target.value)}
                  placeholder="Detalles sobre lugar de entrega o retiro..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEspecialOpen(false)}
                  disabled={guardandoEsp}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEsp}
                  className="px-5 py-2.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2"
                >
                  {guardandoEsp ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Guardar Reserva</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente Renderizador de Tabla de Matriz
function RenderMatrizTabla({
  bloques,
  profesores,
  reservas,
  calcularIndiceInicio,
  calcularIndiceFin,
  onToggleEstado,
  onEditar,
  onEliminar,
  puedeEditar,
}: {
  bloques: BloqueHorario[];
  profesores: string[];
  reservas: ReservaMatriz[];
  calcularIndiceInicio: (r: ReservaMatriz, b: BloqueHorario[]) => number;
  calcularIndiceFin: (r: ReservaMatriz, b: BloqueHorario[]) => number;
  onToggleEstado: (r: ReservaMatriz) => void;
  onEditar: (r: ReservaMatriz) => void;
  onEliminar: (id: string, profesor: string) => void;
  puedeEditar: boolean;
}) {
  // Filtrar profesores que tienen al menos una reserva en este turno
  const profesoresConTurno = profesores.filter((prof) => {
    return reservas.some(
      (r) => r.profesor_nombre === prof && calcularIndiceInicio(r, bloques) !== -1
    );
  });

  if (profesoresConTurno.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs">
        No hay reservas registradas en este turno para el día seleccionado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-slate-200 text-xs text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-300">
            <th className="p-2.5 border-r border-slate-300 font-black text-uap-azul w-44 min-w-[170px]">
              Profesor
            </th>
            {bloques.map((b, i) => (
              <th
                key={i}
                className="p-2 border-r border-slate-300 font-extrabold text-slate-600 text-center min-w-[110px]"
              >
                <div className="text-[10px] text-slate-400 font-medium">{b.nombre}</div>
                <div className="text-[11px] font-black text-uap-texto">
                  {b.inicio} - {b.fin}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {profesoresConTurno.map((profesor) => {
            const reservasProf = reservas.filter(
              (r) => r.profesor_nombre === profesor && calcularIndiceInicio(r, bloques) !== -1
            );

            return (
              <tr key={profesor} className="hover:bg-slate-50/60 transition-colors">
                <td className="p-2.5 border-r border-slate-300 font-extrabold text-uap-texto text-xs bg-slate-50/30">
                  {profesor}
                </td>

                {(() => {
                  const celdas = [];
                  let col = 0;

                  while (col < bloques.length) {
                    const reservaEnCol = reservasProf.find(
                      (r) => calcularIndiceInicio(r, bloques) === col
                    );

                    if (reservaEnCol) {
                      const fin = calcularIndiceFin(reservaEnCol, bloques);
                      const colspan = Math.max(fin - col + 1, 1);

                      celdas.push(
                        <td
                          key={col}
                          colSpan={colspan}
                          className="p-1.5 border-r border-slate-200 align-middle"
                        >
                          <div
                            className={`p-2 rounded-xl border text-center transition-all relative group ${
                              reservaEnCol.estado === 'Finalizado'
                                ? 'bg-slate-100 text-slate-400 border-slate-300 opacity-60 line-through'
                                : reservaEnCol.estado === 'Pausado'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-blue-50 text-uap-azul border-blue-200 shadow-sm'
                            }`}
                          >
                            <div className="font-black text-xs">{reservaEnCol.aula}</div>
                            <div className="text-[10px] font-extrabold text-emerald-700 truncate">
                              {reservaEnCol.recurso}
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                              {reservaEnCol.hora_inicio.slice(0, 5)} -{' '}
                              {reservaEnCol.hora_fin.slice(0, 5)}
                            </div>

                            {/* Botones de Acción al pasar el cursor */}
                            {puedeEditar && (
                              <div className="no-print mt-1.5 pt-1 border-t border-black/5 flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onToggleEstado(reservaEnCol)}
                                  title={`Estado actual: ${reservaEnCol.estado}. Clic para cambiar.`}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 hover:bg-white"
                                >
                                  {reservaEnCol.estado}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditar(reservaEnCol)}
                                  className="p-1 hover:text-uap-azul"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onEliminar(reservaEnCol.id, reservaEnCol.profesor_nombre)
                                  }
                                  className="p-1 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      );

                      col += colspan;
                    } else {
                      celdas.push(
                        <td key={col} className="p-1.5 border-r border-slate-200 bg-white" />
                      );
                      col++;
                    }
                  }

                  return celdas;
                })()}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
