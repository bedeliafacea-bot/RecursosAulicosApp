'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import {
  diasDelMes,
  fechaHoyAR,
  parsearRangoPactado,
  sumarDias,
  formatearMinutos,
  mesAnioActualAR,
  metaHorasMensual,
  minutosDeRegistro,
  totalMinutosJornadas,
} from '@/lib/horas';
import './planillas.css';

export default function AlumnosPage() {
  const { rol, user, perfil } = useAuth();
  // Fecha en hora argentina: toISOString() daba el día siguiente después de las 21:00
  const fechaHoy = fechaHoyAR();

  // Mes y Año dinámico (sin hardcodeo de 2026)
  const [mesActual, setMesActual] = useState(() => mesAnioActualAR().mes);
  const [anioActual, setAnioActual] = useState(() => mesAnioActualAR().anio);

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
      pactado: string; // rango pactado para esa fecha (informativo)
    }>
  >([{ fecha: fechaHoy, e1: '07:30', s1: '11:30', e2: '', s2: '', obs: '', pactado: '' }]);
  // Horarios pactados del alumno validado: fecha -> rango, y meses ya consultados
  const pactadosCargaRef = useRef<Record<string, string>>({});
  const mesesPactadosRef = useRef<Set<string>>(new Set());
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

  // Calcular horas acumuladas y meta según plan.
  // Se suman minutos enteros (no decimales redondeados a 2 cifras: 3 × 0.33 h ≠ 1 h).
  const metaHoras = metaHorasMensual(alumnoFicha?.plan, anioActual, mesActual);
  const totalMinutosFicha = totalMinutosJornadas(jornadasFicha);
  const totalHorasHHMM = formatearMinutos(totalMinutosFicha);
  const porcentajeAvance = Math.min(
    Math.round((totalMinutosFicha / (metaHoras * 60)) * 100),
    100
  );
  const minutosRestantesMeta = metaHoras * 60 - totalMinutosFicha;

  // Al cambiar mes/año, recargar lo que ya estaba consultado (antes había que volver a "Consultar")
  const primerRenderMesRef = useRef(true);
  useEffect(() => {
    if (primerRenderMesRef.current) {
      primerRenderMesRef.current = false;
      return;
    }
    if (alumnoFicha) handleBuscarFicha(alumnoFicha.id);
    if (alumnoInforme) {
      listarJornadasAlumnoAction(alumnoInforme.id, mesActual, anioActual).then((res) =>
        setJornadasInforme(res.ok && res.data ? res.data : [])
      );
    }
    if (legajoEditar.trim() && tab === 'editar') handleBuscarEditar();
  }, [mesActual, anioActual]);

  // ============================================================================
  // HANDLERS: CARGA DE JORNADAS
  // ============================================================================
  type FilaJornada = (typeof jornadasInput)[number];

  // Trae (una sola vez por mes) los horarios pactados del alumno para esa fecha
  const cargarPactadosDelMes = async (alumnoId: string, fecha: string) => {
    const [anio, mes] = fecha.split('-').map(Number);
    const clave = `${alumnoId}-${anio}-${mes}`;
    if (!anio || !mes || mesesPactadosRef.current.has(clave)) return;
    mesesPactadosRef.current.add(clave);
    const res = await obtenerHorariosPactadosAction(alumnoId, mes, anio);
    if (res.ok && res.data) {
      for (const h of res.data) pactadosCargaRef.current[h.fecha] = h.rango_horario;
    }
  };

  // Si la fecha tiene horario pactado, completa los turnos con ese horario
  const aplicarPactado = (fila: FilaJornada): FilaJornada => {
    const rango = pactadosCargaRef.current[fila.fecha] || '';
    const turnos = rango ? parsearRangoPactado(rango) : null;
    return turnos ? { ...fila, ...turnos, pactado: rango } : { ...fila, pactado: rango };
  };

  const handleValidarLegajoCarga = async () => {
    if (!legajoCarga.trim()) return;
    setValidandoCarga(true);
    setErrorValidarCarga('');
    setAlumnoCarga(null);

    const res = await buscarInfoAlumnoAction(legajoCarga);
    if (res.ok && res.data) {
      const alumnoId = res.data.id;
      pactadosCargaRef.current = {};
      mesesPactadosRef.current = new Set();
      await Promise.all(jornadasInput.map((j) => cargarPactadosDelMes(alumnoId, j.fecha)));
      setJornadasInput((prev) => prev.map(aplicarPactado));
      setAlumnoCarga(res.data);
    } else {
      setErrorValidarCarga('Legajo no encontrado en base de datos.');
    }
    setValidandoCarga(false);
  };

  // Nueva fila = copia de la anterior con el día siguiente (o su horario pactado)
  const handleAgregarFilaJornada = async () => {
    const ultima = jornadasInput[jornadasInput.length - 1];
    const base: FilaJornada = ultima
      ? { ...ultima, fecha: ultima.fecha ? sumarDias(ultima.fecha, 1) : fechaHoy, obs: '' }
      : { fecha: fechaHoy, e1: '07:30', s1: '11:30', e2: '', s2: '', obs: '', pactado: '' };
    if (alumnoCarga) await cargarPactadosDelMes(alumnoCarga.id, base.fecha);
    const nuevaFila = aplicarPactado(base);
    setJornadasInput((prev) => [...prev, nuevaFila]);
    // Foco en la fecha de la fila nueva para seguir cargando con el teclado
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-fecha-jornada]');
      inputs[inputs.length - 1]?.focus();
    }, 0);
  };

  const handleCambioFechaJornada = async (idx: number, fecha: string) => {
    setJornadasInput((prev) => prev.map((j, i) => (i === idx ? { ...j, fecha } : j)));
    if (!alumnoCarga || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
    await cargarPactadosDelMes(alumnoCarga.id, fecha);
    setJornadasInput((prev) =>
      prev.map((j, i) => (i === idx && j.fecha === fecha ? aplicarPactado(j) : j))
    );
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

    const payload = jornadasInput.map((j) => ({
      fecha: j.fecha,
      entrada_1: j.e1 || null,
      salida_1: j.s1 || null,
      entrada_2: j.e2 || null,
      salida_2: j.s2 || null,
      observacion: j.obs || null,
    }));

    let res = await registrarJornadasBatchAction(alumnoCarga.id, payload);

    if (!res.ok && res.fechasDuplicadas) {
      const lista = res.fechasDuplicadas
        .map((f) => f.split('-').reverse().join('/'))
        .join(', ');
      if (
        !confirm(
          `${alumnoCarga.nombre} ya tiene jornada cargada (o repetida en esta carga) el: ${lista}.\n\n¿Guardar igual?`
        )
      ) {
        setGuardandoCarga(false);
        return;
      }
      res = await registrarJornadasBatchAction(alumnoCarga.id, payload, true);
    }

    if (res.ok) {
      setMsgCarga('✅ ¡Jornadas registradas exitosamente!');
      setJornadasInput([
        aplicarPactado({ fecha: fechaHoy, e1: '07:30', s1: '11:30', e2: '', s2: '', obs: '', pactado: '' }),
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

  // ============================================================================
  // IMPRESIÓN DE PLANILLAS (A4 vertical / A4 apaisado)
  // ============================================================================
  // Datos que se imprimen en la evaluación: lo guardado + lo que está en el
  // formulario del mes actual aunque todavía no se haya guardado (igual que el legacy).
  const datosMesesEval: Record<string, MesEvaluacionData | null> = {};
  for (const m of mesesCuatrimestre) {
    datosMesesEval[m] =
      m === mesEval
        ? {
            notas: notasInputs.map((n) => (n === '' || isNaN(Number(n)) ? null : Number(n))),
            observacion: obsMesInput,
          }
        : evalData
        ? ((evalData as any)[m] as MesEvaluacionData | null)
        : null;
  }

  const modoImpresion: 'horas' | 'eval' | null =
    tab === 'informe' && alumnoInforme
      ? 'horas'
      : tab === 'evaluacion' && alumnoEval
      ? 'eval'
      : null;

  // Marca el <body> y la regla @page según la planilla visible, así también
  // funciona Ctrl+P sin pasar por el botón.
  useEffect(() => {
    if (!modoImpresion) return;
    const style = document.createElement('style');
    style.id = 'uap-page-style';
    style.textContent =
      modoImpresion === 'horas'
        ? '@media print { @page { size: A4 portrait; margin: 3mm; } }'
        : '@media print { @page { size: A4 landscape; margin: 5mm; } }';
    document.head.appendChild(style);
    document.body.dataset.impresion = modoImpresion;
    return () => {
      delete document.body.dataset.impresion;
      style.remove();
    };
  }, [modoImpresion]);

  const imprimirPlanilla = () => {
    setTimeout(() => window.print(), 150);
  };

  const planillaEval = alumnoEval ? (
    <PlanillaEvaluacion
      alumno={alumnoEval}
      anio={anioActual}
      inicioPlan={inicioPlanEval}
      promedio={evalData?.promedio ?? null}
      meses={mesesCuatrimestre}
      criterios={criteriosEvaluacion}
      datosMeses={datosMesesEval}
      obsGeneral={obsGeneralInput}
    />
  ) : null;

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

        {rol !== 'alumno' && (
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

                  <p
                    className={`text-[11px] font-extrabold ${
                      minutosRestantesMeta > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {minutosRestantesMeta > 0
                      ? `Faltan ${formatearMinutos(minutosRestantesMeta)} hs para la meta del mes`
                      : `Meta cumplida${
                          minutosRestantesMeta < 0
                            ? ` (+${formatearMinutos(-minutosRestantesMeta)} hs)`
                            : ''
                        }`}
                  </p>
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
                        data-fecha-jornada
                        value={j.fecha}
                        onChange={(e) => handleCambioFechaJornada(idx, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      />
                      {j.pactado && (
                        <span className="mt-1 inline-block text-[10px] font-bold text-uap-azul-medio">
                          Pactado: {j.pactado}
                        </span>
                      )}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && idx === jornadasInput.length - 1) {
                          e.preventDefault();
                          handleAgregarFilaJornada();
                        }
                      }}
                      placeholder="Tarea realizada (opcional) — Enter agrega otro día..."
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
                        {formatearMinutos(minutosDeRegistro(j))} hs
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
          PESTAÑA 4: PACTAR HORARIOS (Admin y Secretario)
      ============================================================================ */}
          {tab === 'pactar' && rol !== 'alumno' && (
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
          PESTAÑA 5: NUEVO ALUMNO (Admin y Secretario)
      ============================================================================ */}
          {tab === 'nuevo' && rol !== 'alumno' && (
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
                onClick={() => imprimirPlanilla()}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir A4</span>
              </button>
            )}
          </div>

          {alumnoInforme && (
            <div className="no-print bg-white rounded-3xl p-6 shadow-uap border border-uap-borde overflow-x-auto">
              <PlanillaHorasMensual
                alumno={alumnoInforme}
                jornadas={jornadasInforme}
                mes={mesActual}
                anio={anioActual}
              />
            </div>
          )}

          {alumnoInforme && (
            <PortalImpresion tipo="horas">
              <PlanillaHorasMensual
                alumno={alumnoInforme}
                jornadas={jornadasInforme}
                mes={mesActual}
                anio={anioActual}
              />
            </PortalImpresion>
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
                    onClick={() => imprimirPlanilla()}
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

              {/* Vista previa de la planilla oficial A4 apaisada */}
              <div className="no-print bg-white rounded-3xl p-6 shadow-uap border border-uap-borde overflow-x-auto">
                {planillaEval}
              </div>

              <PortalImpresion tipo="eval">
                {planillaEval}
              </PortalImpresion>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// PLANILLAS INSTITUCIONALES (réplica de proyectoviejo/Alumnos.html)
// Estilos en ./planillas.css
// ==============================================================================

const MESES_MAYUSCULA = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const LOGO_UAP = '/img/logo-uap.png';

/** Copia de la planilla montada directo en <body>: es lo único que se imprime. */
function PortalImpresion({ tipo, children }: { tipo: 'horas' | 'eval'; children: React.ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return createPortal(
    <div className="print-portal" data-tipo={tipo}>
      {children}
    </div>,
    document.body
  );
}

function PlanillaHorasMensual({
  alumno,
  jornadas,
  mes,
  anio,
}: {
  alumno: Alumno;
  jornadas: JornadaBecuap[];
  mes: number;
  anio: number;
}) {
  const ultimoDia = diasDelMes(anio, mes);
  const prefijoMes = `${anio}-${mes < 10 ? '0' + mes : mes}-`;
  const hora = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

  // Si hubiera dos registros el mismo día, se muestran los horarios del primero
  // pero el total y la observación incluyen ambos (el legacy descartaba el segundo).
  const porDia = new Map<number, JornadaBecuap[]>();
  for (const j of jornadas) {
    if (!j.fecha.startsWith(prefijoMes)) continue;
    const dia = parseInt(j.fecha.slice(8, 10), 10);
    porDia.set(dia, [...(porDia.get(dia) || []), j]);
  }

  return (
    <div className="planilla-horas">
      <table className="uap-header-table">
        <tbody>
          <tr>
            <td className="header-logo">
              <img src={LOGO_UAP} alt="UAP" />
            </td>
            <td className="header-title">
              VICERRECTORÍA BIENESTAR ESTUDIANTIL
              <br />
              UNIVERSIDAD ADVENTISTA DEL PLATA
            </td>
            <td className="header-control">
              CONTROL DE HORAS
              <br />
              MENSUALES {anio}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="info-line">
        <span>
          Alumno: <b>{alumno.nombre}</b>
        </span>
        <span>
          Mes: <b>{MESES_MAYUSCULA[mes - 1]}</b> / {anio}
        </span>
        <span>
          Legajo: <b>{alumno.id}</b>
        </span>
        <span>
          Departamento: <b>Recursos Áulicos</b>
        </span>
      </div>

      <table className="horas-table">
        <thead>
          <tr>
            <th className="col-dia">Día</th>
            <th className="col-hora">Entrada.</th>
            <th className="col-hora">Salida</th>
            <th className="col-hora">Entrada</th>
            <th className="col-hora">Salida</th>
            <th className="col-total">Total</th>
            <th>Observación</th>
            <th className="col-firma">Firma</th>
          </tr>
        </thead>
        <tbody>
          {/* 31 filas fijas para que la hoja mida siempre lo mismo; los días
              que no existen en el mes quedan en blanco. */}
          {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => {
            const registros = dia <= ultimoDia ? porDia.get(dia) || [] : [];
            const r = registros[0];
            return (
              <tr key={dia}>
                <td>{dia <= ultimoDia ? dia : ''}</td>
                <td>{hora(r?.entrada_1)}</td>
                <td>{hora(r?.salida_1)}</td>
                <td>{hora(r?.entrada_2)}</td>
                <td>{hora(r?.salida_2)}</td>
                <td>{r ? formatearMinutos(totalMinutosJornadas(registros)) : ''}</td>
                <td className="col-obs">
                  {Array.from(new Set(registros.map((x) => x.observacion).filter(Boolean))).join(' / ')}
                </td>
                <td></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="total-label">
              Total del Mes:
            </td>
            <td>{formatearMinutos(totalMinutosJornadas(jornadas))}</td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div className="bloque-firma-impresion">
        <div className="linea-firma"></div>
        <p className="nombre-firma">Rafael Carro</p>
        <p className="cargo-firma">RECURSOS ÁULICOS</p>
      </div>
    </div>
  );
}

const SUBCOLUMNAS_EVAL: Array<[string, string]> = [
  ['EXCELENTE', '(10)'],
  ['MUY BUENO', '(9-8)'],
  ['BUENO', '(6-7)'],
  ['REGULAR', '(5 o menos)'],
];

/** 10 -> EXCELENTE, 9-8 -> MUY BUENO, 7-6 -> BUENO, <=5 -> REGULAR. */
function subcolumnaNota(nota: number): number {
  if (nota === 10) return 0;
  if (nota >= 8) return 1;
  if (nota >= 6) return 2;
  return 3;
}

function PlanillaEvaluacion({
  alumno,
  anio,
  inicioPlan,
  promedio,
  meses,
  criterios,
  datosMeses,
  obsGeneral,
}: {
  alumno: Alumno;
  anio: number;
  inicioPlan: string;
  promedio: number | string | null;
  meses: string[];
  criterios: string[];
  datosMeses: Record<string, MesEvaluacionData | null>;
  obsGeneral: string;
}) {
  const columnasInforme = meses.length * 4;

  return (
    <div className="planilla-eval">
      <div className="eval-header">
        <div className="eval-logo">
          <img src={LOGO_UAP} alt="UAP" />
          <div>
            <b>Vicerrectoría Bienestar Estudiantil</b>
            <br />
            <i>Universidad Adventista del Plata</i>
          </div>
        </div>
        <div className="eval-titulo">EVALUACIÓN - PLAN BECUAP - {anio}</div>
      </div>

      <div className="eval-datos-alumno">
        <div>
          DEPARTAMENTO: <span className="linea-punto">Recursos Áulicos</span>
        </div>
        <div>
          Nombre del alumno: <span className="linea-punto">{alumno.nombre}</span> Nº:{' '}
          <span className="linea-punto">{alumno.id}</span>
        </div>
        <div>
          Fecha de inicio en el Plan: <span className="linea-punto">{inicioPlan}</span>
        </div>
        <div>
          Asistencia/horas: <span className="linea-punto"></span>
        </div>
        <div>
          Promedio: <span className="linea-punto">{promedio ?? '...../...../.....'}</span>
        </div>
      </div>

      <table className="tabla-evaluacion">
        <thead>
          <tr>
            <th rowSpan={2}>CRITERIOS DE EVALUACIÓN</th>
            {meses.map((m) => (
              <th key={m} colSpan={4}>
                {m.toUpperCase()}
              </th>
            ))}
          </tr>
          <tr className="sub-headers">
            {meses.map((m) => (
              <React.Fragment key={m}>
                {SUBCOLUMNAS_EVAL.map(([nombre, rango]) => (
                  <th key={nombre}>
                    {nombre}
                    <br />
                    {rango}
                  </th>
                ))}
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {criterios.map((criterio, i) => (
            <tr key={criterio}>
              <td className="text-left">{criterio}</td>
              {meses.map((m) => {
                const nota = datosMeses[m]?.notas?.[i];
                const col = typeof nota === 'number' && nota > 0 ? subcolumnaNota(nota) : -1;
                return (
                  <React.Fragment key={m}>
                    {[0, 1, 2, 3].map((k) => (
                      <td key={k} className={k === col ? 'nota' : undefined}>
                        {k === col ? nota : ''}
                      </td>
                    ))}
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="text-left">Informe IASD:</td>
            <td colSpan={columnasInforme}></td>
          </tr>
          <tr>
            <td className="text-left">Informe académico:</td>
            <td colSpan={columnasInforme}></td>
          </tr>
          <tr>
            <td className="text-left">Informe de conducta:</td>
            <td colSpan={columnasInforme}></td>
          </tr>
          <tr className="fila-firmas">
            <td className="text-left">
              <b>OBSERVACIONES GENERALES:</b>
              <br />
              <br />
              <span>{obsGeneral}</span>
            </td>
            {meses.map((m) => (
              <td key={m} colSpan={4}>
                <i>Firma del jefe:</i>
                <br />
                <br />
                <br />
                <i>Firma del alumno:</i>
                <br />
                <br />
                <br />
                <i>Obs:</i>
                <br />
                <span>{datosMeses[m]?.observacion || ''}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
