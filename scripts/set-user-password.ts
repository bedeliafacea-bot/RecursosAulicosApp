/**
 * Script para Cambiar/Establecer Contraseña de cualquier Usuario en Supabase Auth
 * 
 * Uso:
 * npx tsx scripts/set-user-password.ts <usuario> <nueva_password>
 * 
 * Ejemplo:
 * npx tsx scripts/set-user-password.ts bruno 123456
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const targetUser = process.argv[2]?.trim().toLowerCase();
  const newPassword = process.argv[3]?.trim();

  if (!targetUser || !newPassword) {
    console.log('ℹ️ Uso: npx tsx scripts/set-user-password.ts <usuario> <nueva_contraseña>');
    console.log('Ejemplo: npx tsx scripts/set-user-password.ts bruno MiClave123');
    process.exit(1);
  }

  const email = targetUser.includes('@') ? targetUser : `${targetUser}@uap.edu.ar`;

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listando usuarios:', listErr.message);
    process.exit(1);
  }

  const user = listData.users.find(u => u.email === email);
  if (!user) {
    console.error(`❌ No se encontró ningún usuario con el correo "${email}".`);
    console.log('Usuarios existentes en Supabase Auth:');
    listData.users.forEach(u => console.log(` - ${u.email}`));
    process.exit(1);
  }

  // Los legajos de la UAP tienen 5 dígitos (ej: 33559). Si la contraseña tiene menos de 6 caracteres,
  // aplicamos un padding transparente ('_') para satisfacer la política de Supabase sin forzar al usuario.
  const securePassword = newPassword.length < 6 ? newPassword.padEnd(6, '_') : newPassword;

  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
    password: securePassword
  });

  if (updateErr) {
    console.error('❌ Error al actualizar contraseña:', updateErr.message);
    process.exit(1);
  }

  console.log(`✅ ¡Contraseña actualizada con éxito para el usuario "${targetUser}" (${email})!`);
}

main();
