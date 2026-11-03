CREATE TABLE IF NOT EXISTS public.carreras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    sigla TEXT,
    facultad TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT carreras_nombre_no_vacio CHECK (char_length(btrim(nombre)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_carreras_nombre_normalizado
    ON public.carreras (lower(btrim(nombre)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_carreras_sigla_normalizada
    ON public.carreras (lower(btrim(sigla)))
    WHERE sigla IS NOT NULL AND btrim(sigla) <> '';

CREATE TABLE IF NOT EXISTS public.carrera_anios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrera_id UUID NOT NULL REFERENCES public.carreras(id) ON DELETE RESTRICT,
    anio SMALLINT NOT NULL CHECK (anio BETWEEN 1 AND 10),
    plan_estudio TEXT NOT NULL DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT carrera_anios_plan_no_vacio
        CHECK (plan_estudio = '' OR char_length(btrim(plan_estudio)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_carrera_anios_unicos
    ON public.carrera_anios (carrera_id, anio, plan_estudio);

CREATE INDEX IF NOT EXISTS idx_carrera_anios_carrera
    ON public.carrera_anios (carrera_id);

CREATE TABLE IF NOT EXISTS public.materias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    codigo TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT materias_nombre_no_vacio CHECK (char_length(btrim(nombre)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_materias_nombre_normalizado
    ON public.materias (lower(btrim(nombre)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_materias_codigo_normalizado
    ON public.materias (lower(btrim(codigo)))
    WHERE codigo IS NOT NULL AND btrim(codigo) <> '';

CREATE TABLE IF NOT EXISTS public.profesores_universitarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT profesores_universitarios_nombre_no_vacio
        CHECK (char_length(btrim(nombre)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profesores_universitarios_nombre_normalizado
    ON public.profesores_universitarios (lower(btrim(nombre)));

CREATE TABLE IF NOT EXISTS public.materias_carreras_anios (
    materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE RESTRICT,
    carrera_anio_id UUID NOT NULL REFERENCES public.carrera_anios(id) ON DELETE RESTRICT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (materia_id, carrera_anio_id)
);

CREATE INDEX IF NOT EXISTS idx_materias_carreras_anios_carrera_anio
    ON public.materias_carreras_anios (carrera_anio_id);

ALTER TABLE public.carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrera_anios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesores_universitarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias_carreras_anios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de carreras para autenticados" ON public.carreras;
CREATE POLICY "Lectura de carreras para autenticados"
    ON public.carreras FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin y Secretario gestionan carreras" ON public.carreras;
CREATE POLICY "Admin y Secretario gestionan carreras"
    ON public.carreras FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

DROP POLICY IF EXISTS "Lectura de años de carrera para autenticados" ON public.carrera_anios;
CREATE POLICY "Lectura de años de carrera para autenticados"
    ON public.carrera_anios FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin y Secretario gestionan años de carrera" ON public.carrera_anios;
CREATE POLICY "Admin y Secretario gestionan años de carrera"
    ON public.carrera_anios FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

DROP POLICY IF EXISTS "Lectura de materias para autenticados" ON public.materias;
CREATE POLICY "Lectura de materias para autenticados"
    ON public.materias FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin y Secretario gestionan materias" ON public.materias;
CREATE POLICY "Admin y Secretario gestionan materias"
    ON public.materias FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

DROP POLICY IF EXISTS "Lectura de profesores universitarios para autenticados" ON public.profesores_universitarios;
CREATE POLICY "Lectura de profesores universitarios para autenticados"
    ON public.profesores_universitarios FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin y Secretario gestionan profesores universitarios" ON public.profesores_universitarios;
CREATE POLICY "Admin y Secretario gestionan profesores universitarios"
    ON public.profesores_universitarios FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

DROP POLICY IF EXISTS "Lectura de relaciones académicas para autenticados" ON public.materias_carreras_anios;
CREATE POLICY "Lectura de relaciones académicas para autenticados"
    ON public.materias_carreras_anios FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin y Secretario gestionan relaciones académicas" ON public.materias_carreras_anios;
CREATE POLICY "Admin y Secretario gestionan relaciones académicas"
    ON public.materias_carreras_anios FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

GRANT SELECT ON public.carreras TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.carreras TO authenticated;
GRANT SELECT ON public.carrera_anios TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.carrera_anios TO authenticated;
GRANT SELECT ON public.materias TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.materias TO authenticated;
GRANT SELECT ON public.profesores_universitarios TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profesores_universitarios TO authenticated;
GRANT SELECT ON public.materias_carreras_anios TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.materias_carreras_anios TO authenticated;
