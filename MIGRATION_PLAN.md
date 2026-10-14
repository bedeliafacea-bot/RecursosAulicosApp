# PLAN MAESTRO DE MIGRACIÓN: RECURSOS ÁULICOS / BEDELÍA (UAP)
## De Google Apps Script (Legacy) a Next.js (App Router) + Tailwind CSS + Supabase

---

### 1. Resumen Ejecutivo y Diagnóstico del Sistema Legacy

El sistema actual **"Recursos Áulicos | Bedelía - Universidad Adventista del Plata (UAP)"** opera íntegramente sobre Google Apps Script (`Codigo.gs`) utilizando un archivo de Google Sheets como base de datos con 13 hojas de cálculo y plantillas HTML embebidas evaluadas con `HtmlService`.

#### 1.1 Inventario de Archivos Legacy Analizados
- `Codigo.gs`: 1.393 líneas con toda la lógica de backend, sesiones vía `CacheService`, manipulación de filas en Google Sheets, autenticación SHA-256 precaria y endpoints RPC para el frontend.
- `Styles.html`: Definición central de paleta de colores institucional UAP (azul `#003C71`, celeste `#eaf6ff`, fuentes del sistema, sombras y normalización CSS).
- `index.html`: Portal principal con tarjetas dinámicas según rol, hero institucional, widget de cumpleaños y modal en tiempo real para `PlanoSecu`.
- `Login.html`: Formulario de acceso con estética UAP, redirección basada en roles y parámetros URL.
- `Alumnos.html`: 1.517 líneas que gestionan el programa de becarios Becuap (Mi Ficha, Carga Diaria con turnos dobles, Edición de jornadas, Cronograma de horarios pactados, Impresión oficial de planilla mensual A4 Portrait y Evaluación Cuatrimestral de 7 criterios con impresión A4 Landscape).
- `Oficina.html`: Gestión de consumos de fotocopias por departamento, cobros en efectivo, calculadora rápida e informe mensual de facturación para imprimir en A4.
- `Reservas.html`: Matriz semanal interactiva de turnos de aulas y recursos tecnológicos para IAP Mañana (8 bloques) y UAP Tarde (8 bloques), agrupación por docente con cálculo de `colspan`, reservas especiales con control de entrega/devolución e impresión en A4 Landscape.
- `AlertasReservas.html`: Módulo de sondeo con `setInterval` cada 60s para disparar notificaciones en navegador y modales a los 15, 10 y 5 minutos antes del inicio de una reserva.
- `PlanoSecu.html`: Plano interactivo en CSS Grid de Planta Baja (7x6) y Planta Alta (6x6) con estado de controles de TV entregados, sincronizado mediante sondeo de 3 segundos.
- `Facturacion.html`: 3.890 líneas de control de caja diario (generador secuencial de recibos con detección de anulados/efectivo/transferencia, Mercado Pago, Banco Galicia, balance de diferencia e informe imprimible).
- `Cumpleanos.html`: Vista de alumnos becarios con cumpleaños en los próximos 15 días.
- `Usuarios.html`: Panel administrativo de creación, cambio de contraseña, modificación de rol y activación de usuarios.

---

### 2. Bugs Críticos Identificados y Solución en la Migración

