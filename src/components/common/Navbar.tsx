'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  Shield,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  Users,
  Home,
  ChevronDown,
  DatabaseBackup,
} from 'lucide-react';

export default function Navbar() {
  const { user, perfil, rol, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRolBadgeColor = () => {
    switch (rol) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'secretario':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'alumno':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const navItems = [
    { label: 'Inicio', href: '/', icon: Home, allowedRoles: ['admin', 'secretario', 'alumno'] },
    { label: 'Alumnos', href: '/alumnos', icon: Clock, allowedRoles: ['admin', 'secretario', 'alumno'] },
    { label: 'Oficina', href: '/oficina', icon: FileText, allowedRoles: ['admin', 'secretario', 'alumno'] },
    { label: 'Reservas', href: '/reservas', icon: Calendar, allowedRoles: ['admin', 'secretario', 'alumno'] },
    { label: 'Caja', href: '/facturacion', icon: DollarSign, allowedRoles: ['admin', 'secretario'] },
    { label: 'Cumpleaños', href: '/cumpleanos', icon: Calendar, allowedRoles: ['admin', 'secretario', 'alumno'] },
    { label: 'Usuarios', href: '/usuarios', icon: Users, allowedRoles: ['admin'] },
    { label: 'Respaldo', href: '/respaldo', icon: DatabaseBackup, allowedRoles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter(item => !rol || item.allowedRoles.includes(rol));

  return (
    <header className="bg-uap-azul text-white border-b border-white/10 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-16">
          {/* Logo & Institution Name */}
          <a href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 p-1.5 transition-all group-hover:bg-white/20">
              <img
                src="/img/logo-uap.png"
                alt="UAP"
                className="h-full w-full object-contain drop-shadow"
              />
            </div>
            <div className="hidden w-[188px] lg:block">
              <div className="whitespace-nowrap text-[9px] font-black uppercase leading-4 tracking-[0.08em] text-blue-200">
                Universidad Adventista del Plata
              </div>
              <div className="whitespace-nowrap text-[13px] font-extrabold leading-4 text-white">
                Recursos Áulicos <span className="text-white/60">·</span> Bedelía
              </div>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="flex min-w-0 flex-1 items-center justify-center gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-extrabold tracking-wide transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-inner shadow-black/10'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden xl:inline">{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* User Active Chip & Menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-uap-azul shadow-md transition-all hover:bg-white sm:gap-2.5 sm:px-3"
            >
              <div className="w-6 h-6 rounded-full bg-uap-azul text-white flex items-center justify-center text-[10px] font-black">
                {perfil?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="max-w-[120px] truncate font-extrabold leading-tight">
                  {perfil?.nombre || perfil?.usuario || 'Cargando...'}
                </span>
              </div>
              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${getRolBadgeColor()}`}>
                {rol || '...'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-uap-gris" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400">Conectado como</p>
                  <p className="text-sm font-bold text-uap-azul truncate">{perfil?.nombre || user?.email}</p>
                  <div className="mt-1">
                    <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getRolBadgeColor()}`}>
                      Rol: {rol}
                    </span>
                  </div>
                </div>

                <div className="p-1">
                  {rol === 'admin' && (
                    <a
                      href="/usuarios"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Administrar Usuarios</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
