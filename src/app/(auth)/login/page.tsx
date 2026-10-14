'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanId = identificador.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Por favor completá tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      // Si ingresó sólo usuario (ej: 'admin'), lo normalizamos al dominio institucional UAP
      const email = cleanId.includes('@') ? cleanId : `${cleanId}@uap.edu.ar`;

      // Los legajos UAP son de 5 dígitos. Si la clave tiene menos de 6 caracteres, aplicamos padding transparente
      const finalPass = cleanPass.length < 6 ? cleanPass.padEnd(6, '_') : cleanPass;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: finalPass,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('Usuario o contraseña incorrectos.');
        } else {
          setErrorMsg(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al conectar con el servidor.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl min-h-[540px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-white/20">
      {/* Brand Column (Izquierda) */}
      <div className="bg-gradient-to-br from-uap-azul via-uap-azul-oscuro to-uap-azul-profundo p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative w-14 h-14 bg-white/10 rounded-2xl p-2 flex items-center justify-center border border-white/20 backdrop-blur-sm">
              <img
                src="https://i.postimg.cc/fyMcjMcn/logo-uap.png"
                alt="Logo UAP"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-widest uppercase text-white/80">
                Universidad
              </h3>
              <h2 className="font-extrabold text-lg leading-tight">
                Adventista del Plata
              </h2>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <span className="inline-block px-3 py-1 bg-white/15 text-blue-100 text-xs font-bold rounded-full uppercase tracking-wider border border-white/10">
              Bedelía Universitaria
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Recursos Áulicos
            </h1>
            <p className="text-white/80 text-sm leading-relaxed pt-2">
              Sistema integral de control de becarios, cronogramas áulicos, reserva de proyectores y balance de caja.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/10 mt-8">
          <p className="text-xs text-white/60 font-medium uppercase tracking-wider">
            Vicerrectoría de Bienestar Estudiantil
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            Gestión interna de asistencia y servicios educativos
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Form Column (Derecha) */}
      <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-uap-azul">
            Iniciar Sesión
          </h2>
          <p className="text-sm text-uap-gris mt-1 font-medium">
            Ingresá con tu usuario o correo institucional
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-2">
              Usuario o Correo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-uap-gris">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="ej: admin o secretario"
                disabled={isLoading}
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-uap-borde rounded-xl text-uap-texto text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-uap-gris">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-uap-borde rounded-xl text-uap-texto text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 px-6 bg-gradient-to-r from-uap-azul via-uap-azul-medio to-uap-azul hover:opacity-95 text-white font-extrabold rounded-xl shadow-lg shadow-uap-azul/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-uap-gris font-medium">
          <span>Universidad Adventista del Plata</span>
          <span className="font-semibold text-uap-azul">v2.0 (Next.js)</span>
        </div>
      </div>
    </div>
  );
}
