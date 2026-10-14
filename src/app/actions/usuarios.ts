'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PerfilUsuario, RolUsuario } from '@/lib/types/database.types';

export async function listarUsuariosAction(): Promise<{ ok: boolean; data?: PerfilUsuario[]; error?: string }> {
  const supabase = await createClient();

  // Verificar que el usuario actual sea admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'No autenticado.' };
  }

  const { data: perfilActual } = await supabase
    .from('perfiles_usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfilActual?.rol !== 'admin') {
    return { ok: false, error: 'No tenés permisos de administrador.' };
  }

  const { data, error } = await supabase
    .from('perfiles_usuarios')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data as PerfilUsuario[] };
}

export async function crearUsuarioAction(datos: {
  usuario: string;
  password: string;
  nombre: string;
  rol: RolUsuario;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) return { ok: false, error: 'No autenticado.' };

  const { data: perfilActual } = await supabase
    .from('perfiles_usuarios')
    .select('rol')
    .eq('id', adminUser.id)
    .single();

  if (perfilActual?.rol !== 'admin') {
    return { ok: false, error: 'No tenés permisos para crear usuarios.' };
  }

  const cleanUser = datos.usuario.trim().toLowerCase();
  const cleanPass = datos.password.trim();
  const cleanNombre = datos.nombre.trim();

  if (!cleanUser || !cleanPass || !cleanNombre || !datos.rol) {
    return { ok: false, error: 'Completá todos los campos requeridos.' };
  }

  const adminClient = createAdminClient();
  const email = cleanUser.includes('@') ? cleanUser : `${cleanUser}@uap.edu.ar`;

  // Soporte para legajos de 5 dígitos (UAP) mediante padding transparente
  const securePass = cleanPass.length < 6 ? cleanPass.padEnd(6, '_') : cleanPass;

  // 1. Crear el usuario en auth.users
  const { data: nuevoAuthUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: securePass,
    email_confirm: true,
    user_metadata: {
      usuario: cleanUser,
      nombre: cleanNombre,
      rol: datos.rol,
    },
  });

  if (authError) {
    return { ok: false, error: authError.message };
  }

  if (!nuevoAuthUser.user) {
    return { ok: false, error: 'No se pudo crear el usuario en Supabase Auth.' };
  }

  // 2. Asegurar el perfil en perfiles_usuarios
  const { error: perfilError } = await adminClient
    .from('perfiles_usuarios')
    .upsert({
      id: nuevoAuthUser.user.id,
      usuario: cleanUser,
      nombre: cleanNombre,
      rol: datos.rol,
      activo: true,
    });

  if (perfilError) {
    return { ok: false, error: 'Usuario creado pero hubo un error en su perfil: ' + perfilError.message };
  }

  return { ok: true };
}

export async function cambiarPasswordAction(
  userId: string,
  nuevaPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) return { ok: false, error: 'No autenticado.' };

  const { data: perfilActual } = await supabase
    .from('perfiles_usuarios')
    .select('rol')
    .eq('id', adminUser.id)
    .single();

  if (perfilActual?.rol !== 'admin') {
    return { ok: false, error: 'Solo el administrador puede cambiar contraseñas.' };
  }

  if (!nuevaPassword || nuevaPassword.trim().length < 4) {
    return { ok: false, error: 'La nueva contraseña debe tener al menos 4 caracteres.' };
  }

  const cleanNueva = nuevaPassword.trim();
  const secureNueva = cleanNueva.length < 6 ? cleanNueva.padEnd(6, '_') : cleanNueva;

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: secureNueva,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function cambiarEstadoAction(
  userId: string,
  activo: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) return { ok: false, error: 'No autenticado.' };

  const { data: perfilActual } = await supabase
    .from('perfiles_usuarios')
    .select('rol')
    .eq('id', adminUser.id)
    .single();

  if (perfilActual?.rol !== 'admin') {
    return { ok: false, error: 'Solo el administrador puede activar/desactivar accesos.' };
  }

  // No permitir desactivar su propia cuenta admin
  if (userId === adminUser.id && !activo) {
    return { ok: false, error: 'No podés desactivar tu propia cuenta administradora.' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('perfiles_usuarios')
    .update({ activo })
    .eq('id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function actualizarRolAction(
  userId: string,
  rol: RolUsuario
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) return { ok: false, error: 'No autenticado.' };

  const { data: perfilActual } = await supabase
    .from('perfiles_usuarios')
    .select('rol')
    .eq('id', adminUser.id)
    .single();

  if (perfilActual?.rol !== 'admin') {
    return { ok: false, error: 'Solo el administrador puede modificar roles.' };
  }

  if (userId === adminUser.id && rol !== 'admin') {
    return { ok: false, error: 'No podés quitarte el rol de administrador a vos mismo.' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('perfiles_usuarios')
    .update({ rol })
    .eq('id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
