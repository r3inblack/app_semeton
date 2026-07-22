GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_recipients TO authenticated;
GRANT ALL ON public.telegram_recipients TO service_role;
ALTER TABLE public.telegram_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super_admin manage telegram_recipients" ON public.telegram_recipients;
CREATE POLICY "super_admin manage telegram_recipients" ON public.telegram_recipients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));