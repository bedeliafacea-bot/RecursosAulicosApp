ALTER TABLE public.alumnos
    ADD COLUMN IF NOT EXISTS foto_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'fotos-alumnos',
    'Fotos de alumnos',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Usuarios autenticados ven fotos de alumnos" ON storage.objects;
CREATE POLICY "Usuarios autenticados ven fotos de alumnos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'fotos-alumnos');

DROP POLICY IF EXISTS "Admin y Secretario cargan fotos de alumnos" ON storage.objects;
CREATE POLICY "Admin y Secretario cargan fotos de alumnos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'fotos-alumnos'
        AND public.current_user_role() IN ('admin', 'secretario')
    );

DROP POLICY IF EXISTS "Admin y Secretario actualizan fotos de alumnos" ON storage.objects;
CREATE POLICY "Admin y Secretario actualizan fotos de alumnos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'fotos-alumnos'
        AND public.current_user_role() IN ('admin', 'secretario')
    )
    WITH CHECK (
        bucket_id = 'fotos-alumnos'
        AND public.current_user_role() IN ('admin', 'secretario')
    );

DROP POLICY IF EXISTS "Admin y Secretario eliminan fotos de alumnos" ON storage.objects;
CREATE POLICY "Admin y Secretario eliminan fotos de alumnos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'fotos-alumnos'
        AND public.current_user_role() IN ('admin', 'secretario')
    );
