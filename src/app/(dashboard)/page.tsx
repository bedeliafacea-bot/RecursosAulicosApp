'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Calendar,
  DollarSign,
  Gift,
  Tv,
  Users,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  X,
  DatabaseBackup,
} from 'lucide-react';
import PlanoSecundario from '@/components/plano/PlanoSecundario';
import { obtenerCumpleanosProximosAction, Cumpleanero } from '@/app/actions/cumpleanos';

export default function HomePage() {
  const { perfil, rol } = useAuth();
  const [modalPlanoOpen, setModalPlanoOpen] = useState(false);
  const [cumpleaneros, setCumpleaneros] = useState<Cumpleanero[]>([]);

  useEffect(() => {
    const fetchCumples = async () => {
      const res = await obtenerCumpleanosProximosAction();
      if (res.ok && res.data) {
        setCumpleaneros(res.data.slice(0, 3)); // Primeros 3 para el widget
      }
    };
    fetchCumples();
  }, []);

  const modulos = [
    {
      titulo: 'Alumnos',
      desc: 'Consultá fichas y progreso; gestioná jornadas y horarios según tu perfil.',
      href: '/alumnos',
      icono: GraduationCap,
      color: 'from-blue-600 to-uap-azul',
      roles: ['admin', 'secretario', 'alumno'],
    },
    {
      titulo: 'Fotocopias',
      desc: 'Consumos de fotocopias por departamento, cobros en efectivo e informes.',
      href: '/oficina',
      icono: FileText,
      color: 'from-indigo-600 to-uap-azul',
      roles: ['admin', 'secretario', 'alumno'],
    },
    {
      titulo: 'Reservas',
      desc: 'Cronograma semanal IAP Mañana y UAP Tarde, proyectores y equipos.',
      href: '/reservas',
      icono: Calendar,
      color: 'from-sky-600 to-blue-800',
      roles: ['admin', 'secretario', 'alumno'],
    },
    {
      titulo: 'Control y Cierre de Caja',
      desc: 'Recibos numerados, Mercado Pago, Banco Galicia y balance diario.',
      href: '/facturacion',
      icono: DollarSign,
      color: 'from-amber-600 to-orange-700',
      roles: ['admin', 'secretario'],
    },
    {
      titulo: 'Próximos Cumpleaños',
      desc: 'Becarios que cumplen años en los próximos 15 días.',
      href: '/cumpleanos',
      icono: Gift,
      color: 'from-rose-600 to-pink-700',
      roles: ['admin', 'secretario', 'alumno'],
    },
    {
      titulo: 'Gestión de Usuarios',
      desc: 'Administración de accesos, roles y contraseñas del personal.',
      href: '/usuarios',
      icono: Users,
      color: 'from-purple-600 to-indigo-900',
      roles: ['admin'],
    },
    {
      titulo: 'Respaldo mensual',
      desc: 'Archiva los registros operativos en Google Drive y limpia el mes seleccionado.',
      href: '/respaldo',
      icono: DatabaseBackup,
      color: 'from-emerald-600 to-teal-800',
      roles: ['admin'],
    },
  ];

  const modulosPermitidos = modulos.filter(
    (m) => !rol || m.roles.includes(rol)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Portada Institucional */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-r from-uap-azul via-uap-azul-oscuro to-uap-azul-profundo text-white p-8 md:p-12 border border-white/20">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url('/img/universidad-adventista-del-plata.jpg')`,
          }}
        />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-blue-200 text-xs font-black rounded-full uppercase tracking-wider border border-white/10 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistema Institucional Bedelía</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Recursos Áulicos
          </h1>

          <p className="text-white/80 text-sm md:text-base leading-relaxed">
            Bienvenido, <b className="text-white">{perfil?.nombre || 'Usuario'}</b>. Desde este panel podés gestionar la asistencia de alumnos becarios, las reservas de equipamiento áulico y los balances diarios.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Rol activo: <b className="text-white uppercase">{rol || '...'}</b></span>
            </span>

            <button
              onClick={() => setModalPlanoOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-md transition-all"
            >
              <Tv className="w-4 h-4" />
              <span>Ver Plano Secundario Realtime</span>
            </button>
          </div>
        </div>
      </div>

      {/* Widget Cumpleaños Rápidos si hay */}
      {cumpleaneros.length > 0 && (
        cumpleaneros.some((c) => c.esHoy) ? (
          <div className="p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl text-white shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
                🎂
              </div>
              <div>
                <div className="text-xs uppercase font-black tracking-widest text-white/80">
                  ¡Festejo Especial Hoy!
                </div>
                <h3 className="text-xl md:text-2xl font-black">
                  {cumpleaneros.filter((c) => c.esHoy).map((c) => c.nombre).join(', ')}
                </h3>
                <p className="text-xs text-white/90 mt-0.5">
                  ¡No te olvides de saludarlo en su jornada de hoy en Bedelía!
                </p>
              </div>
            </div>
            <Sparkles className="w-8 h-8 text-amber-200 hidden sm:block animate-pulse" />
          </div>
        ) : (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-3xl p-5 border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center text-lg">
                🎂
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900">
                  Próximos Cumpleaños de Becarios
                </h4>
                <p className="text-xs text-rose-700">
                  {cumpleaneros.map((c) => `${c.nombre} (${c.fechaTexto})`).join(' • ')}
                </p>
              </div>
            </div>
            <a
              href="/cumpleanos"
              className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )
      )}

      {/* Grid de Tarjetas Principales según Rol */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-uap-azul tracking-tight">
            Módulos del Sistema
          </h2>
          <span className="text-xs text-uap-gris font-bold">
            Accesos habilitados según tu perfil
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulosPermitidos.map((m) => {
            const Icon = m.icono;
            return (
              <a
                key={m.titulo}
                href={m.href}
                className="group bg-white rounded-3xl p-6 shadow-uap border border-uap-borde hover:border-uap-azul-medio/50 hover:shadow-2xl transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-uap-texto group-hover:text-uap-azul transition-colors">
                    {m.titulo}
                  </h3>
                  <p className="text-xs text-uap-gris mt-1.5 leading-relaxed font-medium">
                    {m.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-uap-azul-medio group-hover:text-uap-azul">
                  <span>Acceder al módulo</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Modal Plano Secundario en Vivo */}
      {modalPlanoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-6xl w-full shadow-2xl border border-slate-100 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-uap-azul">
                    Plano Secundario en Tiempo Real
                  </h3>
                  <p className="text-xs text-slate-400">
                    Controles de televisores entregados en Planta Baja y Planta Alta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalPlanoOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PlanoSecundario isModal onClose={() => setModalPlanoOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
