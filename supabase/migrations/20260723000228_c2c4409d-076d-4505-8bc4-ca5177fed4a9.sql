
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
  SET LOCAL sql_safe_updates = off;

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

  DELETE FROM public.customer_balances WHERE true;
  DELETE FROM public.supplier_balances WHERE true;
  DELETE FROM public.employee_salary_balances WHERE true;
  DELETE FROM public.stock_levels WHERE true;
  UPDATE public.cash_balance SET amount = 0 WHERE id = 1;

  UPDATE public.profiles SET employee_id = NULL, warehouse_id = NULL WHERE true;

  DELETE FROM public.products WHERE true;
  DELETE FROM public.customers WHERE true;
  DELETE FROM public.suppliers WHERE true;
  DELETE FROM public.employees WHERE true;
  DELETE FROM public.warehouses WHERE true;
  DELETE FROM public.expense_categories WHERE true;
  DELETE FROM public.bank_accounts WHERE true;
  DELETE FROM public.api_keys WHERE true;
  DELETE FROM public.telegram_recipients WHERE true;

  BEGIN
    PERFORM setval('public.customers_code_seq', 1, false);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  DELETE FROM public.user_permissions WHERE user_id <> v_master;
  DELETE FROM public.user_roles WHERE user_id <> v_master;
  DELETE FROM public.profiles WHERE id <> v_master;

  DELETE FROM public.custom_role_permissions WHERE true;
  DELETE FROM public.custom_roles WHERE true;
END;
$function$;
