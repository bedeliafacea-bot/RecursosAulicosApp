'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  obtenerReservasEspecialesPorFechaAction,
  obtenerReservasPorDiaAction,
} from '@/app/actions/reservas';
import { DiaSemana } from '@/lib/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { fechaHoyAR } from '@/lib/horas';
import { Bell, X } from 'lucide-react';

// Avisos antes del inicio de cada reserva, de mayor a menor
const AVISOS_MINUTOS = [15, 10, 5];

interface AlertaItem {
  id: string;
  tipo: 'matriz' | 'especial';
  profesor?: string;
  aula?: string;
  recurso?: string;
  departamento?: string;
  equipo?: string;
  minutos: number;
}

interface AlertasContextType {
  pedirPermisoNotificaciones: () => void;
  alertaModal: AlertaItem | null;
  cerrarModalAlerta: () => void;
}

const AlertasReservasContext = createContext<AlertasContextType>({
  pedirPermisoNotificaciones: () => {},
  alertaModal: null,
  cerrarModalAlerta: () => {},
});

export function AlertasReservasProvider({ children }: { children: React.ReactNode }) {
  const [alertaModal, setAlertaModal] = useState<AlertaItem | null>(null);
  const alertasMostradasRef = useRef<Record<string, boolean>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);

  const pedirPermisoNotificaciones = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const getDiaSemanaActual = (fecha: string): DiaSemana | null => {
    const dias: (DiaSemana | null)[] = [
      null, // Domingo
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      null, // Sábado
    ];
    const index = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return dias[index] || null;
  };

  const calcularMinutosFaltantesArgentina = (fecha: string, hora: string, ahora: Date) => {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [horaInicio, minutoInicio] = hora.split(':').map(Number);
    const partesAhora = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(ahora)
      .reduce<Record<string, number>>((partes, parte) => {
        if (parte.type !== 'literal') partes[parte.type] = Number(parte.value);
        return partes;
      }, {});

    const inicio = Date.UTC(anio, mes - 1, dia, horaInicio, minutoInicio);
    const ahoraArgentina = Date.UTC(
      partesAhora.year,
      partesAhora.month - 1,
      partesAhora.day,
      partesAhora.hour,
      partesAhora.minute,
      partesAhora.second
    );
    return Math.round((inicio - ahoraArgentina) / 60000);
  };

  const mostrarAlerta = (
    alerta: Omit<AlertaItem, 'minutos'>,
    minutos: number,
    claveReserva: string,
    texto: string
  ) => {
    // Ventanas en lugar de minutos exactos: si una revisión se atrasa no se
    // pierde el aviso de 15, 10 o 5 minutos.
    const ventana = AVISOS_MINUTOS.find((v, i) => minutos <= v && minutos > (AVISOS_MINUTOS[i + 1] ?? 0));
    if (ventana === undefined) return;

    const clave = `${claveReserva}-${ventana}`;
    if (alertasMostradasRef.current[clave]) return;
    alertasMostradasRef.current[clave] = true;
    sonarAviso();

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔔 Reserva próxima - Recursos Áulicos UAP', {
          body: texto,
          icon: '/img/logo-uap.png',
        });
      } catch (e) {
        console.warn('Error al disparar notificación web:', e);
      }
    }

    setAlertaModal({ ...alerta, minutos });
  };

  const calcularMinutosFaltantes = (horaInicioStr: string, ahora: Date): number => {
    const partes = horaInicioStr.split(':');
    const horaObj = new Date(ahora);
    horaObj.setHours(parseInt(partes[0], 10), parseInt(partes[1], 10), 0, 0);
    return Math.round((horaObj.getTime() - ahora.getTime()) / 60000);
  };

  const revisarAlertas = async () => {
    const fechaActual = fechaHoyAR();
    const diaActual = getDiaSemanaActual(fechaActual);
    const [resMatriz, resEspeciales] = await Promise.all([
      diaActual ? obtenerReservasPorDiaAction(diaActual) : Promise.resolve(null),
      obtenerReservasEspecialesPorFechaAction(fechaActual),
    ]);
    if (resMatriz && !resMatriz.ok) {
      console.warn('No se pudieron revisar las alertas de reservas de matriz:', resMatriz.error);
    }
    if (!resEspeciales.ok) {
      console.warn('No se pudieron revisar las alertas de reservas especiales:', resEspeciales.error);
    }

    const ahora = new Date();

    for (const r of resMatriz?.data || []) {
      if (r.estado !== 'Pendiente') continue;

      const minutos = calcularMinutosFaltantes(r.hora_inicio, ahora);
      mostrarAlerta(
        {
          id: r.id,
          tipo: 'matriz',
          profesor: r.profesor_nombre,
          aula: r.aula,
          recurso: r.recurso,
        },
        minutos,
        `matriz-${r.id}`,
        `${r.profesor_nombre} - ${r.aula} / ${r.recurso} comienza en ${minutos} minutos`
      );
    }

    for (const reserva of resEspeciales.data || []) {
      if (reserva.entregado || reserva.devuelto) continue;
      const horaInicio = reserva.horario.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      if (!horaInicio) continue;

      const hora = `${horaInicio[1].padStart(2, '0')}:${horaInicio[2]}`;
      const minutos = calcularMinutosFaltantesArgentina(fechaActual, hora, ahora);
      mostrarAlerta(
        {
          id: reserva.id,
          tipo: 'especial',
          departamento: reserva.departamento,
          equipo: reserva.equipo,
        },
        minutos,
        `especial-${reserva.id}`,
        `${reserva.departamento} - ${reserva.equipo} comienza en ${minutos} minutos`
      );
    }
  };

  // Dos tonos cortos con Web Audio (sin archivos). El navegador solo permite
  // sonido después de una interacción, por eso el contexto se crea en el primer clic.
  const sonarAviso = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    [0, 0.25].forEach((inicio, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1175;
      const t = ctx.currentTime + inicio;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  };

  useEffect(() => {
    pedirPermisoNotificaciones();
    revisarAlertas();

    const habilitarAudio = () => {
      if (!audioCtxRef.current && typeof window !== 'undefined' && 'AudioContext' in window) {
        audioCtxRef.current = new AudioContext();
      }
    };
    window.addEventListener('pointerdown', habilitarAudio, { once: true });
    window.addEventListener('keydown', habilitarAudio, { once: true });

    const intervalo = setInterval(() => {
      revisarAlertas();
    }, 30000); // Cada 30 segundos

    // Reservas nuevas o modificadas se revisan al instante (Supabase Realtime)
    const supabase = createClient();
    const channel = supabase
      .channel('realtime_alertas_reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas_matriz' }, () => {
        revisarAlertas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas_especiales' }, () => {
        revisarAlertas();
      })
      .subscribe();

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('pointerdown', habilitarAudio);
      window.removeEventListener('keydown', habilitarAudio);
      supabase.removeChannel(channel);
    };
  }, []);

  const cerrarModalAlerta = () => {
    setAlertaModal(null);
  };

  return (
    <AlertasReservasContext.Provider
      value={{
        pedirPermisoNotificaciones,
        alertaModal,
        cerrarModalAlerta,
      }}
    >
      {children}

      {/* Modal Global Emergente de Alerta de Reserva */}
      {alertaModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center relative animate-in zoom-in-95">
            <button
              onClick={cerrarModalAlerta}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10 animate-bounce">
              <Bell className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-black rounded-full uppercase tracking-wider border border-amber-200 mb-2">
              Aviso de Inicio Inminente
            </span>

            <h2 className="text-2xl font-black text-uap-azul mb-2">
              {alertaModal.tipo === 'especial' ? 'Reserva especial' : 'Reserva'} en {alertaModal.minutos} minutos
            </h2>

            <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1.5">
              {alertaModal.tipo === 'especial' ? (
                <>
                  <p className="text-sm font-extrabold text-uap-texto">
                    Departamento: <span className="text-uap-azul">{alertaModal.departamento}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    Equipo: <span className="text-emerald-700">{alertaModal.equipo}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-extrabold text-uap-texto">
                    Profesor: <span className="text-uap-azul">{alertaModal.profesor}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    Aula: <span className="text-slate-800">{alertaModal.aula}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    Recurso: <span className="text-emerald-700">{alertaModal.recurso}</span>
                  </p>
                </>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-6 font-medium">
              {alertaModal.tipo === 'especial'
                ? 'Por favor prepará el equipo solicitado para el departamento.'
                : 'Por favor prepará y entregá el equipamiento correspondiente en Bedelía.'}
            </p>

            <button
              onClick={cerrarModalAlerta}
              className="w-full py-3 px-6 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-uap-azul/20 transition-all active:scale-[0.99]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </AlertasReservasContext.Provider>
  );
}

export function useAlertasReservas() {
  return useContext(AlertasReservasContext);
}
