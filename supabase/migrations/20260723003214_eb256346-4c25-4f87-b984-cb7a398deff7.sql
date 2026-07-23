CREATE OR REPLACE FUNCTION public.factory_reset()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_master uuid;
BEGIN
  PERFORM public.assert_admin();

  SELECT id INTO v_master FROM public.profiles WHERE is_master = true LIMIT 1;
  IF v_master IS NULL THEN
    RAISE EXCEPTION 'Master admin tidak ditemukan';
  END IF;

  TRUNCATE TABLE
    public.cash_movements, public.stock_in, public.stock_mutations, public.sales,
    public.customer_payments, public.supplier_payments, public.supplier_returns,
    public.expenses, public.salary_accruals, public.salary_advances,
    public.salary_payments, public.employee_bonuses, public.pending_stock_in,
    public.pending_customer_payments, public.pending_employee_bonus,
    public.telegram_webhook_logs, public.api_request_logs
  RESTART IDENTITY;

  TRUNCATE TABLE public.customer_balances, public.supplier_balances,
    public.employee_salary_balances, public.stock_levels;

  UPDATE public.cash_balance SET amount = 0 WHERE id = 1;

  UPDATE public.profiles SET employee_id = NULL, warehouse_id = NULL WHERE id = id;

  DELETE FROM public.user_permissions WHERE user_id <> v_master;
  DELETE FROM public.user_roles WHERE user_id <> v_master;
  DELETE FROM public.profiles WHERE id <> v_master;

  TRUNCATE TABLE public.custom_role_permissions, public.custom_roles,
    public.products, public.customers, public.suppliers, public.employees,
    public.warehouses, public.expense_categories, public.bank_accounts,
    public.api_keys, public.telegram_recipients CASCADE;

  BEGIN
    PERFORM setval('public.customers_code_seq', 1, false);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$function$;