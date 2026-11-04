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
  Building2,
  Home,
  Menu,
  ChevronDown,
  DatabaseBackup,
  X,
} from 'lucide-react';

export default function Navbar() {
  const { user, perfil, rol, signOut } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

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
    { label: 'Bedelia Virtual', href: '/bedelia-virtual', icon: Building2, allowedRoles: ['admin', 'secretario', 'alumno'] },
    { label: 'Caja', href: '/facturacion', icon: DollarSign, allowedRoles: ['admin', 'secretario'] },
    { label: 'Cumpleaños', href: '/cumpleanos', icon: Calendar, allowedRoles: ['admin', 'secretario', 'alumno'] },
    { label: 'Usuarios', href: '/usuarios', icon: Users, allowedRoles: ['admin'] },
    { label: 'Respaldo', href: '/respaldo', icon: DatabaseBackup, allowedRoles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter(item => !rol || item.allowedRoles.includes(rol));

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-uap-azul text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <a href="/" className="group flex min-w-0 shrink items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 p-1.5 transition-all group-hover:bg-white/20">
              <img
                src="/img/logo-uap.png"
                alt="UAP"
                className="h-full w-full object-contain drop-shadow"
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="text-[9px] font-black uppercase leading-4 tracking-[0.08em] text-blue-200">
                Universidad Adventista del Plata
              </div>
              <div className="whitespace-nowrap text-[13px] font-extrabold leading-4 text-white">
                Recursos Áulicos <span className="text-white/60">·</span> Bedelía
              </div>
            </div>
          </a>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                className="flex min-h-10 items-center gap-2 rounded-full border border-white/70 bg-white/95 px-2 py-1.5 text-xs font-bold text-uap-azul shadow-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-uap-azul text-[10px] font-black text-white">
                  {perfil?.nombre?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span className="hidden max-w-[120px] truncate text-left font-extrabold leading-tight md:block">
                  {perfil?.nombre || perfil?.usuario || 'Cargando...'}
                </span>
                <span className={`hidden rounded border px-1.5 py-0.5 text-[10px] font-black uppercase md:inline-flex ${getRolBadgeColor()}`}>
                  {rol || '...'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-uap-gris" aria-hidden="true" />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 animate-in zoom-in-95 rounded-2xl border border-slate-100 bg-white py-2 text-slate-800 shadow-2xl fade-in duration-100"
                >
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-400">Conectado como</p>
                    <p className="truncate text-sm font-bold text-uap-azul">{perfil?.nombre || user?.email}</p>
                    <div className="mt-1">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${getRolBadgeColor()}`}>
                        Rol: {rol}
                      </span>
                    </div>
                  </div>

                  <div className="p-1">
                    {rol === 'admin' && (
                      <a
                        href="/usuarios"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Shield className="h-4 w-4 text-purple-600" aria-hidden="true" />
                        <span>Administrar Usuarios</span>
                      </a>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 text-red-500" aria-hidden="true" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-expanded={mobileNavOpen}
              aria-controls="primary-navigation"
              aria-label={mobileNavOpen ? 'Cerrar navegación' : 'Abrir navegación'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          id="primary-navigation"
          className={`${mobileNavOpen ? 'block' : 'hidden'} border-t border-white/10 py-2 md:block`}
        >
          <nav className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1 md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:pb-2" aria-label="Navegación principal">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    isActive
                      ? 'bg-white/15 text-white ring-1 ring-inset ring-white/15'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
