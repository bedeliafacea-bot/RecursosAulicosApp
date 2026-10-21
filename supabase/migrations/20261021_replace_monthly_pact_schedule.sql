CREATE OR REPLACE FUNCTION public.reemplazar_horarios_pactados_mes(
    p_alumno_id TEXT,
    p_anio INTEGER,
    p_mes INTEGER,
    p_horarios JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_inicio DATE;
    v_fin DATE;
BEGIN
    IF auth.uid() IS NULL
       OR public.current_user_role() NOT IN ('admin', 'secretario') THEN
        RAISE EXCEPTION 'No tenés permiso para reemplazar horarios pactados.';
    END IF;

    IF p_alumno_id IS NULL OR btrim(p_alumno_id) = ''
       OR p_anio IS NULL OR p_anio < 2000 OR p_anio > 2100
       OR p_mes IS NULL OR p_mes < 1 OR p_mes > 12
       OR p_horarios IS NULL
       OR jsonb_typeof(p_horarios) <> 'array' THEN
        RAISE EXCEPTION 'El alumno, período o listado de horarios no es válido.';
    END IF;

    PERFORM 1
    FROM public.alumnos
    WHERE id = btrim(p_alumno_id)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El alumno indicado no existe.';
    END IF;

    v_inicio := make_date(p_anio, p_mes, 1);
    v_fin := (v_inicio + INTERVAL '1 month')::DATE;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_horarios) AS horario(fecha DATE, rango_horario TEXT)
        WHERE horario.fecha IS NULL
           OR horario.fecha < v_inicio
           OR horario.fecha >= v_fin
           OR horario.rango_horario IS NULL
           OR btrim(horario.rango_horario) = ''
    ) THEN
        RAISE EXCEPTION 'Todos los horarios deben corresponder al mes elegido.';
    END IF;

    DELETE FROM public.horarios_pactados
    WHERE alumno_id = btrim(p_alumno_id)
      AND fecha >= v_inicio
      AND fecha < v_fin;

    INSERT INTO public.horarios_pactados (alumno_id, fecha, rango_horario)
    SELECT btrim(p_alumno_id), horario.fecha, btrim(horario.rango_horario)
    FROM jsonb_to_recordset(p_horarios) AS horario(fecha DATE, rango_horario TEXT);
END;
$$;

REVOKE ALL ON FUNCTION public.reemplazar_horarios_pactados_mes(TEXT, INTEGER, INTEGER, JSONB)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reemplazar_horarios_pactados_mes(TEXT, INTEGER, INTEGER, JSONB)
    TO authenticated;
