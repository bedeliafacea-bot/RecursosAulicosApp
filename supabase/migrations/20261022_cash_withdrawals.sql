CREATE TABLE IF NOT EXISTS public.retiros_efectivo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL CHECK (char_length(btrim(descripcion)) BETWEEN 1 AND 160),
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_retiros_efectivo_fecha
    ON public.retiros_efectivo(fecha);

ALTER TABLE public.retiros_efectivo ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.retiros_efectivo FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retiros_efectivo TO authenticated;

CREATE POLICY "Lectura de retiros de efectivo para autenticados"
    ON public.retiros_efectivo FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin y Secretario gestionan retiros de efectivo"
    ON public.retiros_efectivo FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));

CREATE OR REPLACE FUNCTION public.delete_monthly_backup_rows(
    p_table TEXT,
    p_rows JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    expected_count INTEGER;
    deleted_count INTEGER;
BEGIN
    IF jsonb_typeof(p_rows) <> 'array' THEN
        RAISE EXCEPTION 'p_rows debe ser un arreglo JSON';
    END IF;
    expected_count := jsonb_array_length(p_rows);

    CASE p_table
        WHEN 'jornadas_becuap' THEN
            DELETE FROM public.jornadas_becuap AS current_row
            USING jsonb_array_elements(p_rows) AS item(row_data)
            WHERE current_row.id = (item.row_data->>'id')::UUID
              AND to_jsonb(current_row) = item.row_data;
        WHEN 'horarios_pactados' THEN
            DELETE FROM public.horarios_pactados AS current_row
            USING jsonb_array_elements(p_rows) AS item(row_data)
            WHERE current_row.id = (item.row_data->>'id')::UUID
              AND to_jsonb(current_row) = item.row_data;
        WHEN 'fotocopias' THEN
            DELETE FROM public.fotocopias AS current_row
            USING jsonb_array_elements(p_rows) AS item(row_data)
            WHERE current_row.id = (item.row_data->>'id')::UUID
              AND to_jsonb(current_row) = item.row_data;
        WHEN 'pagos_efectivo' THEN
            DELETE FROM public.pagos_efectivo AS current_row
            USING jsonb_array_elements(p_rows) AS item(row_data)
            WHERE current_row.id = (item.row_data->>'id')::UUID
              AND to_jsonb(current_row) = item.row_data;
        WHEN 'retiros_efectivo' THEN
            DELETE FROM public.retiros_efectivo AS current_row
            USING jsonb_array_elements(p_rows) AS item(row_data)
            WHERE current_row.id = (item.row_data->>'id')::UUID
              AND to_jsonb(current_row) = item.row_data;
        WHEN 'reservas_especiales' THEN
            DELETE FROM public.reservas_especiales AS current_row
            USING jsonb_array_elements(p_rows) AS item(row_data)
            WHERE current_row.id = (item.row_data->>'id')::UUID
              AND to_jsonb(current_row) = item.row_data;
        WHEN 'cierres_caja' THEN
            DELETE FROM public.cierres_caja AS current_row
            USING jsonb_array_elements(p_rows) AS item(row_data)
            WHERE current_row.id = (item.row_data->>'id')::UUID
              AND to_jsonb(current_row) = item.row_data;
        ELSE
            RAISE EXCEPTION 'Tabla no permitida para limpieza mensual: %', p_table;
    END CASE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count <> expected_count THEN
        RAISE EXCEPTION
            'Los datos de % cambiaron desde el respaldo; se esperaba borrar % filas y se encontraron %',
            p_table, expected_count, deleted_count
            USING ERRCODE = '40001';
    END IF;

    RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_monthly_backup_rows(TEXT, JSONB)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_monthly_backup_rows(TEXT, JSONB)
    TO service_role;
