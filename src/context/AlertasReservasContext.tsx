'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { obtenerReservasPorDiaAction } from '@/app/actions/reservas';
import { DiaSemana, ReservaMatriz } from '@/lib/types/database.types';
import { Bell, X } from 'lucide-react';

interface AlertaItem {
  id: string;
  profesor: string;
  aula: string;
  recurso: string;
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

  const pedirPermisoNotificaciones = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const getDiaSemanaActual = (): DiaSemana | null => {
    const dias: (DiaSemana | null)[] = [
      null, // Domingo
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      null, // Sábado
    ];
    const index = new Date().getDay();
    return dias[index] || null;
  };

  const calcularMinutosFaltantes = (horaInicioStr: string, ahora: Date): number => {
    const partes = horaInicioStr.split(':');
    const horaObj = new Date(ahora);
    horaObj.setHours(parseInt(partes[0], 10), parseInt(partes[1], 10), 0, 0);
    return Math.round((horaObj.getTime() - ahora.getTime()) / 60000);
  };

  const revisarAlertas = async () => {
    const diaActual = getDiaSemanaActual();
    if (!diaActual) return;

    const res = await obtenerReservasPorDiaAction(diaActual);
    if (!res.ok || !res.data) return;

    const ahora = new Date();

    for (const r of res.data) {
      if (r.estado !== 'Pendiente') continue;

      const minutos = calcularMinutosFaltantes(r.hora_inicio, ahora);

      if ([15, 10, 5].includes(minutos)) {
        const clave = `${r.id}-${minutos}`;
        if (!alertasMostradasRef.current[clave]) {
          alertasMostradasRef.current[clave] = true;

          const texto = `${r.profesor_nombre} - ${r.aula} / ${r.recurso} comienza en ${minutos} minutos`;

          // 1. Notificación Nativa del Navegador
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🔔 Reserva próxima - Recursos Áulicos UAP', {
                body: texto,
                icon: 'https://i.postimg.cc/fyMcjMcn/logo-uap.png',
              });
            } catch (e) {
              console.warn('Error al disparar notificación web:', e);
            }
          }

          // 2. Modal Emergente en el DOM
          setAlertaModal({
            id: r.id,
            profesor: r.profesor_nombre,
            aula: r.aula,
            recurso: r.recurso,
            minutos,
          });
        }
      }
    }
  };

  useEffect(() => {
    pedirPermisoNotificaciones();
    revisarAlertas();

    const intervalo = setInterval(() => {
      revisarAlertas();
    }, 60000); // Cada 1 minuto

    return () => clearInterval(intervalo);
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
              Reserva en {alertaModal.minutos} minutos
            </h2>

            <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1.5">
              <p className="text-sm font-extrabold text-uap-texto">
                Profesor: <span className="text-uap-azul">{alertaModal.profesor}</span>
              </p>
              <p className="text-xs font-bold text-slate-600">
                Aula: <span className="text-slate-800">{alertaModal.aula}</span>
              </p>
              <p className="text-xs font-bold text-slate-600">
                Recurso: <span className="text-emerald-700">{alertaModal.recurso}</span>
              </p>
            </div>

            <p className="text-xs text-slate-500 mb-6 font-medium">
              Por favor prepará y entregá el equipamiento correspondiente en Bedelía.
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
