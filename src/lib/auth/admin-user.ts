import { createClient } from '@/lib/supabase/server';

export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Necesitás iniciar sesión para realizar esta operación.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('perfiles_usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.rol !== 'admin') {
    throw new Error('Solo un administrador puede realizar esta operación.');
  }

  return user;
}
