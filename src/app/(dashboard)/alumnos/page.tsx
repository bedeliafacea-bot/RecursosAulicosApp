'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  buscarInfoAlumnoAction,
  guardarNuevoAlumnoAction,
  listarJornadasAlumnoAction,
  registrarJornadasBatchAction,
  actualizarJornadaAction,
  eliminarJornadaAction,
  obtenerHorariosPactadosAction,
  registrarHorariosPactadosMasivosAction,
  obtenerInfoEvaluacionAction,
  guardarMesEvaluacionAction,
} from '@/app/actions/alumnos';
import {
  Alumno,
  JornadaBecuap,
  HorarioPactado,
  EvaluacionBecuap,
  MesEvaluacionData,
} from '@/lib/types/database.types';
import {
  Clock,
  Calendar,
  FileSpreadsheet,
  FileCheck2,
  UserPlus,
  CalendarDays,
  Edit,
  Trash2,
  Printer,
  Plus,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ShieldCheck,
  Award,
} from 'lucide-react';

export default function AlumnosPage() {
  const { rol, user, perfil } = useAuth();
  const fechaHoy = new Date().toISOString().split('T')[0];

  // Mes y Año dinámico (sin hardcodeo de 2026)
  const ahora = new Date();
  const [mesActual, setMesActual] = useState(ahora.getMonth() + 1);
  const [anioActual, setAnioActual] = useState(ahora.getFullYear());

  // Navegación de pestañas
  const [tab, setTab] = useState<
    'plan' | 'carga' | 'editar' | 'pactar' | 'nuevo' | 'informe' | 'evaluacion'
  >('plan');

  // ============================================================================
  // 1. ESTADO: MI FICHA / PROGRESO
  // ============================================================================
  const [busquedaFicha, setBusquedaFicha] = useState('');
  const [alumnoFicha, setAlumnoFicha] = useState<Alumno | null>(null);
  const [jornadasFicha, setJornadasFicha] = useState<JornadaBecuap[]>([]);
  const [horariosFicha, setHorariosFicha] = useState<HorarioPactado[]>([]);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [errorFicha, setErrorFicha] = useState('');

  // ============================================================================
  // 2. ESTADO: CARGAR JORNADA
  // ============================================================================
  const [legajoCarga, setLegajoCarga] = useState('');
  const [alumnoCarga, setAlumnoCarga] = useState<Alumno | null>(null);
  const [validandoCarga, setValidandoCarga] = useState(false);
  const [errorValidarCarga, setErrorValidarCarga] = useState('');

  // Filas de jornadas a cargar (soporta 1 o más)
  const [jornadasInput, setJornadasInput] = useState<
    Array<{
      fecha: string;
      e1: string;
      s1: string;
      e2: string;
      s2: string;
      obs: string;
    }>
  >([{ fecha: fechaHoy, e1: '07:30', s1: '11:30', e2: '', s2: '', obs: '' }]);
  const [guardandoCarga, setGuardandoCarga] = useState(false);
  const [msgCarga, setMsgCarga] = useState('');

  // ============================================================================
  // 3. ESTADO: EDITAR JORNADAS
  // ============================================================================
  const [legajoEditar, setLegajoEditar] = useState('');
  const [jornadasEditar, setJornadasEditar] = useState<JornadaBecuap[]>([]);
  const [cargandoEditar, setCargandoEditar] = useState(false);
  const [jornadaEnEdicion, setJornadaEnEdicion] = useState<JornadaBecuap | null>(null);
  const [editE1, setEditE1] = useState('');
  const [editS1, setEditS1] = useState('');
  const [editE2, setEditE2] = useState('');
  const [editS2, setEditS2] = useState('');
  const [editObs, setEditObs] = useState('');
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // ============================================================================
  // 4. ESTADO: PACTAR HORARIOS
  // ============================================================================
  const [legajoPactar, setLegajoPactar] = useState('');
  const [bloquesPactar, setBloquesPactar] = useState<
    Array<{ rango: string; diasTexto: string }>
  >([{ rango: '07:30 - 11:30', diasTexto: '' }]);
  const [guardandoPactar, setGuardandoPactar] = useState(false);
  const [msgPactar, setMsgPactar] = useState('');

  // ============================================================================
  // 5. ESTADO: NUEVO ALUMNO
  // ============================================================================
  const [nuevoId, setNuevoId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPlan, setNuevoPlan] = useState<'10hs' | '20hs'>('20hs');
  const [nuevaCarrera, setNuevaCarrera] = useState('');
  const [nuevoTel, setNuevoTel] = useState('');
  const [nuevaDir, setNuevaDir] = useState('');
  const [nuevoNac, setNuevoNac] = useState('');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [msgNuevo, setMsgNuevo] = useState('');

  // ============================================================================
  // 6. ESTADO: GENERAR PLANILLA MENSUAL (A4 PORTRAIT)
  // ============================================================================
  const [legajoInforme, setLegajoInforme] = useState('');
  const [alumnoInforme, setAlumnoInforme] = useState<Alumno | null>(null);
  const [jornadasInforme, setJornadasInforme] = useState<JornadaBecuap[]>([]);
  const [cargandoInforme, setCargandoInforme] = useState(false);

  // ============================================================================
  // 7. ESTADO: EVALUACIÓN BECUAP (A4 LANDSCAPE)
  // ============================================================================
  const [legajoEval, setLegajoEval] = useState('');
  const [cuatrimestreEval, setCuatrimestreEval] = useState<1 | 2>(1);
  const [mesEval, setMesEval] = useState<string>('marzo');
  const [alumnoEval, setAlumnoEval] = useState<Alumno | null>(null);
  const [inicioPlanEval, setInicioPlanEval] = useState('');
  const [evalData, setEvalData] = useState<EvaluacionBecuap | null>(null);
  const [notasInputs, setNotasInputs] = useState<(number | '')[]>([
    '', '', '', '', '', '', '',
  ]);
  const [obsMesInput, setObsMesInput] = useState('');
  const [obsGeneralInput, setObsGeneralInput] = useState('');
  const [cargandoEval, setCargandoEval] = useState(false);
  const [guardandoEval, setGuardandoEval] = useState(false);
  const [msgEval, setMsgEval] = useState('');

  // Si el usuario conectado tiene rol 'alumno', preestablecer su legajo si coincide
  useEffect(() => {
    if (rol === 'alumno' && perfil?.usuario) {
      setBusquedaFicha(perfil.usuario);
      handleBuscarFicha(perfil.usuario);
    }
  }, [rol, perfil]);

  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // ============================================================================
  // HANDLERS: FICHA / PROGRESO
  // ============================================================================
  const handleBuscarFicha = async (terminoParam?: string) => {
    const q = (terminoParam || busquedaFicha).trim();
    if (!q) return;

    setCargandoFicha(true);
    setErrorFicha('');

    const resAl = await buscarInfoAlumnoAction(q);
    if (!resAl.ok || !resAl.data) {
      setErrorFicha(resAl.error || 'Alumno no encontrado.');
      setAlumnoFicha(null);
      setJornadasFicha([]);
      setHorariosFicha([]);
      setCargandoFicha(false);
      return;
    }

    setAlumnoFicha(resAl.data);

    // Cargar jornadas y horarios del mes/año
    const [resJor, resHor] = await Promise.all([
      listarJornadasAlumnoAction(resAl.data.id, mesActual, anioActual),
      obtenerHorariosPactadosAction(resAl.data.id, mesActual, anioActual),
    ]);

    if (resJor.ok && resJor.data) setJornadasFicha(resJor.data);
    if (resHor.ok && resHor.data) setHorariosFicha(resHor.data);

    setCargandoFicha(false);
  };

  // Calcular horas acumuladas y meta según plan
  const diasEnMes = new Date(anioActual, mesActual, 0).getDate();
  const metaHoras =
    alumnoFicha?.plan === '10hs'
      ? diasEnMes === 31
        ? 45
        : 43
      : diasEnMes === 31
      ? 89
      : 86;

  const totalHorasDecimalesAcumuladas = jornadasFicha.reduce(
    (acc, cur) => acc + (Number(cur.total_decimal) || 0),
    0
  );

  const horasEnteras = Math.floor(totalHorasDecimalesAcumuladas);
  const minutosEnteros = Math.round((totalHorasDecimalesAcumuladas - horasEnteras) * 60);
  const totalHorasHHMM = `${horasEnteras}:${minutosEnteros < 10 ? '0' + minutosEnteros : minutosEnteros}`;
  const porcentajeAvance = Math.min(
    Math.round((totalHorasDecimalesAcumuladas / metaHoras) * 100),
    100
  );

  // ============================================================================
  // HANDLERS: CARGA DE JORNADAS
  // ============================================================================
  const handleValidarLegajoCarga = async () => {
    if (!legajoCarga.trim()) return;
    setValidandoCarga(true);
    setErrorValidarCarga('');
    setAlumnoCarga(null);

    const res = await buscarInfoAlumnoAction(legajoCarga);
    if (res.ok && res.data) {
      setAlumnoCarga(res.data);
    } else {
      setErrorValidarCarga('Legajo no encontrado en base de datos.');
    }
    setValidandoCarga(false);
  };

  const handleAgregarFilaJornada = () => {
    setJornadasInput([
      ...jornadasInput,
      { fecha: fechaHoy, e1: '07:30', s1: '11:30', e2: '', s2: '', obs: '' },
    ]);
  };

  const handleEliminarFilaJornada = (index: number) => {
    setJornadasInput(jornadasInput.filter((_, i) => i !== index));
  };

  const handleGuardarJornadas = async () => {
    if (!alumnoCarga) {
      alert('Validá primero un legajo de alumno válido.');
      return;
    }

    setGuardandoCarga(true);
    setMsgCarga('');

    const res = await registrarJornadasBatchAction(
      alumnoCarga.id,
      jornadasInput.map((j) => ({
        fecha: j.fecha,
        entrada_1: j.e1 || null,
        salida_1: j.s1 || null,
        entrada_2: j.e2 || null,
        salida_2: j.s2 || null,
        observacion: j.obs || null,
      }))
    );

    if (res.ok) {
      setMsgCarga('✅ ¡Jornadas registradas exitosamente!');
      setJornadasInput([
        { fecha: fechaHoy, e1: '07:30', s1: '11:30', e2: '', s2: '', obs: '' },
      ]);
    } else {
      alert(res.error || 'Error al guardar jornadas.');
    }
    setGuardandoCarga(false);
  };

  // ============================================================================
  // HANDLERS: EDITAR JORNADAS
  // ============================================================================
  const handleBuscarEditar = async () => {
    if (!legajoEditar.trim()) return;
    setCargandoEditar(true);
    const res = await listarJornadasAlumnoAction(legajoEditar.trim(), mesActual, anioActual);
    if (res.ok && res.data) {
      setJornadasEditar(res.data);
    } else {
      setJornadasEditar([]);
    }
    setCargandoEditar(false);
  };

  const handleAbrirEditarModal = (j: JornadaBecuap) => {
    setJornadaEnEdicion(j);
    setEditE1(j.entrada_1 ? j.entrada_1.slice(0, 5) : '');
    setEditS1(j.salida_1 ? j.salida_1.slice(0, 5) : '');
    setEditE2(j.entrada_2 ? j.entrada_2.slice(0, 5) : '');
    setEditS2(j.salida_2 ? j.salida_2.slice(0, 5) : '');
    setEditObs(j.observacion || '');
  };

  const handleGuardarEdicion = async () => {
    if (!jornadaEnEdicion) return;
    setGuardandoEdit(true);

    const res = await actualizarJornadaAction({
      id: jornadaEnEdicion.id,
      fecha: jornadaEnEdicion.fecha,
      entrada_1: editE1,
      salida_1: editS1,
      entrada_2: editE2,
      salida_2: editS2,
      observacion: editObs,
    });

    if (res.ok) {
      setJornadaEnEdicion(null);
      handleBuscarEditar();
    } else {
      alert(res.error || 'Error al actualizar.');
    }
    setGuardandoEdit(false);
  };

  const handleEliminarJornada = async (id: string, fecha: string) => {
    if (!confirm(`¿Deseás eliminar la jornada del ${fecha}?`)) return;
    await eliminarJornadaAction(id);
    handleBuscarEditar();
  };

  // ============================================================================
  // HANDLERS: PACTAR HORARIOS
  // ============================================================================
  const handleGuardarPactar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legajoPactar.trim()) {
      alert('Ingresá el legajo del alumno.');
      return;
    }

    setGuardandoPactar(true);
    setMsgPactar('');

    const res = await registrarHorariosPactadosMasivosAction({
      alumnoId: legajoPactar.trim(),
      mes: mesActual,
      anio: anioActual,
      bloques: bloquesPactar,
    });

    if (res.ok) {
      setMsgPactar('✅ Cronograma mensual guardado exitosamente.');
      setBloquesPactar([{ rango: '07:30 - 11:30', diasTexto: '' }]);
    } else {
      alert(res.error || 'Error al guardar.');
    }
    setGuardandoPactar(false);
  };

  // ============================================================================
  // HANDLERS: NUEVO ALUMNO
  // ============================================================================
  const handleCrearAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoId || !nuevoNombre) {
      alert('Completá Legajo y Nombre.');
      return;
    }

    setGuardandoNuevo(true);
    setMsgNuevo('');

    const res = await guardarNuevoAlumnoAction({
      id: nuevoId,
      nombre: nuevoNombre,
      plan: nuevoPlan,
      carrera: nuevaCarrera,
      telefono: nuevoTel,
      direccion: nuevaDir,
      fecha_nacimiento: nuevoNac || undefined,
    });

    if (res.ok) {
      setMsgNuevo('✅ Alumno registrado exitosamente.');
      setNuevoId('');
      setNuevoNombre('');
      setNuevaCarrera('');
      setNuevoTel('');
      setNuevaDir('');
      setNuevoNac('');
    } else {
      alert(res.error || 'Error al crear alumno.');
    }
    setGuardandoNuevo(false);
  };

  // ============================================================================
  // HANDLERS: INFORME / PLANILLA MENSUAL
  // ============================================================================
  const handleBuscarInforme = async () => {
    if (!legajoInforme.trim()) return;
    setCargandoInforme(true);

    const resAl = await buscarInfoAlumnoAction(legajoInforme.trim());
    if (resAl.ok && resAl.data) {
      setAlumnoInforme(resAl.data);
      const resJor = await listarJornadasAlumnoAction(resAl.data.id, mesActual, anioActual);
      if (resJor.ok && resJor.data) {
        setJornadasInforme(resJor.data);
      } else {
        setJornadasInforme([]);
      }
    } else {
      alert('Alumno no encontrado.');
      setAlumnoInforme(null);
      setJornadasInforme([]);
    }
    setCargandoInforme(false);
  };

  // ============================================================================
  // HANDLERS: EVALUACIÓN CUATRIMESTRAL BECUAP
  // ============================================================================
  const mesesCuatrimestre =
    cuatrimestreEval === 1
      ? ['marzo', 'abril', 'mayo', 'junio']
      : ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre'];

  const criteriosEvaluacion = [
    'Cumple con los horarios establecidos.',
    'Presta atención y cumple indicaciones.',
    'Utiliza herramientas adecuadamente.',
    'Cumple regla de vestimenta/higiene.',
    'Colabora en desenvolvimiento de grupo.',
    'Tiene iniciativa optimizando tiempos.',
    'Es honesto, respetuoso, solidario.',
  ];

  const handleBuscarEvaluacion = async () => {
    if (!legajoEval.trim()) return;
    setCargandoEval(true);
    setMsgEval('');

    const res = await obtenerInfoEvaluacionAction(
      legajoEval.trim(),
      cuatrimestreEval,
      anioActual
    );

    if (res.ok && res.alumno) {
      setAlumnoEval(res.alumno);
      setInicioPlanEval(res.fechaInicioPlan || 'Sin registros');
      setEvalData(res.evaluacion || null);

      // Cargar notas del mes actualmente seleccionado
      const dataMes = res.evaluacion
        ? ((res.evaluacion as any)[mesEval] as MesEvaluacionData)
        : null;

      if (dataMes && Array.isArray(dataMes.notas)) {
        setNotasInputs(dataMes.notas.map((n) => (n !== null ? n : '')));
        setObsMesInput(dataMes.observacion || '');
      } else {
        setNotasInputs(['', '', '', '', '', '', '']);
        setObsMesInput('');
      }

      setObsGeneralInput(res.evaluacion?.obs_general || '');
    } else {
      alert(res.error || 'Alumno no encontrado.');
      setAlumnoEval(null);
    }
    setCargandoEval(false);
  };

  const handleCambioMesEval = (nuevoMes: string) => {
    setMesEval(nuevoMes);
    if (!evalData) {
      setNotasInputs(['', '', '', '', '', '', '']);
      setObsMesInput('');
      return;
    }

    const dataMes = (evalData as any)[nuevoMes] as MesEvaluacionData | null;
    if (dataMes && Array.isArray(dataMes.notas)) {
      setNotasInputs(dataMes.notas.map((n) => (n !== null ? n : '')));
      setObsMesInput(dataMes.observacion || '');
    } else {
      setNotasInputs(['', '', '', '', '', '', '']);
      setObsMesInput('');
    }
  };

  const handleGuardarEvaluacionMes = async () => {
    if (!alumnoEval) return;
    setGuardandoEval(true);
    setMsgEval('');

    const notasLimpias = notasInputs.map((n) =>
      n === '' || isNaN(Number(n)) ? null : Number(n)
    );

    const res = await guardarMesEvaluacionAction({
      alumnoId: alumnoEval.id,
      cuatrimestre: cuatrimestreEval,
      anio: anioActual,
      mesNombre: mesEval,
      datosMes: {
        notas: notasLimpias,
        observacion: obsMesInput.trim(),
      },
      obsGeneral: obsGeneralInput.trim(),
      fechaInicioPlan: inicioPlanEval,
    });

    if (res.ok) {
      setMsgEval(`✅ ¡Evaluación de ${mesEval.toUpperCase()} guardada!`);
      // Refrescar
      handleBuscarEvaluacion();
    } else {
      alert(res.error || 'Error al guardar evaluación.');
    }
    setGuardandoEval(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================
          HEADER INSTITUCIONAL Y BARRA DE NAVEGACIÓN DE PESTAÑAS
      ======================================================== */}
      <div className="no-print bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-uap-azul via-uap-azul-medio to-teal-700 text-white flex items-center justify-center shadow-lg shadow-uap-azul/20">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-uap-azul">
              Registros Alumnos Becarios (Plan Becuap)
            </h1>
            <p className="text-sm text-uap-gris mt-0.5">
              Control mensual de horas, cronogramas pactados, planillas oficiales y evaluaciones
            </p>
          </div>
        </div>

        {/* Selector de Mes y Año General */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <select
            value={mesActual}
            onChange={(e) => setMesActual(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-uap-texto focus:ring-2 focus:ring-uap-azul"
          >
            {nombresMeses.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={anioActual}
            onChange={(e) => setAnioActual(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-uap-texto focus:ring-2 focus:ring-uap-azul"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Menú de Subvistas / Pestañas según Rol */}
      <div className="no-print bg-white p-2 rounded-3xl shadow-sm border border-uap-borde overflow-x-auto flex gap-1">
        <button
          onClick={() => setTab('plan')}
          className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${
            tab === 'plan'
              ? 'bg-uap-azul text-white shadow-md'
              : 'text-slate-600 hover:text-uap-azul hover:bg-slate-50'
          }`}
        >
          Mi Ficha / Progreso
        </button>

        {rol !== 'alumno' && (
          <>
            <button
              onClick={() => setTab('carga')}
              className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${
                tab === 'carga'
                  ? 'bg-uap-azul text-white shadow-md'
                  : 'text-slate-600 hover:text-uap-azul hover:bg-slate-50'
              }`}
            >
              Cargar Jornada
            </button>

            <button
              onClick={() => setTab('editar')}
              className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${
                tab === 'editar'
                  ? 'bg-uap-azul text-white shadow-md'
                  : 'text-slate-600 hover:text-uap-azul hover:bg-slate-50'
              }`}
            >
              Editar Jornadas
            </button>

            <button
              onClick={() => setTab('informe')}
              className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${
                tab === 'informe'
                  ? 'bg-uap-azul text-white shadow-md'
                  : 'text-slate-600 hover:text-uap-azul hover:bg-slate-50'
              }`}
            >
              Planilla Mensual (A4)
            </button>

            <button
              onClick={() => setTab('evaluacion')}
              className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${
                tab === 'evaluacion'
                  ? 'bg-uap-azul text-white shadow-md'
                  : 'text-slate-600 hover:text-uap-azul hover:bg-slate-50'
              }`}
            >
              📝 Evaluación Becuap (A4)
            </button>
          </>
        )}

        {rol === 'admin' && (
          <>
            <button
              onClick={() => setTab('pactar')}
              className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${
                tab === 'pactar'
                  ? 'bg-uap-azul text-white shadow-md'
                  : 'text-slate-600 hover:text-uap-azul hover:bg-slate-50'
              }`}
            >
              Pactar Horarios
            </button>

            <button
              onClick={() => setTab('nuevo')}
              className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${
                tab === 'nuevo'
                  ? 'bg-uap-azul text-white shadow-md'
                  : 'text-slate-600 hover:text-uap-azul hover:bg-slate-50'
              }`}
            >
              Nuevo Alumno
            </button>
          </>
        )}
      </div>

      {/* ============================================================================
          PESTAÑA 1: MI FICHA / PROGRESO (Consulta y Barra de Horas)
      ============================================================================ */}
      {tab === 'plan' && (
        <div className="space-y-6">
          <div className="no-print bg-white rounded-3xl p-6 shadow-uap border border-uap-borde">
            <h2 className="text-base font-black text-uap-azul mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-uap-azul-medio" />
              <span>Consulta de Ficha de Alumno</span>
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input
                type="text"
                value={busquedaFicha}
                onChange={(e) => setBusquedaFicha(e.target.value)}
                placeholder="Ingresá N° de Legajo o Nombre..."
                disabled={rol === 'alumno'}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-uap-azul"
              />
              <button
                type="button"
                onClick={() => handleBuscarFicha()}
                disabled={cargandoFicha}
                className="px-6 py-2.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {cargandoFicha ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Consultar</span>
              </button>
            </div>

            {errorFicha && (
              <p className="mt-3 text-xs text-red-600 font-bold">{errorFicha}</p>
            )}
          </div>

          {alumnoFicha && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Tarjeta de Datos y Barra de Progreso */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-uap-azul flex items-center justify-center font-black text-lg">
                      {alumnoFicha.nombre.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-uap-azul">
                        {alumnoFicha.nombre}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Legajo: #{alumnoFicha.id}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-uap-azul text-xs font-black rounded-full uppercase">
                    Plan {alumnoFicha.plan}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Carrera:</span>
                    <span className="font-extrabold text-uap-texto">
                      {alumnoFicha.carrera || 'No registrada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Fecha Nacimiento:</span>
                    <span className="font-extrabold text-uap-texto">
                      {alumnoFicha.fecha_nacimiento || 'No registrada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Teléfono:</span>
                    <span className="font-extrabold text-uap-texto">
                      {alumnoFicha.telefono || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Dirección:</span>
                    <span className="font-extrabold text-uap-texto">
                      {alumnoFicha.direccion || '—'}
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso Mensual */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-600 uppercase tracking-wider">
                      Horas de {nombresMeses[mesActual - 1]}:
                    </span>
                    <span className="text-emerald-600 text-sm">
                      {totalHorasHHMM} / {metaHoras} hs ({porcentajeAvance}%)
                    </span>
                  </div>

                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-500 to-green-500 transition-all duration-500"
                      style={{ width: `${porcentajeAvance}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Calendario Pactado del Mes */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-uap-azul flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-uap-azul-medio" />
                    <span>Cronograma de Horarios Pactados</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">
                    {nombresMeses[mesActual - 1]} {anioActual}
                  </span>
                </div>

                {horariosFicha.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No hay horarios pactados registrados para este mes.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {horariosFicha.map((h) => {
                      const diaNum = h.fecha.split('-')[2];
                      return (
                        <div
                          key={h.id}
                          className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-center"
                        >
                          <span className="text-xs font-black text-uap-azul block">
                            Día {diaNum}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600">
                            {h.rango_horario}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          PESTAÑA 2: CARGAR JORNADA DIARIA (Soporta doble turno y lote)
      ============================================================================ */}
      {tab === 'carga' && rol !== 'alumno' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <FileSpreadsheet className="w-6 h-6 text-uap-azul" />
            <div>
              <h2 className="text-lg font-black text-uap-azul">Registrar Jornada Diaria</h2>
              <p className="text-xs text-slate-400">
                Cargá la asistencia del becario con turnos simples o dobles
              </p>
            </div>
          </div>

          {/* Paso 1: Validar Legajo */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block text-xs font-black text-uap-texto uppercase mb-2">
              1. Validar Legajo del Alumno
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={legajoCarga}
                onChange={(e) => setLegajoCarga(e.target.value)}
                placeholder="Ingresá N° de Legajo..."
                className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
              />
              <button
                type="button"
                onClick={handleValidarLegajoCarga}
                disabled={validandoCarga}
                className="px-5 py-2 bg-uap-azul text-white text-xs font-black uppercase rounded-xl hover:bg-uap-azul-oscuro transition-all"
              >
                {validandoCarga ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validar'}
              </button>
            </div>

            {errorValidarCarga && (
              <p className="mt-2 text-xs text-red-600 font-bold">{errorValidarCarga}</p>
            )}

            {alumnoCarga && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold">
                <span>Alumno: <b>{alumnoCarga.nombre}</b></span>
                <span className="uppercase">Plan {alumnoCarga.plan}</span>
              </div>
            )}
          </div>

          {/* Paso 2: Formularios de Jornada */}
          {alumnoCarga && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-uap-texto uppercase tracking-wider">
                  2. Ingreso de Días y Turnos
                </span>
                <button
                  type="button"
                  onClick={handleAgregarFilaJornada}
                  className="text-xs font-black text-uap-azul hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar otro día</span>
                </button>
              </div>

              {msgCarga && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                  {msgCarga}
                </div>
              )}

              {jornadasInput.map((j, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative"
                >
                  {jornadasInput.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleEliminarFilaJornada(idx)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={j.fecha}
                        onChange={(e) => {
                          const copia = [...jornadasInput];
                          copia[idx].fecha = e.target.value;
                          setJornadasInput(copia);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Turno 1 (Entrada / Salida)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={j.e1}
                          onChange={(e) => {
                            const copia = [...jornadasInput];
                            copia[idx].e1 = e.target.value;
                            setJornadasInput(copia);
                          }}
                          className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="time"
                          value={j.s1}
                          onChange={(e) => {
                            const copia = [...jornadasInput];
                            copia[idx].s1 = e.target.value;
                            setJornadasInput(copia);
                          }}
                          className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Turno 2 (Opcional)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={j.e2}
                          onChange={(e) => {
                            const copia = [...jornadasInput];
                            copia[idx].e2 = e.target.value;
                            setJornadasInput(copia);
                          }}
                          className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="time"
                          value={j.s2}
                          onChange={(e) => {
                            const copia = [...jornadasInput];
                            copia[idx].s2 = e.target.value;
                            setJornadasInput(copia);
                          }}
                          className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={j.obs}
                      onChange={(e) => {
                        const copia = [...jornadasInput];
                        copia[idx].obs = e.target.value;
                        setJornadasInput(copia);
                      }}
                      placeholder="Tarea realizada (opcional)..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleGuardarJornadas}
                disabled={guardandoCarga}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {guardandoCarga ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Guardar Jornadas Cargadas</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          PESTAÑA 3: EDITAR JORNADAS CARGADAS
      ============================================================================ */}
      {tab === 'editar' && rol !== 'alumno' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <Edit className="w-6 h-6 text-uap-azul" />
            <div>
              <h2 className="text-lg font-black text-uap-azul">Editar Jornadas Cargadas</h2>
              <p className="text-xs text-slate-400">
                Buscá por legajo y modificá o eliminá turnos mediante IDs seguros
              </p>
            </div>
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={legajoEditar}
              onChange={(e) => setLegajoEditar(e.target.value)}
              placeholder="N° de Legajo..."
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
            />
            <button
              onClick={handleBuscarEditar}
              disabled={cargandoEditar}
              className="px-5 py-2 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase rounded-xl transition-all"
            >
              {cargandoEditar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Turno 1</th>
                  <th className="py-2.5 px-3">Turno 2</th>
                  <th className="py-2.5 px-3 text-center">Horas</th>
                  <th className="py-2.5 px-3">Observación</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jornadasEditar.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No hay jornadas cargadas para este legajo en el mes seleccionado.
                    </td>
                  </tr>
                ) : (
                  jornadasEditar.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-uap-texto">{j.fecha}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {j.entrada_1?.slice(0, 5)} - {j.salida_1?.slice(0, 5)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {j.entrada_2 ? `${j.entrada_2.slice(0, 5)} - ${j.salida_2?.slice(0, 5)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700">
                        {j.total_decimal} hs
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                        {j.observacion || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleAbrirEditarModal(j)}
                          className="p-1.5 text-uap-azul hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminarJornada(j.id, j.fecha)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Edición de Jornada */}
          {jornadaEnEdicion && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <h3 className="text-base font-black text-uap-azul">
                  Modificar Jornada ({jornadaEnEdicion.fecha})
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Turno 1
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={editE1}
                        onChange={(e) => setEditE1(e.target.value)}
                        className="w-1/2 p-2 border rounded-xl text-xs"
                      />
                      <input
                        type="time"
                        value={editS1}
                        onChange={(e) => setEditS1(e.target.value)}
                        className="w-1/2 p-2 border rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Turno 2
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={editE2}
                        onChange={(e) => setEditE2(e.target.value)}
                        className="w-1/2 p-2 border rounded-xl text-xs"
                      />
                      <input
                        type="time"
                        value={editS2}
                        onChange={(e) => setEditS2(e.target.value)}
                        className="w-1/2 p-2 border rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Observación
                    </label>
                    <input
                      type="text"
                      value={editObs}
                      onChange={(e) => setEditObs(e.target.value)}
                      className="w-full p-2 border rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setJornadaEnEdicion(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarEdicion}
                    disabled={guardandoEdit}
                    className="px-5 py-2 bg-uap-azul text-white text-xs font-black rounded-xl"
                  >
                    {guardandoEdit ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          PESTAÑA 4: PACTAR HORARIOS (Solo Admin)
      ============================================================================ */}
      {tab === 'pactar' && rol === 'admin' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <CalendarDays className="w-6 h-6 text-uap-azul" />
            <div>
              <h2 className="text-lg font-black text-uap-azul">Pactar Horarios Mensuales</h2>
              <p className="text-xs text-slate-400">
                Definí los rangos horarios y días separados por comas para el mes seleccionado
              </p>
            </div>
          </div>

          {msgPactar && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              {msgPactar}
            </div>
          )}

          <form onSubmit={handleGuardarPactar} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                Legajo del Alumno
              </label>
              <input
                type="text"
                value={legajoPactar}
                onChange={(e) => setLegajoPactar(e.target.value)}
                placeholder="ej: 12345"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-uap-azul uppercase">
                  Bloques Horarios Pactados
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBloquesPactar([...bloquesPactar, { rango: '', diasTexto: '' }])
                  }
                  className="text-xs font-black text-uap-azul hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar otro bloque</span>
                </button>
              </div>

              {bloquesPactar.map((b, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Rango Horario
                      </label>
                      <input
                        type="text"
                        value={b.rango}
                        onChange={(e) => {
                          const copia = [...bloquesPactar];
                          copia[idx].rango = e.target.value;
                          setBloquesPactar(copia);
                        }}
                        placeholder="ej: 07:30 - 11:30"
                        required
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Días (separar con coma)
                      </label>
                      <input
                        type="text"
                        value={b.diasTexto}
                        onChange={(e) => {
                          const copia = [...bloquesPactar];
                          copia[idx].diasTexto = e.target.value;
                          setBloquesPactar(copia);
                        }}
                        placeholder="ej: 1, 2, 3, 6, 7"
                        required
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={guardandoPactar}
              className="w-full py-3.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {guardandoPactar ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Guardar Cronograma Completo</span>
            </button>
          </form>
        </div>
      )}

      {/* ============================================================================
          PESTAÑA 5: NUEVO ALUMNO (Solo Admin)
      ============================================================================ */}
      {tab === 'nuevo' && rol === 'admin' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <UserPlus className="w-6 h-6 text-uap-azul" />
            <div>
              <h2 className="text-lg font-black text-uap-azul">Registrar Nuevo Alumno</h2>
              <p className="text-xs text-slate-400">
                Alta en la base de datos de alumnos becarios Becuap
              </p>
            </div>
          </div>

          {msgNuevo && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              {msgNuevo}
            </div>
          )}

          <form onSubmit={handleCrearAlumno} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                  ID / Legajo
                </label>
                <input
                  type="text"
                  value={nuevoId}
                  onChange={(e) => setNuevoId(e.target.value)}
                  placeholder="ej: 24501"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                  Plan de Horas
                </label>
                <select
                  value={nuevoPlan}
                  onChange={(e) => setNuevoPlan(e.target.value as '10hs' | '20hs')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                >
                  <option value="20hs">Plan 20hs (89 / 86 hs)</option>
                  <option value="10hs">Plan 10hs (45 / 43 hs)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="ej: Alan Smith"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                  Carrera
                </label>
                <input
                  type="text"
                  value={nuevaCarrera}
                  onChange={(e) => setNuevaCarrera(e.target.value)}
                  placeholder="ej: Lic. en Sistemas"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={nuevoNac}
                  onChange={(e) => setNuevoNac(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={nuevoTel}
                  onChange={(e) => setNuevoTel(e.target.value)}
                  placeholder="ej: 343-4567890"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-uap-texto uppercase mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={nuevaDir}
                  onChange={(e) => setNuevaDir(e.target.value)}
                  placeholder="ej: 25 de Mayo 99"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={guardandoNuevo}
              className="w-full py-3.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {guardandoNuevo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Guardar Alumno</span>
            </button>
          </form>
        </div>
      )}

      {/* ============================================================================
          PESTAÑA 6: GENERAR PLANILLA MENSUAL (A4 PORTRAIT)
      ============================================================================ */}
      {tab === 'informe' && rol !== 'alumno' && (
        <div className="space-y-6">
          <div className="no-print bg-white rounded-3xl p-6 shadow-uap border border-uap-borde flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-2 max-w-md w-full">
              <input
                type="text"
                value={legajoInforme}
                onChange={(e) => setLegajoInforme(e.target.value)}
                placeholder="Legajo del alumno..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
              <button
                onClick={handleBuscarInforme}
                disabled={cargandoInforme}
                className="px-5 py-2 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase rounded-xl"
              >
                {cargandoInforme ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ver Planilla'}
              </button>
            </div>

            {alumnoInforme && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir A4</span>
              </button>
            )}
          </div>

          {alumnoInforme && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde print:shadow-none print:border-none print:p-0">
              {/* Formato Oficial de Impresión A4 Portrait */}
              <div className="print-page-portrait space-y-4">
                <table className="w-full border-collapse border border-black text-center text-xs">
                  <tbody>
                    <tr>
                      <td className="w-20 p-2 border-r border-black">
                        <img
                          src="https://i.postimg.cc/fyMcjMcn/logo-uap.png"
                          alt="UAP"
                          className="w-14 mx-auto"
                        />
                      </td>
                      <td className="p-2 border-r border-black font-extrabold text-sm uppercase">
                        VICERRECTORÍA BIENESTAR ESTUDIANTIL<br />
                        <span className="text-xs font-semibold">UNIVERSIDAD ADVENTISTA DEL PLATA</span>
                      </td>
                      <td className="w-36 p-2 font-black text-xs uppercase bg-slate-50">
                        CONTROL DE HORAS<br />
                        MENSUALES {anioActual}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Metadatos */}
                <div className="grid grid-cols-4 gap-2 text-xs border border-black p-2 bg-slate-50 font-semibold">
                  <div>Alumno: <b>{alumnoInforme.nombre}</b></div>
                  <div>Mes: <b>{nombresMeses[mesActual - 1]} / {anioActual}</b></div>
                  <div>Legajo: <b>{alumnoInforme.id}</b></div>
                  <div>Departamento: <b>Recursos Áulicos</b></div>
                </div>

                {/* Tabla de 31 días */}
                <table className="w-full border-collapse border border-black text-xs text-center">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black font-black">
                      <th className="p-1 border-r border-black w-10">Día</th>
                      <th className="p-1 border-r border-black">Entrada 1</th>
                      <th className="p-1 border-r border-black">Salida 1</th>
                      <th className="p-1 border-r border-black">Entrada 2</th>
                      <th className="p-1 border-r border-black">Salida 2</th>
                      <th className="p-1 border-r border-black w-16">Total</th>
                      <th className="p-1 border-r border-black text-left pl-2">Observación</th>
                      <th className="p-1 w-24">Firma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => {
                      const diaStr = dia < 10 ? `0${dia}` : `${dia}`;
                      const mesStr = mesActual < 10 ? `0${mesActual}` : `${mesActual}`;
                      const fechaComparar = `${anioActual}-${mesStr}-${diaStr}`;
                      const jornadaDia = jornadasInforme.find((j) => j.fecha === fechaComparar);

                      return (
                        <tr key={dia} className="border-b border-black/30 h-6">
                          <td className="border-r border-black font-bold bg-slate-50">{dia}</td>
                          <td className="border-r border-black font-mono">
                            {jornadaDia?.entrada_1?.slice(0, 5) || ''}
                          </td>
                          <td className="border-r border-black font-mono">
                            {jornadaDia?.salida_1?.slice(0, 5) || ''}
                          </td>
                          <td className="border-r border-black font-mono">
                            {jornadaDia?.entrada_2?.slice(0, 5) || ''}
                          </td>
                          <td className="border-r border-black font-mono">
                            {jornadaDia?.salida_2?.slice(0, 5) || ''}
                          </td>
                          <td className="border-r border-black font-mono font-bold">
                            {jornadaDia ? `${jornadaDia.total_decimal} hs` : ''}
                          </td>
                          <td className="border-r border-black text-left pl-2 italic text-[11px] truncate max-w-[140px]">
                            {jornadaDia?.observacion || ''}
                          </td>
                          <td className="border-black"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black bg-slate-100 font-black">
                      <td colSpan={5} className="p-2 border-r border-black text-right pr-4">
                        Total del Mes:
                      </td>
                      <td className="p-2 border-r border-black font-mono text-sm">
                        {jornadasInforme
                          .reduce((acc, cur) => acc + (Number(cur.total_decimal) || 0), 0)
                          .toFixed(2)}{' '}
                        hs
                      </td>
                      <td className="border-r border-black"></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Pie de Firma Oficial */}
                <div className="pt-8 flex justify-end">
                  <div className="text-center w-64 border-t border-black pt-2">
                    <p className="font-black text-sm">Rafael Carro</p>
                    <p className="text-xs uppercase font-extrabold text-slate-600">
                      RECURSOS ÁULICOS
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          PESTAÑA 7: EVALUACIÓN CUATRIMESTRAL BECUAP (A4 LANDSCAPE)
      ============================================================================ */}
      {tab === 'evaluacion' && rol !== 'alumno' && (
        <div className="space-y-6">
          <div className="no-print bg-white rounded-3xl p-6 shadow-uap border border-uap-borde space-y-4">
            <h2 className="text-base font-black text-uap-azul flex items-center gap-2">
              <Award className="w-5 h-5 text-uap-azul-medio" />
              <span>Evaluación Cuatrimestral Becuap</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
                  Legajo del Alumno
                </label>
                <input
                  type="text"
                  value={legajoEval}
                  onChange={(e) => setLegajoEval(e.target.value)}
                  placeholder="N° Legajo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
                  Cuatrimestre
                </label>
                <select
                  value={cuatrimestreEval}
                  onChange={(e) => {
                    const c = Number(e.target.value) as 1 | 2;
                    setCuatrimestreEval(c);
                    setMesEval(c === 1 ? 'marzo' : 'julio');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value={1}>1º Cuatrimestre (Marzo - Junio)</option>
                  <option value={2}>2º Cuatrimestre (Julio - Noviembre)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-uap-texto uppercase mb-1">
                  Mes a Calificar
                </label>
                <select
                  value={mesEval}
                  onChange={(e) => handleCambioMesEval(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase"
                >
                  {mesesCuatrimestre.map((m) => (
                    <option key={m} value={m}>
                      {m.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleBuscarEvaluacion}
                disabled={cargandoEval}
                className="w-full py-2.5 px-4 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase rounded-xl transition-all"
              >
                {cargandoEval ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar Alumno'}
              </button>
            </div>
          </div>

          {alumnoEval && (
            <div className="space-y-6">
              {/* Formulario de Notas (Oculto en Impresión) */}
              <div className="no-print bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-uap-azul">
                      Calificación: {alumnoEval.nombre}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Inicio en el Plan: <b>{inicioPlanEval}</b> • Promedio Actual:{' '}
                      <b className="text-emerald-600 font-extrabold">
                        {evalData?.promedio || 'Sin notas'}
                      </b>
                    </p>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-uap-azul text-xs font-bold rounded-xl"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir A4 Horizontal</span>
                  </button>
                </div>

                {msgEval && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                    {msgEval}
                  </div>
                )}

                <p className="text-xs text-slate-400 font-semibold">
                  Asigná la nota del 1 al 10 para cada criterio en{' '}
                  <b className="text-uap-azul uppercase">{mesEval}</b>:
                </p>

                <div className="space-y-3">
                  {criteriosEvaluacion.map((criterio, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <span className="text-xs font-extrabold text-uap-texto">
                        {i + 1}. {criterio}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={notasInputs[i]}
                        onChange={(e) => {
                          const copia = [...notasInputs];
                          copia[i] = e.target.value ? Number(e.target.value) : '';
                          setNotasInputs(copia);
                        }}
                        placeholder="1-10"
                        className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center text-sm font-black text-uap-azul"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Observación del Mes ({mesEval.toUpperCase()})
                    </label>
                    <textarea
                      value={obsMesInput}
                      onChange={(e) => setObsMesInput(e.target.value)}
                      rows={2}
                      placeholder="Observaciones de este mes..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Observación General (Fin de Cuatrimestre)
                    </label>
                    <textarea
                      value={obsGeneralInput}
                      onChange={(e) => setObsGeneralInput(e.target.value)}
                      rows={2}
                      placeholder="Se imprime al pie de la planilla..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGuardarEvaluacionMes}
                  disabled={guardandoEval}
                  className="w-full py-3.5 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {guardandoEval ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Guardar Evaluación de {mesEval.toUpperCase()}</span>
                </button>
              </div>

              {/* Planilla de Impresión Oficial A4 Landscape */}
              <div className="print-page-landscape bg-white p-4 border border-black space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://i.postimg.cc/fyMcjMcn/logo-uap.png"
                      alt="UAP"
                      className="w-12 h-auto"
                    />
                    <div className="text-left">
                      <b className="text-xs uppercase block">Vicerrectoría Bienestar Estudiantil</b>
                      <i className="text-[11px] text-slate-700">Universidad Adventista del Plata</i>
                    </div>
                  </div>

                  <div className="text-center font-black text-sm uppercase tracking-wide">
                    EVALUACIÓN - PLAN BECUAP - {anioActual}
                  </div>

                  <div className="text-right text-[11px]">
                    DEPARTAMENTO: <b>Recursos Áulicos</b>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs border border-black p-1.5 bg-slate-50 font-bold">
                  <div>Alumno: <u>{alumnoEval.nombre}</u></div>
                  <div>N° Legajo: <u>{alumnoEval.id}</u></div>
                  <div>Inicio Plan: <u>{inicioPlanEval}</u></div>
                  <div>Promedio: <u>{evalData?.promedio || '.../.../...'}</u></div>
                </div>

                {/* Tabla Dinámica con Subcolumnas (Excelente, Muy Bueno, Bueno, Regular) */}
                <table className="w-full border-collapse border border-black text-[10px] text-center">
                  <thead>
                    <tr className="border-b border-black bg-slate-100 font-black">
                      <th rowSpan={2} className="border-r border-black p-1 text-left w-56">
                        CRITERIOS DE EVALUACIÓN
                      </th>
                      {mesesCuatrimestre.map((m) => (
                        <th key={m} colSpan={4} className="border-r border-black p-1 uppercase">
                          {m}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-black text-[8px] font-bold bg-slate-50">
                      {mesesCuatrimestre.map((m) => (
                        <React.Fragment key={m}>
                          <th className="border-r border-black p-0.5">EXCELENTE<br />(10)</th>
                          <th className="border-r border-black p-0.5">MUY BUENO<br />(9-8)</th>
                          <th className="border-r border-black p-0.5">BUENO<br />(6-7)</th>
                          <th className="border-r border-black p-0.5">REGULAR<br />(&le;5)</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criteriosEvaluacion.map((criterio, critIdx) => (
                      <tr key={critIdx} className="border-b border-black h-5">
                        <td className="border-r border-black text-left pl-1 font-semibold">
                          {criterio}
                        </td>
                        {mesesCuatrimestre.map((m) => {
                          const mesData = evalData
                            ? ((evalData as any)[m] as MesEvaluacionData | null)
                            : null;
                          const nota =
                            mesData && Array.isArray(mesData.notas) ? mesData.notas[critIdx] : null;

                          return (
                            <React.Fragment key={m}>
                              <td className="border-r border-black font-black text-xs">
                                {nota === 10 ? 10 : ''}
                              </td>
                              <td className="border-r border-black font-black text-xs">
                                {nota === 9 || nota === 8 ? nota : ''}
                              </td>
                              <td className="border-r border-black font-black text-xs">
                                {nota === 7 || nota === 6 ? nota : ''}
                              </td>
                              <td className="border-r border-black font-black text-xs">
                                {nota !== null && nota <= 5 ? nota : ''}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}

                    <tr className="border-b border-black h-5">
                      <td className="border-r border-black text-left pl-1">Informe IASD:</td>
                      <td colSpan={mesesCuatrimestre.length * 4} className="border-black"></td>
                    </tr>
                    <tr className="border-b border-black h-5">
                      <td className="border-r border-black text-left pl-1">Informe académico:</td>
                      <td colSpan={mesesCuatrimestre.length * 4} className="border-black"></td>
                    </tr>
                    <tr className="border-b border-black h-5">
                      <td className="border-r border-black text-left pl-1">Informe de conducta:</td>
                      <td colSpan={mesesCuatrimestre.length * 4} className="border-black"></td>
                    </tr>

                    <tr className="border-b border-black text-[9px] align-top">
                      <td className="border-r border-black text-left p-1">
                        <b>OBSERVACIONES GENERALES:</b><br />
                        <span>{evalData?.obs_general || obsGeneralInput || ''}</span>
                      </td>
                      {mesesCuatrimestre.map((m) => {
                        const mesData = evalData
                          ? ((evalData as any)[m] as MesEvaluacionData | null)
                          : null;
                        return (
                          <td
                            key={m}
                            colSpan={4}
                            className="border-r border-black p-1 text-left text-[8px]"
                          >
                            <i>Firma jefe:</i><br /><br />
                            <i>Firma alumno:</i><br /><br />
                            <i>Obs:</i> {mesData?.observacion || ''}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
