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
│   └── schema.sql              # Esquema DDL con 14 tablas, triggers y RLS
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

3. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir en el navegador en [http://localhost:3000](http://localhost:3000).

4. Comandos útiles:
   - `npm run migrate:csv`: Migra los datos desde la carpeta `datos_csv/` a Supabase.
   - `npx tsx scripts/set-user-password.ts <usuario> <clave>`: Cambia la clave de un usuario.
