-- ==============================================================================
-- SISTEMA DE GESTIÓN: RECURSOS ÁULICOS | BEDELÍA - UNIVERSIDAD ADVENTISTA DEL PLATA
-- ESQUEMA COMPLETO DE BASE DE DATOS POSTGRESQL (SUPABASE)
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- 2. TABLA DE PERFILES DE USUARIOS Y ROLES (RBAC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    usuario TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'secretario', 'alumno')),
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_perfiles_usuario ON public.perfiles_usuarios(usuario);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON public.perfiles_usuarios(rol);

-- ==============================================================================
-- 3. TABLA DE ALUMNOS BECARIOS (PLAN BECUAP)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.alumnos (
    id TEXT PRIMARY KEY, -- Legajo / ID del Alumno
    nombre TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('10hs', '20hs')),
    carrera TEXT,
    telefono TEXT,
    direccion TEXT,
    fecha_nacimiento DATE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_alumnos_nombre ON public.alumnos(nombre);
CREATE INDEX IF NOT EXISTS idx_alumnos_plan ON public.alumnos(plan);

-- ==============================================================================
-- 4. TABLA DE JORNADAS CARGADAS (REGISTROS ALUMNOS BECUAP)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jornadas_becuap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id TEXT NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    entrada_1 TIME,
    salida_1 TIME,
    entrada_2 TIME,
    salida_2 TIME,
    total_decimal NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    observacion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_jornadas_alumno_fecha ON public.jornadas_becuap(alumno_id, fecha);
CREATE INDEX IF NOT EXISTS idx_jornadas_fecha ON public.jornadas_becuap(fecha);

-- ==============================================================================
-- 5. TABLA DE HORARIOS PACTADOS MENSUALES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.horarios_pactados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id TEXT NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    rango_horario TEXT NOT NULL, -- Ej: '07:30 - 11:30'
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_horarios_pactados_alumno_fecha ON public.horarios_pactados(alumno_id, fecha);

-- ==============================================================================
-- 6. TABLA DE EVALUACIONES CUATRIMESTRALES (BECUAP)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.evaluaciones_becuap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id TEXT NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    cuatrimestre SMALLINT NOT NULL CHECK (cuatrimestre IN (1, 2)),
    anio INTEGER NOT NULL,
    departamento TEXT NOT NULL DEFAULT 'Recursos Áulicos',
    fecha_inicio_plan TEXT,
    promedio NUMERIC(4,2),
    marzo JSONB,      -- { "notas": [10, 9, 8, 10, 9, 8, 10], "observacion": "..." }
    abril JSONB,
    mayo JSONB,
    junio JSONB,
    julio JSONB,
    agosto JSONB,
    septiembre JSONB,
    octubre JSONB,
    noviembre JSONB,
    obs_general TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_evaluacion_alumno_periodo UNIQUE (alumno_id, cuatrimestre, anio)
);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_alumno ON public.evaluaciones_becuap(alumno_id, anio);

-- ==============================================================================
-- 7. TABLA DE DEPARTAMENTOS DE LA UAP
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_departamentos_nombre ON public.departamentos(nombre);

-- ==============================================================================
-- 8. TABLA DE GASTOS DE FOTOCOPIAS POR DEPARTAMENTO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fotocopias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
    departamento_nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad >= 0),
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fotocopias_fecha ON public.fotocopias(fecha);
CREATE INDEX IF NOT EXISTS idx_fotocopias_depto ON public.fotocopias(departamento_nombre);

-- ==============================================================================
-- 9. TABLA DE PAGOS EN EFECTIVO POR FOTOCOPIAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pagos_efectivo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    cantidad_copias INTEGER NOT NULL CHECK (cantidad_copias >= 0),
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pagos_efectivo_fecha ON public.pagos_efectivo(fecha);

