
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_roles_read" ON public.custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_roles_admin_write" ON public.custom_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.custom_role_permissions (
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  PRIMARY KEY (custom_role_id, module, action)
);
GRANT SELECT ON public.custom_role_permissions TO authenticated;
GRANT ALL ON public.custom_role_permissions TO service_role;
ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crp_read" ON public.custom_role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "crp_admin_write" ON public.custom_role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

ALTER TABLE public.profiles
  ADD COLUMN custom_role_id uuid REFERENCES public.custom_roles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.touch_custom_roles_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_custom_roles_updated_at BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_custom_roles_updated_at();