| # | Bug Legacy en Código Original | Impacto en Producción | Solución en Supabase + Next.js |
|---|---|---|---|
| **1** | **Pérdida de transferencias en Cierre de Caja** (`Facturacion.html:3754` vs `Codigo.gs:1151`) | `obtenerDatosCierreCaja()` extrae `totalTransfer` y el arreglo `transferencias`, pero `guardarCierreCaja()` en `Codigo.gs` no las persiste en la hoja `Cierres_Caja`. Las transferencias bancarias se pierden en el histórico. | Se crea la tabla `cierres_caja` con columnas dedicadas `total_transferencias numeric(12,2)` y `transferencias_json jsonb`, almacenando el 100% de la operación atómicamente. |
| **2** | **Función fantasma en Home** (`index.html:864`) | `index.html` ejecuta `setInterval(consultarEstadoPlano, 3000)` invocando a `google.script.run.obtenerEstadoPlano()`, función inexistente en `Codigo.gs`. Produce excepciones JS continuas en consola cada 3 segundos. | Reemplazado por suscripción nativa a WebSockets de **Supabase Realtime (`postgres_changes`)** sobre la tabla `estado_app` / `aulas_plano_secu`, eliminando errores y consumos innecesarios. |
| **3** | **Hardcodeo del año 2026** (`Codigo.gs:469, 524, 686, 734, 796`) | Todo el sistema valida `anioFila === 2026` o crea `new Date(2026, ...)`. Cualquier registro fuera de 2026 queda oculto o se corrompe en fecha. | El año se desacopla completamente: las fechas se almacenan como tipos nativos `DATE` y las pantallas proveen selectores de año y mes dinámicos (preseleccionando el año en curso). |
| **4** | **Concurrencia y borrado por `filaOriginal`** (`Codigo.gs:549, 573, 955, 1005`) | La edición y eliminación de jornadas y reservas se basa en el número de fila física de Sheets. Si dos secretarios cargan o eliminan filas en paralelo, la numeración se desfasa y se edita/borra el registro de otro alumno o profesor. | Cada entidad tiene una clave primaria inmutable `UUID` (`id uuid default gen_random_uuid()`). Las mutaciones son atómicas e idempotentes en PostgreSQL. |
| **5** | **Cuello de botella por Polling intensivo** (`AlertasReservas.html:14`, `PlanoSecu.html:258`, `index.html:870`) | Tres temporizadores ejecutaban peticiones HTTP periódicas (cada 3s y cada 60s) saturando las cuotas de Google Apps Script y consumiendo batería/ancho de banda. | Implementación de **Supabase Realtime** mediante WebSockets para eventos de cambio en aulas y reservas, y temporizadores locales en memoria para las alertas de 15, 10 y 5 minutos. |

---

### 3. Arquitectura del Nuevo Sistema (Next.js 15 + Supabase)

