# Recursos Áulicos | Bedelía - Universidad Adventista del Plata (UAP)

Sistema integral de control de becarios (Plan Becuap), cronogramas áulicos, plano secundario en tiempo real, reserva de recursos especiales, gestión de oficina y balance de caja.

Migrado desde Google Apps Script a **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS** y **Supabase** (PostgreSQL + Auth + Realtime).

---

## 🚀 Tecnologías

- **Framework**: [Next.js 15](https://nextjs.org/) con React 19 y App Router
- **Base de Datos & Auth**: [Supabase](https://supabase.com/) (PostgreSQL con RLS y Realtime WebSockets)
- **Estilos**: Tailwind CSS con paleta institucional UAP (`#003C71`)
- **Iconografía**: [Lucide React](https://lucide.dev/)

---

## 📁 Estructura del Proyecto

```text
├── src/
│   ├── app/
│   │   ├── (auth)/login/       # Pantalla de acceso institucional
│   │   ├── (dashboard)/        # Vistas principales del sistema
│   │   │   ├── alumnos/        # 7 sub-vistas Becuap + Planillas A4
│   │   │   ├── cumpleanos/     # Agenda de cumpleaños con contacto
│   │   │   ├── facturacion/    # Cierre de caja y recibos
│   │   │   ├── oficina/        # Fotocopias por departamento
│   │   │   ├── planosecu/      # Mapa interactivo de aulas en vivo
│   │   │   ├── reservas/       # Matriz IAP/UAP + Equipos especiales
│   │   │   └── usuarios/       # Panel de control de usuarios y roles
│   │   └── actions/            # Server Actions para mutaciones seguras
│   ├── components/             # Componentes modulares y reutilizables
│   ├── context/                # Contextos globales (Auth, Alertas en vivo)
│   └── lib/                    # Clientes de Supabase y tipos TypeScript
├── supabase/
│   ├── schema.sql              # Esquema DDL con 14 tablas, triggers y RLS
│   └── migrations/             # Cambios incrementales de base de datos
├── scripts/
│   ├── migrate-from-csv.ts     # Ingesta masiva desde archivos CSV
│   └── set-user-password.ts    # Utilidad para cambiar claves de usuarios
├── datos_csv/                  # Archivos CSV exportados desde Google Sheets
└── proyectoviejo/              # Código legacy (11 archivos .html + Codigo.gs)
```

---

## 🛠️ Instalación y Uso

1. Clonar el repositorio e instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
   SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
   ```

### Respaldo mensual en Google Drive

El módulo **Respaldo mensual** está disponible solo para administradores. Selecciona un
mes, confirma la operación y la aplicación subirá primero un JSON a Drive. Solo cuando
Google confirme la subida se eliminarán de Supabase los registros del mes en
`jornadas_becuap`, `horarios_pactados`, `fotocopias`, `pagos_efectivo`,
`reservas_especiales` y `cierres_caja`. Se conservan los alumnos, las evaluaciones, los
catálogos y las reservas semanales (`reservas_matriz`, que no tiene fecha mensual).

Antes de usarlo:

1. En Google Cloud Console, habilitar Google Drive API y crear credenciales OAuth de tipo
   aplicación web. Añadir como URI de redirección autorizado:
   `http://localhost:3000/api/google/drive/callback` (y el equivalente HTTPS del dominio
   publicado).
2. Configurar en el entorno del servidor `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y
   `GOOGLE_REDIRECT_URI` con los valores de esas credenciales. La URI debe coincidir
   exactamente con la registrada en Google Cloud.
3. Crear una clave de cifrado de 32 bytes codificada en Base64 para
   `GOOGLE_TOKEN_ENCRYPTION_KEY`; por ejemplo, ejecutar `openssl rand -base64 32`.
   Mantenerla estable y guardarla como secreto del servidor, nunca en el navegador o el
   repositorio. Si se pierde, habrá que volver a conectar la cuenta de Drive.
4. Aplicar `supabase/migrations/20261021_google_drive_backup_tokens.sql` en Supabase.
5. Abrir `/respaldo` con un usuario administrador y pulsar **Conectar Google Drive** una
   vez. El token de renovación se guarda cifrado y solo lo usa el servidor.

El botón trabaja sobre el mes elegido (por defecto, el mes anterior). La cuenta OAuth usa
el permiso `drive.file`, limitado a archivos que crea la aplicación. Los archivos quedan
en la raíz del Drive autorizado, que será el destino compartido para los administradores.
Una falla al subir no borra datos; si una falla ocurre durante el borrado, el enlace al
archivo ya subido se muestra para conservar el respaldo.

En la pantalla de respaldo se pueden seleccionar individualmente las tablas a incluir y
limpiar; las no seleccionadas quedan intactas en Supabase. La página también muestra si
faltan variables de entorno o aplicar la migración de tokens de Google.

3. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir en el navegador en [http://localhost:3000](http://localhost:3000).

4. Comandos útiles:
   - `npm run migrate:csv`: Migra los datos desde la carpeta `datos_csv/` a Supabase.
   - `npx tsx scripts/set-user-password.ts <usuario> <clave>`: Cambia la clave de un usuario.
