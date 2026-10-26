DROP POLICY IF EXISTS "Autenticados pueden gestionar reservas especiales"
    ON public.reservas_especiales;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear reservas especiales"
    ON public.reservas_especiales;
DROP POLICY IF EXISTS "Admin y Secretario actualizan reservas especiales"
    ON public.reservas_especiales;
DROP POLICY IF EXISTS "Admin y Secretario eliminan reservas especiales"
    ON public.reservas_especiales;

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear reservas matriz"
    ON public.reservas_matriz;

CREATE POLICY "Usuarios autenticados pueden crear reservas matriz"
    ON public.reservas_matriz FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('admin', 'secretario', 'alumno')
        AND estado = 'Pendiente'
    );

CREATE POLICY "Usuarios autenticados pueden crear reservas especiales"
    ON public.reservas_especiales FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('admin', 'secretario', 'alumno')
        AND NOT entregado
        AND NOT devuelto
    );

CREATE POLICY "Admin y Secretario actualizan reservas especiales"
    ON public.reservas_especiales FOR UPDATE
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

CREATE POLICY "Admin y Secretario eliminan reservas especiales"
    ON public.reservas_especiales FOR DELETE
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'));
