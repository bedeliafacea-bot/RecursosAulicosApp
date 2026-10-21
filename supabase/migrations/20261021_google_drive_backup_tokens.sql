CREATE TABLE IF NOT EXISTS public.google_drive_tokens (
    id TEXT PRIMARY KEY CHECK (id = 'primary'),
    refresh_token_encrypted TEXT NOT NULL,
    connected_by UUID REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_drive_tokens FROM anon, authenticated;
GRANT ALL ON public.google_drive_tokens TO service_role;

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
