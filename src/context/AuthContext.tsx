'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { PerfilUsuario, RolUsuario } from '@/lib/types/database.types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  perfil: PerfilUsuario | null;
  rol: RolUsuario | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  hasRole: (roles: RolUsuario[]) => boolean;
  refreshPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  perfil: null,
  rol: null,
  isLoading: true,
  signOut: async () => {},
  hasRole: () => false,
  refreshPerfil: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('No se pudo cargar el perfil del usuario:', error.message);
        // Fallback perfil temporal si no está en la base aún
        setPerfil({
          id: userId,
          usuario: 'usuario',
          nombre: 'Usuario UAP',
          rol: 'alumno',
          activo: true,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        });
        return;
      }

      setPerfil(data);
    } catch (err) {
      console.error('Error al obtener perfil:', err);
    }
  };

  const refreshPerfil = async () => {
    if (user?.id) {
      await fetchPerfil(user.id);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchPerfil(session.user.id);
        } else {
          setUser(null);
          setPerfil(null);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchPerfil(session.user.id);
      } else {
        setUser(null);
        setPerfil(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
    router.push('/login');
    router.refresh();
  };

  const hasRole = (roles: RolUsuario[]): boolean => {
    if (!perfil) return false;
    return roles.includes(perfil.rol);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        rol: perfil?.rol || null,
        isLoading,
        signOut,
        hasRole,
        refreshPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