```
                               ┌──────────────────────────────────────────────┐
                               │       Next.js 15 App Router Frontend         │
                               │  (React 19 + TypeScript + Tailwind CSS)      │
                               └──────────────────────┬───────────────────────┘
                                                      │
                         ┌────────────────────────────┴──────────────────────────┐
                         │                                                       │
                         ▼                                                       ▼
        ┌───────────────────────────────────┐                  ┌───────────────────────────────────┐
        │       Server Components /         │                  │    Client Components & Hooks      │
        │       Server Actions              │                  │    (Realtime Listeners, Alerts)   │
        └────────────────┬──────────────────┘                  └─────────────────┬─────────────────┘
                         │                                                       │
                         │   @supabase/ssr (Server Client)                       │   @supabase/supabase-js
                         │   Session Cookies & Headers                           │   WebSocket postgres_changes
                         │                                                       │
                         ▼                                                       ▼
        ┌──────────────────────────────────────────────────────────────────────────────────────────┐
        │                                 Supabase Cloud / Local                                   │
        │   ┌─────────────────────┐   ┌─────────────────────────────┐   ┌──────────────────────┐   │
        │   │    Auth & Roles     │   │     PostgreSQL Relational   │   │   Realtime Engine    │   │
        │   │ (JWT + App Profiles)│   │   (RLS Policies + Triggers) │   │ (WebSockets Publish) │   │
        │   └─────────────────────┘   └─────────────────────────────┘   └──────────────────────┘   │
        └──────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 3.1 Estructura del Proyecto Next.js
```
registrosAlumnos/
├── supabase/
│   ├── schema.sql                 # Definición DDL, índices, RLS, triggers y seed data
│   └── migrations/                # Versionado de base de datos
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx       # Login con diseño institucional UAP
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard layout con Topbar, Chip de usuario y AlertasReservasProvider
│   │   │   ├── page.tsx           # Home con accesos rápidos, cumpleaños y modal PlanoSecu
│   │   │   ├── alumnos/
│   │   │   │   ├── page.tsx       # Módulo Becuap con 6 subvistas según rol
│   │   │   │   ├── planilla/      # Vista de impresión A4 Portrait oficial
│   │   │   │   └── evaluacion/    # Vista de impresión A4 Landscape con 7 criterios
│   │   │   ├── oficina/
│   │   │   │   ├── page.tsx       # Fotocopias, pagos efectivo e informe mensual
│   │   │   │   └── informe/       # Vista imprimible A4 de consumos por departamento
│   │   │   ├── reservas/
│   │   │   │   ├── page.tsx       # Matriz semanal IAP/UAP + Reservas especiales
│   │   │   │   └── imprimir/      # Vista A4 Landscape de reservas del día
│   │   │   ├── facturacion/
│   │   │   │   ├── page.tsx       # Control de caja, recibos, MP, Galicia y balance
│   │   │   │   └── imprimir/      # Cierre de caja en formato A4 formal
│   │   │   ├── cumpleanos/
│   │   │   │   └── page.tsx       # Lista completa de próximos cumpleaños
│   │   │   └── usuarios/
│   │   │       └── page.tsx       # Administración RBAC (solo admin)
│   │   ├── api/
│   │   │   └── auth/callback/
│   │   ├── globals.css            # Tokens de diseño UAP y reglas @media print
│   │   └── layout.tsx
│   ├── components/
│   │   ├── common/                # Topbar, Sidebar, Modal, ConfirmDialog, StatCard
│   │   ├── alumnos/               # FichaAlumno, CargarJornada, PlanillaA4, EvaluacionA4
│   │   ├── oficina/               # FormFotocopia, FormEfectivo, CalculadoraRapida, ReporteDepartamentos
│   │   ├── reservas/              # MatrizHoraria, BloqueProfesor, ReservasEspeciales, AlertasModal
│   │   ├── facturacion/           # GeneradorRecibos, MercadoPagoList, TransferenciasList, ResumenCaja
│   │   └── plano/                 # PlanoSecundarioGrid, AulaButton, TvBadge
│   ├── context/
│   │   ├── AuthContext.tsx        # Perfil y rol activo
│   │   └── AlertasReservasContext.tsx # Monitor en segundo plano para avisos de 15/10/5 min
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # createBrowserClient (@supabase/ssr)
│   │   │   ├── server.ts          # createServerClient (@supabase/ssr)
│   │   │   └── middleware.ts      # Manejo de tokens y cookies en rutas protegidas
│   │   ├── utils/
│   │   │   ├── dates.ts           # Cálculo de horas decimales, formateo HH:mm, duraciones
│   │   │   ├── currency.ts        # Formato de moneda ARS ($)
│   │   │   └── print.ts           # Disparadores de impresión por ventana
│   │   └── types/
│   │       └── database.types.ts  # Tipado estricto TS generado desde Supabase
│   └── middleware.ts              # Control de rutas y autorización por rol
```

---

### 4. Mapeo Exhaustivo de Funciones: `Codigo.gs` -> Next.js / Supabase

| Módulo | Función Legacy en `Codigo.gs` | Destino en Nuevo Stack | Descripción Técnica |
|---|---|---|---|
| **Auth** | `validarLogin(u, p, dest)` | Supabase Auth `signInWithPassword` + Server Action | Autenticación segura mediante Bcrypt/Argon2 nativo de Supabase Auth. La sesión se almacena en cookies HTTP-only seguras mediante `@supabase/ssr`. |
| **Auth** | `cerrarSesion(token)` | `supabase.auth.signOut()` | Cierre de sesión y revocación del token JWT. Redirección a `/login`. |
| **Auth** | `obtenerSesionActual(token)` | `src/context/AuthContext.tsx` + `getUser()` | Carga el perfil desde `perfiles_usuarios` vinculando `auth.uid()`, resolviendo rol y permisos reactivos. |
| **Usuarios** | `listarUsuariosSistema(token)` | Server Action `/app/(dashboard)/usuarios` | Consulta `SELECT * FROM perfiles_usuarios ORDER BY creado_en DESC` protegida por RLS (`rol = 'admin'`). |
| **Usuarios** | `crearUsuarioSistema(token, obj)` | Server Action con Supabase Admin API | Crea el usuario en `auth.users` y sincroniza el perfil en `perfiles_usuarios` mediante trigger. |
| **Usuarios** | `cambiarPasswordUsuarioSistema(...)` | Server Action Admin API | Actualiza credenciales mediante `supabase.auth.admin.updateUserById(userId, { password })`. |
| **Usuarios** | `cambiarEstadoUsuarioSistema(...)` | Server Action | Modifica la columna `activo` en `perfiles_usuarios` con validación de resguardo para el usuario principal. |
| **Usuarios** | `actualizarRolUsuarioSistema(...)` | Server Action | Actualiza `rol` (`admin`, `secretario`, `alumno`) previa verificación de permisos. |
| **Alumnos** | `buscarInfoAlumno(id)` | `supabase.from('alumnos').select('*')` | Búsqueda por Legajo exacto o Nombre parcial con coincidencia insensible a mayúsculas (`ilike`). |
| **Alumnos** | `guardarNuevoAlumno(obj)` | Server Action `crearAlumnoAction` | `INSERT INTO alumnos (...)`. Validado solo para rol `admin`. |
| **Alumnos** | `buscarDatosAlumno(id, mes)` | Server Action / Query combinada | Obtiene alumno, sus `jornadas_becuap` del mes/año seleccionado, cálculo de horas totales y meta según plan. |
| **Alumnos** | `listarJornadasAlumno(id, mes)` | Query `jornadas_becuap` | `SELECT * FROM jornadas_becuap WHERE alumno_id = $1 AND EXTRACT(MONTH FROM fecha) = $2 AND EXTRACT(YEAR FROM fecha) = $3`. |
| **Alumnos** | `actualizarJornadaAlumno(j)` | Server Action `actualizarJornadaAction` | `UPDATE jornadas_becuap SET ... WHERE id = $1` (usando clave primaria UUID, eliminando el bug de `filaOriginal`). |
| **Alumnos** | `eliminarJornadaAlumno(fila)` | Server Action `eliminarJornadaAction` | `DELETE FROM jornadas_becuap WHERE id = $1`. |
| **Alumnos** | `registrarJornada(f)` | Server Action `registrarJornadaAction` | `INSERT INTO jornadas_becuap`. Soporta inserción simple o múltiple (batch) para la funcionalidad "Agregar otro día". |
| **Alumnos** | `obtenerHorarioPactado(id, mes)` | Query `horarios_pactados` | Consulta de cronogramas mensuales asignados al legajo para proyectar en el calendario visual. |
| **Alumnos** | `registrarHorariosMasivos(obj)` | Server Action `pactarHorariosAction` | Descompone los días separados por coma e inserta múltiples registros en `horarios_pactados` para el mes y año elegidos. |
| **Alumnos** | `buscarInfoParaEvaluacion(legajo, cuat)`| Server Action `getEvaluacionAction` | Obtiene el alumno, calcula la fecha de su primera jornada histórica y recupera el registro de `evaluaciones_becuap`. |
| **Alumnos** | `guardarEvaluacionBackend(data)` | Server Action `guardarEvaluacionAction`| Realiza un `UPSERT` en `evaluaciones_becuap`, recalcula el promedio ponderado de los 7 criterios y almacena las observaciones. |
| **Oficina** | `obtenerDepartamentos()` | Query `departamentos` | `SELECT * FROM departamentos WHERE activo = true ORDER BY nombre ASC`. |
| **Oficina** | `registrarGastoFotocopia(d)` | Server Action `registrarFotocopiaAction` | `INSERT INTO fotocopias (fecha, departamento_id, departamento_nombre, cantidad, valor_unitario, total)`. |
| **Oficina** | `obtenerDatosFotocopias(mes)` | Query agregada / RPC | Agrupa consumos de fotocopias por departamento para el mes y año seleccionados. |
| **Oficina** | `registrarPagoEfectivo(p)` | Server Action `registrarPagoEfectivoAction`| `INSERT INTO pagos_efectivo (fecha, cantidad_copias, valor_unitario, total)`. |
| **Oficina** | `obtenerTotalEfectivoMensual(mes)` | Query agregada | `SELECT COALESCE(SUM(total), 0) FROM pagos_efectivo WHERE ...`. |
| **Reservas** | `obtenerReservasPorDia(dia)` | Query `reservas_matriz` | `SELECT * FROM reservas_matriz WHERE dia = $1 ORDER BY hora_inicio ASC`. |
| **Reservas** | `registrarNuevaReservaMatriz(r)` | Server Action `crearReservaAction` | Inserción en `reservas_matriz` con validación de horarios y profesor. |
| **Reservas** | `actualizarReservaMatriz(r)` | Server Action `editarReservaAction` | Actualización por UUID de la reserva. |
| **Reservas** | `cambiarEstadoReservaMatriz(id, est)`| Server Action / Optimistic UI | Alterna entre `Pendiente`, `Pausado` y `Finalizado`. Dispara evento Realtime. |
| **Reservas** | `eliminarReservaMatriz(id)` | Server Action | `DELETE FROM reservas_matriz WHERE id = $1`. |
| **Reservas** | `obtenerReservas()` (Especiales) | Query `reservas_especiales` | `SELECT * FROM reservas_especiales ORDER BY fecha DESC`. |
| **Reservas** | `registrarNuevaReserva(r)` (Esp.) | Server Action `crearReservaEspecialAction`| `INSERT INTO reservas_especiales (...)`. |
| **Reservas** | `cambiarEstadoReserva(id, col)` | Server Action / Toggle rápido | Alterna booleanos de `entregado` o `devuelto`. |
| **Reservas** | `obtenerProfesoresActivos()` | Query `profesores` | `SELECT * FROM profesores WHERE activo = true ORDER BY nombre ASC`. |
| **PlanoSecu** | `obtenerAulasYEquipos()` | Query `aulas_plano_secu` | Carga inicial del estado de Planta Baja y Planta Alta. |
| **PlanoSecu** | `actualizarEstadoAula(aula, est)`| Server Action + Realtime | `UPDATE aulas_plano_secu SET activo = $2 WHERE id = $1`. Notifica inmediatamente a todos los clientes conectados vía WebSocket. |
| **PlanoSecu** | `guardarEstadoPlano(idPlano)` | Server Action | `UPDATE estado_app SET plano_activo = $1 WHERE id = 'global'`. |
| **Caja** | `guardarCierreCaja(datos)` | Server Action `guardarCierreCajaAction` | Guarda el balance completo incluyendo **recibos**, **Mercado Pago**, **efectivo**, **diferencia**, y **todas las transferencias bancarias** corregidas. |
| **Cumpleaños**| `obtenerCumpleanosProximos()` | Función SQL / Helper `dates.ts` | Calcula alumnos con fecha de cumpleaños dentro de la ventana móvil de los próximos 15 días, contemplando el cruce de año calendario (diciembre -> enero). |

---

### 5. Matriz de Roles y Permisos (RBAC & RLS)

```
┌─────────────────────────────────┬───────────┬──────────────┬───────────┐
│ Funcionalidad / Módulo          │   Admin   │  Secretario  │  Alumno   │
├─────────────────────────────────┼───────────┼──────────────┼───────────┤
│ Navegación: Inicio              │     ✅    │      ✅      │     ✅    │
│ Navegación: Alumnos             │     ✅    │      ✅      │  ✅ (Ficha)│
│ Navegación: Oficina             │     ✅    │      ✅      │     ✅    │
│ Navegación: Reservas            │     ✅    │      ✅      │     ✅    │
│ Navegación: Facturación (Caja)  │     ✅    │      ✅      │     ❌    │
│ Navegación: Cumpleaños          │     ✅    │      ✅      │     ✅    │
│ Navegación: PlanoSecu           │     ✅    │      ✅      │     ✅    │
│ Navegación: Gestión Usuarios    │     ✅    │      ❌      │     ❌    │
├─────────────────────────────────┼───────────┼──────────────┼───────────┤
│ Alumnos: Consultar Ficha        │     ✅    │      ✅      │  ✅ (Solo) │
│ Alumnos: Cargar Jornada Diaria  │     ✅    │      ✅      │     ❌    │
│ Alumnos: Generar Planilla A4    │     ✅    │      ✅      │     ❌    │
│ Alumnos: Nuevo Alumno           │     ✅    │      ❌      │     ❌    │
│ Alumnos: Pactar Horarios        │     ✅    │      ❌      │     ❌    │
│ Alumnos: Editar Jornadas        │     ✅    │      ✅      │     ❌    │
│ Alumnos: Evaluación Becuap      │     ✅    │      ✅      │     ❌    │
│ Facturación: Guardar Cierre     │     ✅    │      ✅      │     ❌    │
│ PlanoSecu: Conmutar Estado TV   │     ✅    │      ✅      │     ✅    │
└─────────────────────────────────┴───────────┴──────────────┴───────────┘
```

---

### 6. Estrategia de Vistas Imprimibles A4 Oficiales

Se implementan 4 componentes con estilos `@media print` dedicados y botones de impresión aislados:

1. **Planilla Mensual de Control de Horas Becuap (A4 Portrait)**:
   - Cabecera oficial: *Vicerrectoría Bienestar Estudiantil - Universidad Adventista del Plata*.
   - Metadatos: Alumno, Legajo, Mes/Año, Departamento Recursos Áulicos.
   - Tabla estricta de 31 filas con columnas `Día`, `Entrada 1`, `Salida 1`, `Entrada 2`, `Salida 2`, `Total`, `Observación` y `Firma`.
   - Fila de pie con el total acumulado en formato `HH:mm`.
   - Bloque formal de firma para **Rafael Carro - RECURSOS ÁULICOS**.

2. **Evaluación Cuatrimestral Becuap (A4 Landscape)**:
   - Formato apaisado para acomodar los 4 o 5 meses del cuatrimestre seleccionado (1º: Marzo a Junio; 2º: Julio a Noviembre).
   - Encabezado con datos del alumno, fecha de inicio en el plan y promedio general.
   - Tabla con los **7 Criterios de Evaluación** calificados numéricamente. Cada nota del 1 al 10 se posiciona dinámicamente en la columna correspondiente:
     - `10` -> Columna **EXCELENTE**
     - `9` u `8` -> Columna **MUY BUENO**
     - `7` o `6` -> Columna **BUENO**
     - `<= 5` -> Columna **REGULAR**
   - Filas inferiores con Informe IASD, Informe Académico, Informe de Conducta, Observaciones del mes, Observación general de cierre de cuatrimestre y casilleros de firma del jefe y del alumno.

3. **Matriz de Reservas del Día (A4 Landscape)**:
   - Impresión limpia del cronograma diario dividida en IAP Mañana y UAP Tarde, ocultando paneles interactivos y menús de navegación.

4. **Informe de Fotocopias por Departamento y Cierre de Caja (A4 Portrait)**:
   - Desglose consolidado de copias por departamento y balance formal de cierre diario (Recibos, Mercado Pago, Efectivo y Banco Galicia).

---

### 7. Plan de Ejecución por Fases (Completado al 100% ✅)

- **FASE 1 (Completada ✅)**:
  - Inspección total del workspace y análisis de los 12 archivos legacy.
  - Generación de `MIGRATION_PLAN.md` con matriz de funcionalidades y radiografía técnica.
  - Creación del archivo `supabase/schema.sql` con 14 tablas normalizadas, triggers de recálculo, índices, RLS, publicaciones Realtime y seed data.
- **FASE 2 (Completada ✅)**:
  - Inicialización del proyecto Next.js 15.1.7 con TypeScript y Tailwind CSS.
  - Configuración de clientes Supabase (`client.ts`, `server.ts`, `admin.ts`, `middleware.ts`).
  - Implementación de Autenticación, Login con diseño UAP, Topbar institucional y Administración de Usuarios (`/usuarios`).
- **FASE 3 (Completada ✅)**:
  - Implementación de Home Dashboard (`/`), Módulo Cumpleaños (`/cumpleanos`) y `PlanoSecu` (`/planosecu`) con Supabase Realtime y modal interactivo.
  - Implementación del módulo de Reservas (`/reservas`: Matriz IAP/UAP + Reservas de Equipos Especiales + `AlertasReservasContext` global para alertas a 15, 10 y 5 min).
- **FASE 4 (Completada ✅)**:
  - Implementación de Gestión de Oficina (`/oficina`: Fotocopias por departamento, Pagos en efectivo, Calculadora de copias e Informe A4 imprimible).
  - Implementación de Control de Caja (`/facturacion`: Generador de recibos secuenciales con tecla Enter, Mercado Pago, persistencia corregida de transferencias Banco Galicia, cálculo de diferencias e impresión de balance formal A4).
- **FASE 5 (Completada ✅)**:
  - Implementación integral del módulo Alumnos (`/alumnos`: Ficha de datos, Registro de jornada por lotes, Modificación por UUID, Pactar Horarios, Planilla mensual A4 Portrait firmada por Rafael Carro, y Evaluación Cuatrimestral A4 Landscape con cálculo automático y distribución en 4 columnas de excelencia).
  - Creación de script de exportación en Google Apps Script (`scripts/export-from-sheets.gs`) y script de migración masiva a Supabase (`scripts/migrate-from-sheets.ts`).
  - Verificación estricta de TypeScript (`npx tsc --noEmit` -> 0 errores) y build de producción Next.js (`npm run build` -> 12/12 páginas generadas con éxito).
