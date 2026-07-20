
-- 1. Restrict SELECT on sensitive tables to super_admin
DROP POLICY IF EXISTS app_settings_all_read ON public.app_settings;
CREATE POLICY app_settings_admin_read ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS customers_read ON public.customers;
CREATE POLICY customers_admin_read ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS suppliers_read ON public.suppliers;
CREATE POLICY suppliers_admin_read ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS employees_read ON public.employees;
CREATE POLICY employees_admin_read ON public.employees
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 2. Public helper to expose only the app display name to any logged-in user
CREATE OR REPLACE FUNCTION public.get_app_name()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_name FROM public.app_settings WHERE id = 1
$$;

-- 3. Lock down EXECUTE on SECURITY DEFINER functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE to authenticated for functions the app calls from the client
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_warehouse_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_in(uuid, uuid, uuid, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mutation(uuid, uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sale(uuid, uuid, uuid, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_expense(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_salary_accrual(uuid, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_salary_advance(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_salary_payment(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_employee_bonus(uuid, uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_initial_stock(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_initial_cash(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_initial_receivable(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_initial_payable(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_initial_salary(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_transactions() TO authenticated;
