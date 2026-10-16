ALTER POLICY "Solo admin puede pactar horarios"
    ON public.horarios_pactados
    USING (public.current_user_role() IN ('admin', 'secretario'))
    WITH CHECK (public.current_user_role() IN ('admin', 'secretario'));