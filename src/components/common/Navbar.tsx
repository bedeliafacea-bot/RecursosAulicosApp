'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  User as UserIcon,
  Shield,
  Clock,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Users,
  Home,
  Tv,
  ChevronDown,
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
  ];

  const visibleNavItems = navItems.filter(item => !rol || item.allowedRoles.includes(rol));

  return (
    <header className="bg-uap-azul text-white border-b border-white/10 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Institution Name */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-white/10 rounded-xl p-1.5 flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                <img
                  src="/img/logo-uap.png"
                  alt="UAP"
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-black tracking-widest uppercase text-blue-200 leading-tight">
                  Universidad Adventista del Plata
                </div>
                <div className="text-sm font-extrabold text-white leading-tight">
                  Recursos Áulicos | Bedelía
                </div>
              </div>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-inner shadow-black/10'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* User Active Chip & Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 bg-white/95 text-uap-azul px-3 py-1.5 rounded-full shadow-md hover:bg-white transition-all text-xs font-bold border border-white/80"
            >
              <div className="w-6 h-6 rounded-full bg-uap-azul text-white flex items-center justify-center text-[10px] font-black">
                {perfil?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-extrabold leading-tight truncate max-w-[120px]">
                  {perfil?.nombre || perfil?.usuario || 'Cargando...'}
                </span>
                <span className="text-[10px] uppercase font-bold text-uap-gris leading-none">
                  {rol || 'Rol'}
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
