ALTER TABLE public.reservas_especiales REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'reservas_especiales'
    ) THEN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.reservas_especiales;
    END IF;
END $$;
