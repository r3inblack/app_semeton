
-- Explicit deny write policies for tables writable only via SECURITY DEFINER RPCs / service_role.
-- Financial ledger + inventory tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cash_movements','sales','expenses','customer_payments','supplier_payments',
    'salary_accruals','salary_advances','employee_bonuses','stock_in','stock_mutations',
    'customer_balances','supplier_balances'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_deny_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_deny_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_deny_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (false)', t||'_deny_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false)', t||'_deny_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated, anon USING (false)', t||'_deny_delete', t);
  END LOOP;
END $$;

-- role_default_permissions: only super_admin can write
DROP POLICY IF EXISTS role_defaults_admin_write ON public.role_default_permissions;
CREATE POLICY role_defaults_admin_write ON public.role_default_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
