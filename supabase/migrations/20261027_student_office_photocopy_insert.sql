DROP POLICY IF EXISTS "Usuarios autenticados pueden registrar fotocopias"
    ON public.fotocopias;

CREATE POLICY "Usuarios autenticados pueden registrar fotocopias"
    ON public.fotocopias FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario', 'alumno'));

DROP POLICY IF EXISTS "Usuarios autenticados pueden registrar pagos en efectivo"
    ON public.pagos_efectivo;

CREATE POLICY "Usuarios autenticados pueden registrar pagos en efectivo"
    ON public.pagos_efectivo FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario', 'alumno'));
