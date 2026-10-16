'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PerfilUsuario, RolUsuario } from '@/lib/types/database.types';
import {
  listarUsuariosAction,
  crearUsuarioAction,
  cambiarPasswordAction,
  cambiarEstadoAction,
  actualizarRolAction,
} from '@/app/actions/usuarios';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function UsuariosPage() {
  const { rol, isLoading: authLoading, perfil: perfilSesion } = useAuth();
  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Formulario nuevo usuario
  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('secretario');
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');
  const [exitoCrear, setExitoCrear] = useState('');

  // Modal cambiar password
  const [usuarioModalPass, setUsuarioModalPass] = useState<PerfilUsuario | null>(null);
  const [passwordNuevaInput, setPasswordNuevaInput] = useState('');
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const [msgPass, setMsgPass] = useState('');

  const cargarUsuarios = async () => {
    setLoadingList(true);
    const res = await listarUsuariosAction();
    if (res.ok && res.data) {
      setUsuarios(res.data);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    if (rol === 'admin') {
      cargarUsuarios();
    }
  }, [rol]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-uap-azul" />
      </div>
    );
  }

  if (rol !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-uap border border-red-100 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-uap-azul mb-2">Acceso Restringido</h2>
        <p className="text-sm text-uap-gris leading-relaxed">
          El módulo de Administración de Usuarios es exclusivo para cuentas con rol de <b>Administrador</b>.
        </p>
      </div>
    );
  }

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrear('');
    setExitoCrear('');
    setCreando(true);

    const res = await crearUsuarioAction({
      usuario: nuevoUsuario,
      password: nuevoPassword,
      nombre: nuevoNombre,
      rol: nuevoRol,
    });

    if (!res.ok) {
      setErrorCrear(res.error || 'Error al crear usuario.');
    } else {
      setExitoCrear('✅ Usuario creado exitosamente.');
      setNuevoUsuario('');
      setNuevoPassword('');
      setNuevoNombre('');
      cargarUsuarios();
    }
    setCreando(false);
  };

  const handleCambiarEstado = async (u: PerfilUsuario) => {
    const nuevoEstado = !u.activo;
    const confirmacion = confirm(
      `¿Seguro que deseás ${nuevoEstado ? 'activar' : 'desactivar'} a ${u.nombre}?`
    );
    if (!confirmacion) return;

    const res = await cambiarEstadoAction(u.id, nuevoEstado);
    if (!res.ok) {
      alert(res.error || 'No se pudo actualizar el estado.');
    } else {
      cargarUsuarios();
    }
  };

  const handleCambiarRol = async (u: PerfilUsuario, nuevoRolSelect: RolUsuario) => {
    if (u.rol === nuevoRolSelect) return;
    const confirmacion = confirm(`¿Cambiar rol de ${u.nombre} a "${nuevoRolSelect}"?`);
    if (!confirmacion) return;

    const res = await actualizarRolAction(u.id, nuevoRolSelect);
    if (!res.ok) {
      alert(res.error || 'No se pudo actualizar el rol.');
    } else {
      cargarUsuarios();
    }
  };

  const handleGuardarNuevaPassword = async () => {
    if (!usuarioModalPass) return;
    if (passwordNuevaInput.length < 6) {
      setMsgPass('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCambiandoPass(true);
    setMsgPass('');
    const res = await cambiarPasswordAction(usuarioModalPass.id, passwordNuevaInput);

    if (!res.ok) {
      setMsgPass(res.error || 'Error al actualizar contraseña.');
    } else {
      alert('✅ Contraseña actualizada correctamente.');
      setUsuarioModalPass(null);
      setPasswordNuevaInput('');
    }
    setCambiandoPass(false);
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.rol.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-uap-azul to-uap-azul-medio text-white flex items-center justify-center shadow-lg shadow-uap-azul/20">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-uap-azul">
              Gestión de Usuarios del Sistema
            </h1>
            <p className="text-sm text-uap-gris mt-0.5">
              Administrá los accesos, contraseñas y permisos del personal de Bedelía
            </p>
          </div>
        </div>

        <button
          onClick={cargarUsuarios}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-uap-azul text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          <span>Actualizar lista</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Formulario Crear Usuario (1 Columna) */}
        <div className="bg-white rounded-3xl p-6 md:p-7 shadow-uap border border-uap-borde">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
            <UserPlus className="w-5 h-5 text-uap-azul-medio" />
            <h2 className="text-lg font-black text-uap-azul">Nuevo Usuario</h2>
          </div>

          {errorCrear && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorCrear}
            </div>
          )}

          {exitoCrear && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
              {exitoCrear}
            </div>
          )}

          <form onSubmit={handleCrearUsuario} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                Nombre y Apellido
              </label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="ej: Lic. Rafael Carro"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                Usuario / Identificador
              </label>
              <input
                type="text"
                value={nuevoUsuario}
                onChange={(e) => setNuevoUsuario(e.target.value)}
                placeholder="ej: rcarro o sec_tarde"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                Contraseña Inicial
              </label>
              <input
                type="password"
                value={nuevoPassword}
                onChange={(e) => setNuevoPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                Rol del Sistema
              </label>
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
              >
                <option value="secretario">Secretario (Todos los módulos, excepto Gestión de Usuarios)</option>
                <option value="alumno">Alumno Becario (Consulta de horas)</option>
                <option value="admin">Administrador (Control total)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creando}
              className="w-full mt-2 py-3 px-4 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Crear Usuario</span>
              )}
            </button>
          </form>
        </div>

        {/* Tabla Lista de Usuarios (2 Columnas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-7 shadow-uap border border-uap-borde">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-lg font-black text-uap-azul">Directorio de Usuarios</h2>
              <p className="text-xs text-uap-gris">
                Total de cuentas registradas: <b>{usuarios.length}</b>
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o rol..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
              />
            </div>
          </div>

          {loadingList ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-uap-azul-medio" />
              <span className="text-xs font-semibold">Cargando directorio...</span>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No se encontraron usuarios que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-3">Usuario / Nombre</th>
                    <th className="py-3 px-3">Rol</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-uap-texto text-sm">{u.nombre}</div>
                        <div className="text-slate-400 text-[11px] font-mono">@{u.usuario}</div>
                      </td>

                      <td className="py-3 px-3">
                        <select
                          value={u.rol}
                          onChange={(e) => handleCambiarRol(u, e.target.value as RolUsuario)}
                          disabled={u.id === perfilSesion?.id}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-uap-azul-medio"
                        >
                          <option value="admin">Admin</option>
                          <option value="secretario">Secretario</option>
                          <option value="alumno">Alumno</option>
                        </select>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleCambiarEstado(u)}
                          disabled={u.id === perfilSesion?.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition-all ${
                            u.activo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {u.activo ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setUsuarioModalPass(u);
                            setPasswordNuevaInput('');
                            setMsgPass('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-uap-azul font-bold rounded-lg transition-colors border border-slate-200"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Contraseña</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cambiar Contraseña */}
      {usuarioModalPass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <KeyRound className="w-5 h-5 text-uap-azul" />
              <div>
                <h3 className="font-extrabold text-uap-azul text-base">Modificar Contraseña</h3>
                <p className="text-xs text-slate-400">Usuario: @{usuarioModalPass.usuario}</p>
              </div>
            </div>

            {msgPass && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                {msgPass}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-uap-texto uppercase tracking-wider mb-1.5">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordNuevaInput}
                  onChange={(e) => setPasswordNuevaInput(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-uap-borde rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uap-azul-medio"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setUsuarioModalPass(null)}
                  disabled={cambiandoPass}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarNuevaPassword}
                  disabled={cambiandoPass}
                  className="px-5 py-2 bg-uap-azul hover:bg-uap-azul-oscuro text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {cambiandoPass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Actualizar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
