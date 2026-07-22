
CREATE OR REPLACE FUNCTION public.factory_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master uuid;
BEGIN
  PERFORM public.assert_admin();

  SELECT id INTO v_master FROM public.profiles WHERE is_master = true LIMIT 1;
  IF v_master IS NULL THEN
    RAISE EXCEPTION 'Master admin tidak ditemukan';
  END IF;

  -- Wipe transactions
  TRUNCATE TABLE
    public.cash_movements,
    public.stock_in,
    public.stock_mutations,
    public.sales,
    public.customer_payments,
    public.supplier_payments,
    public.supplier_returns,
    public.expenses,
    public.salary_accruals,
    public.salary_advances,
    public.salary_payments,
    public.employee_bonuses,
    public.pending_stock_in,
    public.pending_customer_payments,
    public.pending_employee_bonus,
    public.telegram_webhook_logs,
    public.api_request_logs
  RESTART IDENTITY;

  -- Wipe balances
  DELETE FROM public.customer_balances;
  DELETE FROM public.supplier_balances;
  DELETE FROM public.employee_salary_balances;
  DELETE FROM public.stock_levels;
  UPDATE public.cash_balance SET amount = 0 WHERE id = 1;

  -- Detach profile FKs before deleting master data
  UPDATE public.profiles SET employee_id = NULL, warehouse_id = NULL;

  -- Wipe master data
  DELETE FROM public.products;
  DELETE FROM public.customers;
  DELETE FROM public.suppliers;
  DELETE FROM public.employees;
  DELETE FROM public.warehouses;
  DELETE FROM public.expense_categories;
  DELETE FROM public.bank_accounts;
  DELETE FROM public.api_keys;
  DELETE FROM public.telegram_recipients;

  -- Reset customer code sequence
  BEGIN
    PERFORM setval('public.customers_code_seq', 1, false);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Wipe users (keep master only)
  DELETE FROM public.user_permissions WHERE user_id <> v_master;
  DELETE FROM public.user_roles WHERE user_id <> v_master;
  DELETE FROM public.profiles WHERE id <> v_master;

  -- Wipe custom roles
  DELETE FROM public.custom_role_permissions;
  DELETE FROM public.custom_roles;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.factory_reset() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factory_reset() TO authenticated;
