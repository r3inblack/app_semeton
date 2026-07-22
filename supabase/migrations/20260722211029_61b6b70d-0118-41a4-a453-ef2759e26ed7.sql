
-- 1) bank_accounts: restrict read to super_admin
DROP POLICY IF EXISTS "bank_accounts read" ON public.bank_accounts;
CREATE POLICY "bank_accounts read admin" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 2) custom_roles / custom_role_permissions / role_default_permissions: restrict read to super_admin
DROP POLICY IF EXISTS "custom_roles read" ON public.custom_roles;
DROP POLICY IF EXISTS "custom_roles read authenticated" ON public.custom_roles;
CREATE POLICY "custom_roles read admin" ON public.custom_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "custom_role_permissions read" ON public.custom_role_permissions;
DROP POLICY IF EXISTS "custom_role_permissions read authenticated" ON public.custom_role_permissions;
CREATE POLICY "custom_role_permissions read admin" ON public.custom_role_permissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "role_default_permissions read" ON public.role_default_permissions;
DROP POLICY IF EXISTS "role_default_permissions read authenticated" ON public.role_default_permissions;
CREATE POLICY "role_default_permissions read admin" ON public.role_default_permissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 3) pending_employee_bonus: only super_admin or bonus manager or the submitter
DROP POLICY IF EXISTS "peb_read_authenticated" ON public.pending_employee_bonus;
CREATE POLICY "peb_read_scoped" ON public.pending_employee_bonus
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_permission(auth.uid(), 'salary_bonus', 'manage')
    OR created_by = auth.uid()
  );

-- 4) supplier_returns: only super_admin or supplier_returns manager
DROP POLICY IF EXISTS "sr_read_authenticated" ON public.supplier_returns;
CREATE POLICY "sr_read_scoped" ON public.supplier_returns
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_permission(auth.uid(), 'supplier_returns', 'manage')
  );

-- 5) telegram_templates: super_admin only
DROP POLICY IF EXISTS "templates_read_authenticated" ON public.telegram_templates;
CREATE POLICY "templates_read_admin" ON public.telegram_templates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 6) payment-proofs storage bucket: remove anon access. Uploads go through server (service_role).
DROP POLICY IF EXISTS "payment_proofs upload" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs read" ON storage.objects;
CREATE POLICY "payment_proofs read admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'super_admin'));

-- 7) Revoke EXECUTE on all public SECURITY DEFINER (and other) functions from anon / PUBLIC.
--    Grant EXECUTE to authenticated so signed-in users keep working. service_role always allowed.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
