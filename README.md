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

### Respaldo mensual en ZIP

El módulo **Respaldo mensual** está disponible solo para administradores y no requiere
integrar Google Drive. Permite elegir un mes y las tablas operativas que se incluirán.
Genera un ZIP local con `manifest.json` y un archivo JSON por tabla; puedes guardarlo en
tu equipo y subirlo manualmente a Drive.

Las tablas mensuales disponibles son `jornadas_becuap`, `horarios_pactados`, `fotocopias`,
`pagos_efectivo`, `reservas_especiales` y `cierres_caja`. Los alumnos, evaluaciones,
catálogos y reservas semanales (`reservas_matriz`, que no tiene fecha mensual) no se
incluyen.

La pantalla permite cargar un ZIP anterior para consultar sus datos sin modificarlos. Si
quieres limpiar Supabase después de haber guardado el ZIP en Drive, cárgalo en la aplicación,
marca la confirmación y usa el botón de limpieza separado. El servidor solo borra filas
incluidas en el ZIP que coincidan exactamente con los registros actuales; si fueron
modificadas o ya no existen, detiene la limpieza.

Para habilitar la limpieza, aplicar una sola vez
`supabase/migrations/20261021_monthly_backup_cleanup.sql` en Supabase. Generar y consultar
ZIPs no requieren esa migración.

### Planificación mensual de horas pactadas

La pestaña **Pactar Horarios** permite cargar los horarios previstos de un alumno en
Supabase, verlos en un almanaque y sumar las horas planificadas según su meta mensual.
El saldo se calcula únicamente a partir de horarios pactados en meses consecutivos:
los excesos reducen la meta del mes siguiente y las horas faltantes se agregan como
pendientes de planificación. No modifica ni consulta las jornadas realmente trabajadas.

Al guardar, se reemplaza el cronograma completo de ese alumno para el mes seleccionado.
Para habilitar el guardado atómico, aplicar una sola vez
`supabase/migrations/20261021_replace_monthly_pact_schedule.sql` en Supabase. La pantalla
de lectura de los horarios existentes no requiere esta migración.

### Retiros de efectivo de Oficina

En **Gestión de Oficina → Pago Efectivo**, los administradores y secretarios pueden
registrar retiros de caja indicando fecha, motivo e importe. El resumen separa los
ingresos por cobros, los retiros y el neto del mes. Para habilitarlo, aplicar una vez
`supabase/migrations/20261022_cash_withdrawals.sql` en Supabase. Los retiros también
se pueden seleccionar en los respaldos mensuales.

3. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir en el navegador en [http://localhost:3000](http://localhost:3000).

4. Comandos útiles:
   - `npm run migrate:csv`: Migra los datos desde la carpeta `datos_csv/` a Supabase.
   - `npm run migrate:fotocopias`: Sincroniza únicamente fotocopias; se puede volver a ejecutar sin duplicar registros y requiere `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
   - `npm run migrate:fotocopias -- --dry-run`: Valida las fotocopias localmente sin conectarse ni escribir en Supabase.
   - `npx tsx scripts/set-user-password.ts <usuario> <clave>`: Cambia la clave de un usuario.
