CREATE OR REPLACE FUNCTION public.actualizar_estado_reserva_especial(
    p_id UUID,
    p_campo TEXT,
    p_valor BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    filas_actualizadas INTEGER;
BEGIN
    IF auth.uid() IS NULL
       OR COALESCE(public.current_user_role(), '') NOT IN ('admin', 'secretario', 'alumno') THEN
        RAISE EXCEPTION 'No tenés permiso para actualizar el estado de la reserva.'
            USING ERRCODE = '42501';
    END IF;

    IF p_campo = 'entregado' THEN
        UPDATE public.reservas_especiales
        SET entregado = p_valor
        WHERE id = p_id;
    ELSIF p_campo = 'devuelto' THEN
        UPDATE public.reservas_especiales
        SET devuelto = p_valor
        WHERE id = p_id;
    ELSE
        RAISE EXCEPTION 'Campo de estado no válido.'
            USING ERRCODE = '22023';
    END IF;

    GET DIAGNOSTICS filas_actualizadas = ROW_COUNT;
    IF filas_actualizadas = 0 THEN
        RAISE EXCEPTION 'No se encontró la reserva especial.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_estado_reserva_especial(UUID, TEXT, BOOLEAN)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_estado_reserva_especial(UUID, TEXT, BOOLEAN)
    TO authenticated;
