CREATE TABLE IF NOT EXISTS public.recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recursos_nombre ON public.recursos(nombre);

ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de recursos para autenticados" ON public.recursos;
CREATE POLICY "Lectura de recursos para autenticados"
    ON public.recursos FOR SELECT
    TO authenticated
    USING (true);

GRANT SELECT ON public.recursos TO authenticated;

INSERT INTO public.recursos (nombre, activo) VALUES
    ('Proyector', true),
    ('Audio', true),
    ('Proyector + Audio', true),
    ('Notebook ASSUS', true),
    ('TV Móvil', true)
ON CONFLICT (nombre) DO NOTHING;