-- ==============================================================================
-- 10. TABLA DE PROFESORES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profesores (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profesores_nombre ON public.profesores(nombre);

-- ============================================================================
-- 10.1 CATÁLOGO DE RECURSOS PARA RESERVAS DE LA MATRIZ
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recursos_nombre ON public.recursos(nombre);

INSERT INTO public.recursos (nombre, activo) VALUES
('Proyector', true),
('Audio', true),
('Proyector + Audio', true),
('Notebook ASSUS', true),
('TV Móvil', true)
ON CONFLICT (nombre) DO NOTHING;

-- ==============================================================================
-- 11. TABLA DE RESERVAS SEMANALES (MATRIZ IAP / UAP)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reservas_matriz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia TEXT NOT NULL CHECK (dia IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes')),
    profesor_id TEXT REFERENCES public.profesores(id) ON DELETE SET NULL,
    profesor_nombre TEXT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula TEXT NOT NULL,
    recurso TEXT NOT NULL, -- Proyector, Audio, Proyector + Audio, Notebook ASSUS, etc.
    estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pausado', 'Finalizado')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reservas_matriz_dia ON public.reservas_matriz(dia);
CREATE INDEX IF NOT EXISTS idx_reservas_matriz_profesor ON public.reservas_matriz(profesor_nombre);
CREATE INDEX IF NOT EXISTS idx_reservas_matriz_estado ON public.reservas_matriz(estado);

-- ==============================================================================
-- 12. TABLA DE RESERVAS ESPECIALES DE EQUIPOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reservas_especiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    departamento TEXT NOT NULL,
    equipo TEXT NOT NULL,
    horario TEXT NOT NULL,
    observaciones TEXT,
    telefono TEXT,
    entregado BOOLEAN NOT NULL DEFAULT false,
    devuelto BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reservas_especiales_fecha ON public.reservas_especiales(fecha);

-- ==============================================================================
-- 13. TABLA DE CIERRES DE CAJA (CORRIGE BUG DE TRANSFERENCIAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cierres_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    total_recibos NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_mercado_pago NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_efectivo NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_transferencias NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- Corregido: se persistía en frontend pero se perdía en backend
    diferencia NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    recibos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    mercado_pago_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    efectivo_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    transferencias_json JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Corregido: lista de transferencias Galicia con recibo, fecha y monto
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cierres_caja_fecha ON public.cierres_caja(fecha);

-- ==============================================================================
-- 14. TABLA DE AULAS DEL PLANO SECUNDARIO (REALTIME)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.aulas_plano_secu (
    id TEXT PRIMARY KEY, -- 'Aula 15', 'Aula 14', 'Aula 32', etc.
    planta TEXT NOT NULL CHECK (planta IN ('PB', 'PA')),
    tv TEXT,             -- Modelo / Identificador del TV
    activo BOOLEAN NOT NULL DEFAULT false, -- True = Control entregado (Verde)
    grid_fila TEXT,
    grid_columna TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_aulas_planta ON public.aulas_plano_secu(planta);

-- ==============================================================================
-- 15. TABLA DE ESTADO GENERAL DE LA APLICACIÓN
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.estado_app (
    id TEXT PRIMARY KEY DEFAULT 'global',
    plano_activo TEXT NOT NULL DEFAULT 'PB',
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 16. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==============================================================================

-- Función genérica para actualizar el campo actualizado_en
CREATE OR REPLACE FUNCTION public.fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para perfiles_usuarios
CREATE TRIGGER tr_actualizar_perfiles_usuarios
    BEFORE UPDATE ON public.perfiles_usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

-- Trigger para alumnos
CREATE TRIGGER tr_actualizar_alumnos
    BEFORE UPDATE ON public.alumnos
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

-- Trigger para jornadas_becuap
CREATE TRIGGER tr_actualizar_jornadas_becuap
    BEFORE UPDATE ON public.jornadas_becuap
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

-- Trigger para evaluaciones_becuap
CREATE TRIGGER tr_actualizar_evaluaciones_becuap
    BEFORE UPDATE ON public.evaluaciones_becuap
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

-- Trigger para reservas_matriz
CREATE TRIGGER tr_actualizar_reservas_matriz
    BEFORE UPDATE ON public.reservas_matriz
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

-- Trigger para reservas_especiales
CREATE TRIGGER tr_actualizar_reservas_especiales
    BEFORE UPDATE ON public.reservas_especiales
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

-- Trigger para aulas_plano_secu
CREATE TRIGGER tr_actualizar_aulas_plano_secu
    BEFORE UPDATE ON public.aulas_plano_secu
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

-- Trigger para calcular horas decimales en jornadas si no se enviaron explícitamente
CREATE OR REPLACE FUNCTION public.fn_calcular_horas_jornada()
RETURNS TRIGGER AS $$
DECLARE
    min_t1 INTEGER := 0;
    min_t2 INTEGER := 0;
BEGIN
    IF NEW.entrada_1 IS NOT NULL AND NEW.salida_1 IS NOT NULL AND NEW.salida_1 > NEW.entrada_1 THEN
        min_t1 := EXTRACT(EPOCH FROM (NEW.salida_1 - NEW.entrada_1)) / 60;
    END IF;

    IF NEW.entrada_2 IS NOT NULL AND NEW.salida_2 IS NOT NULL AND NEW.salida_2 > NEW.entrada_2 THEN
        min_t2 := EXTRACT(EPOCH FROM (NEW.salida_2 - NEW.entrada_2)) / 60;
    END IF;

    IF min_t1 > 0 OR min_t2 > 0 THEN
        NEW.total_decimal := ROUND(((min_t1 + min_t2)::NUMERIC / 60.0), 2);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calcular_horas_jornada
    BEFORE INSERT OR UPDATE OF entrada_1, salida_1, entrada_2, salida_2 ON public.jornadas_becuap
    FOR EACH ROW EXECUTE FUNCTION public.fn_calcular_horas_jornada();

-- Trigger para recalcular total en fotocopias
CREATE OR REPLACE FUNCTION public.fn_calcular_total_fotocopias()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total := ROUND((NEW.cantidad::NUMERIC * NEW.valor_unitario::NUMERIC), 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calcular_total_fotocopias
    BEFORE INSERT OR UPDATE OF cantidad, valor_unitario ON public.fotocopias
    FOR EACH ROW EXECUTE FUNCTION public.fn_calcular_total_fotocopias();

-- Trigger para recalcular total en pagos de efectivo
CREATE OR REPLACE FUNCTION public.fn_calcular_total_efectivo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total := ROUND((NEW.cantidad_copias::NUMERIC * NEW.valor_unitario::NUMERIC), 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calcular_total_efectivo
    BEFORE INSERT OR UPDATE OF cantidad_copias, valor_unitario ON public.pagos_efectivo
    FOR EACH ROW EXECUTE FUNCTION public.fn_calcular_total_efectivo();

-- Trigger automático al crear usuario en auth.users para crear perfil inicial
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles_usuarios (id, usuario, nombre, rol, activo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'usuario', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario UAP'),
        COALESCE(NEW.raw_user_meta_data->>'rol', 'alumno'),
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ==============================================================================
-- 17. PUBLICACIÓN SUPABASE REALTIME (WEBSOCKETS)
-- ==============================================================================
-- Habilitamos la réplica completa para Realtime
ALTER TABLE public.aulas_plano_secu REPLICA IDENTITY FULL;
ALTER TABLE public.reservas_matriz REPLICA IDENTITY FULL;
ALTER TABLE public.estado_app REPLICA IDENTITY FULL;

-- Agregamos las tablas a la publicación de Realtime de Supabase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'aulas_plano_secu'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.aulas_plano_secu;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'reservas_matriz'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas_matriz;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'estado_app'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.estado_app;
    END IF;
END $$;

-- ==============================================================================
-- 18. SEGURIDAD Y POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Función auxiliar para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT rol FROM public.perfiles_usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Habilitar RLS en todas las tablas
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas_becuap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_pactados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_becuap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotocopias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_efectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_matriz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_especiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_plano_secu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estado_app ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: perfiles_usuarios
CREATE POLICY "Lectura de perfiles para usuarios autenticados"
    ON public.perfiles_usuarios FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Solo admin gestiona perfiles de usuarios"
    ON public.perfiles_usuarios FOR ALL
    TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- POLÍTICAS: alumnos
CREATE POLICY "Lectura de alumnos para todos los autenticados"
    ON public.alumnos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin y Secretario pueden crear y modificar alumnos"
    ON public.alumnos FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

-- POLÍTICAS: jornadas_becuap
CREATE POLICY "Lectura de jornadas para autenticados"
    ON public.jornadas_becuap FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin y Secretario gestionan jornadas"
    ON public.jornadas_becuap FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

-- POLÍTICAS: horarios_pactados
CREATE POLICY "Lectura de horarios pactados para autenticados"
    ON public.horarios_pactados FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Solo admin puede pactar horarios"
    ON public.horarios_pactados FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

-- POLÍTICAS: evaluaciones_becuap
CREATE POLICY "Lectura de evaluaciones para autenticados"
    ON public.evaluaciones_becuap FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin y Secretario gestionan evaluaciones"
    ON public.evaluaciones_becuap FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

-- POLÍTICAS: departamentos, fotocopias y pagos_efectivo (Módulo Oficina)
CREATE POLICY "Lectura de departamentos para autenticados"
    ON public.departamentos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Lectura de fotocopias para autenticados"
    ON public.fotocopias FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin y Secretario gestionan fotocopias"
    ON public.fotocopias FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

CREATE POLICY "Lectura de pagos efectivo para autenticados"
    ON public.pagos_efectivo FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin y Secretario gestionan pagos en efectivo"
    ON public.pagos_efectivo FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

-- POLÍTICAS: profesores, reservas_matriz y reservas_especiales
CREATE POLICY "Lectura de profesores para autenticados"
    ON public.profesores FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Lectura de recursos para autenticados"
    ON public.recursos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Lectura de reservas matriz para autenticados"
    ON public.reservas_matriz FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin y Secretario gestionan matriz de reservas"
    ON public.reservas_matriz FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

CREATE POLICY "Lectura de reservas especiales para autenticados"
    ON public.reservas_especiales FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Autenticados pueden gestionar reservas especiales"
    ON public.reservas_especiales FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- POLÍTICAS: cierres_caja (Solo admin y secretario)
CREATE POLICY "Admin y Secretario gestionan cierres de caja"
    ON public.cierres_caja FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

-- POLÍTICAS: plano secundario y estado app (Acceso abierto a lectura y toggle)
CREATE POLICY "Lectura de aulas plano secundario"
    ON public.aulas_plano_secu FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Modificación de estado en aulas plano secundario"
    ON public.aulas_plano_secu FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Lectura de estado app"
    ON public.estado_app FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Modificación de estado app"
    ON public.estado_app FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 19. DATOS SEMILLA INICIALES (SEED DATA)
-- ==============================================================================

-- A. ESTADO APP INICIAL
INSERT INTO public.estado_app (id, plano_activo)
VALUES ('global', 'PB')
ON CONFLICT (id) DO NOTHING;

-- B. AULAS PLANO SECUNDARIO (PLANTA BAJA Y PLANTA ALTA)
INSERT INTO public.aulas_plano_secu (id, planta, tv, activo, grid_fila, grid_columna, orden) VALUES
-- Planta Baja
('Aula 15', 'PB', 'Samsung 55"', false, '1', '2', 1),
('Aula 14', 'PB', 'Philips 50"', false, '1', '3', 2),
('Aula 13', 'PB', 'BGH 55"', false, '1', '4', 3),
('Aula 12', 'PB', 'Samsung 50"', false, '1', '5', 4),
('Aula 11', 'PB', 'LG 55"', false, '1', '7', 5),
('Aula 17', 'PB', 'TCL 50"', false, '2', '1', 6),
('Aula 18', 'PB', 'Philips 55"', false, '3', '1', 7),
('Aula 19', 'PB', 'Samsung 50"', false, '4', '1', 8),
('Aula 20', 'PB', 'Sony 55"', false, '5', '1', 9),
('Aula 5',  'PB', 'TCL 65"', false, '6', '5', 10),

-- Planta Alta
('Aula 32', 'PA', 'Samsung 55"', false, '1', '2', 11),
('Aula 33', 'PA', 'Philips 50"', false, '1', '4', 12),
('Aula 30', 'PA', 'BGH 50"', false, '2', '1', 13),
('Aula 29', 'PA', 'LG 50"', false, '3', '1', 14),
('LAB 2',   'PA', 'Samsung 65"', false, '4', '1', 15),
('Aula 27', 'PA', 'Sony 50"', false, '5', '1', 16),
('Aula 26', 'PA', 'Philips 55"', false, '5', '2', 17)
ON CONFLICT (id) DO UPDATE 
SET planta = EXCLUDED.planta, tv = EXCLUDED.tv, grid_fila = EXCLUDED.grid_fila, grid_columna = EXCLUDED.grid_columna, orden = EXCLUDED.orden;

-- C. DEPARTAMENTOS DE LA UAP
INSERT INTO public.departamentos (nombre, activo) VALUES
('Recursos Áulicos', true),
('Vicerrectoría Bienestar Estudiantil', true),
('Vicerrectoría Académica', true),
('Vicerrectoría Económico-Financiera', true),
('Facultad de Teología', true),
('Facultad de Ciencias de la Salud', true),
('Facultad de Ciencias Económicas y de la Administración', true),
('Facultad de Humanidades, Educación y Ciencias Sociales', true),
('Instituto Adventista del Plata (IAP)', true),
('Biblioteca Central E. G. White', true),
('Mantenimiento y Obras', true),
('Sistemas y Tecnologías de la Información', true),
('Bedelía Central', true),
('Extensión Universitaria y Pastoral', true),
('Residencia Estudiantil Varones', true),
('Residencia Estudiantil Mujeres', true),
('Servicio de Alimentos (Comedor)', true),
('Imprenta y Publicaciones UAP', true)
ON CONFLICT (nombre) DO NOTHING;

-- D. PROFESORES BASE
INSERT INTO public.profesores (id, nombre, activo) VALUES
('PROF-001', 'Prof. Roberto Schmidt', true),
('PROF-002', 'Prof. Daniel Ramos', true),
('PROF-003', 'Prof. Elena Mayer', true),
('PROF-004', 'Prof. Carlos Rossi', true),
('PROF-005', 'Prof. María Fernández', true),
('PROF-006', 'Prof. Javier Benítez', true),
('PROF-007', 'Prof. Patricia Giménez', true),
('PROF-008', 'Prof. Alberto Fontana', true)
ON CONFLICT (id) DO NOTHING;
