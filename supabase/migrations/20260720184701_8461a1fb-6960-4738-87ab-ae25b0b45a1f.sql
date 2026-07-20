
-- =========================================================
-- 1. TABEL MATRIKS DEFAULT PER ROLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.role_default_permissions (
  role public.app_role NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  PRIMARY KEY (role, module, action)
);
GRANT SELECT ON public.role_default_permissions TO authenticated;
GRANT ALL ON public.role_default_permissions TO service_role;
ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_defaults_read ON public.role_default_permissions
  FOR SELECT TO authenticated USING (true);

-- =========================================================
-- 2. TABEL IZIN PER-USER (untuk role custom / override)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, module, action)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_perms_self_read ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY user_perms_admin_write ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- 3. FUNGSI PERMISSION
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_permission(_user uuid, _module text, _action text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _role public.app_role;
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;

  SELECT role INTO _role FROM public.user_roles WHERE user_id = _user
    ORDER BY (role = 'super_admin') DESC LIMIT 1;
  IF _role IS NULL THEN RETURN false; END IF;

  IF _role = 'super_admin' THEN RETURN true; END IF;

  IF _role = 'custom' THEN
    RETURN COALESCE(
      (SELECT allowed FROM public.user_permissions
       WHERE user_id = _user AND module = _module AND action = _action
       LIMIT 1), false);
  END IF;

  RETURN COALESCE(
    (SELECT allowed FROM public.role_default_permissions
     WHERE role = _role AND module = _module AND action = _action
     LIMIT 1), false);
END; $$;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_permission(_module text, _action text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), _module, _action) THEN
    RAISE EXCEPTION 'forbidden: butuh izin % pada modul %', _action, _module;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.assert_permission(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_permission(text, text) TO authenticated;

-- =========================================================
-- 4. SEED MATRIKS DEFAULT
-- =========================================================
TRUNCATE public.role_default_permissions;

-- helper: insert baris
-- modules yg dipakai UI/RPC:
--   master_customers, master_suppliers, master_employees, master_warehouses, master_products,
--   stock_levels, stock_in, stock_mutations,
--   sales, payments_customer, payments_supplier, expenses,
--   salary_accrual, salary_advance, salary_payment, salary_bonus,
--   reports_cashflow, reports_receivables, reports_payables, reports_mutations,
--   users, settings_app, settings_telegram, settings_initial, settings_reset,
--   dashboard

-- ADMIN: semua kecuali settings_initial & settings_reset
INSERT INTO public.role_default_permissions(role, module, action, allowed)
SELECT 'admin'::public.app_role, m, a, true
FROM unnest(ARRAY[
  'dashboard','master_customers','master_suppliers','master_employees','master_warehouses','master_products',
  'stock_levels','stock_in','stock_mutations','sales','payments_customer','payments_supplier','expenses',
  'salary_accrual','salary_advance','salary_payment','salary_bonus',
  'reports_cashflow','reports_receivables','reports_payables','reports_mutations',
  'users','settings_app','settings_telegram'
]) AS m
CROSS JOIN unnest(ARRAY['view','manage']) AS a;

-- MANAGER: hanya view semua kecuali users & settings_*
INSERT INTO public.role_default_permissions(role, module, action, allowed)
SELECT 'manager'::public.app_role, m, 'view', true
FROM unnest(ARRAY[
  'dashboard','master_customers','master_suppliers','master_employees','master_warehouses','master_products',
  'stock_levels','stock_in','stock_mutations','sales','payments_customer','payments_supplier','expenses',
  'salary_accrual','salary_advance','salary_payment','salary_bonus',
  'reports_cashflow','reports_receivables','reports_payables','reports_mutations'
]) AS m;

-- STAFF KEUANGAN
INSERT INTO public.role_default_permissions(role, module, action, allowed) VALUES
  ('staff_keuangan','dashboard','view',true),
  ('staff_keuangan','master_customers','view',true),
  ('staff_keuangan','master_suppliers','view',true),
  ('staff_keuangan','master_employees','view',true),
  ('staff_keuangan','master_products','view',true),
  ('staff_keuangan','master_warehouses','view',true),
  ('staff_keuangan','stock_levels','view',true),
  ('staff_keuangan','payments_customer','view',true),
  ('staff_keuangan','payments_customer','manage',true),
  ('staff_keuangan','payments_supplier','view',true),
  ('staff_keuangan','payments_supplier','manage',true),
  ('staff_keuangan','expenses','view',true),
  ('staff_keuangan','expenses','manage',true),
  ('staff_keuangan','salary_accrual','view',true),
  ('staff_keuangan','salary_accrual','manage',true),
  ('staff_keuangan','salary_advance','view',true),
  ('staff_keuangan','salary_advance','manage',true),
  ('staff_keuangan','salary_payment','view',true),
  ('staff_keuangan','salary_payment','manage',true),
  ('staff_keuangan','salary_bonus','view',true),
  ('staff_keuangan','reports_cashflow','view',true),
  ('staff_keuangan','reports_receivables','view',true),
  ('staff_keuangan','reports_payables','view',true),
  ('staff_keuangan','reports_mutations','view',true);

-- KASIR
INSERT INTO public.role_default_permissions(role, module, action, allowed) VALUES
  ('kasir','dashboard','view',true),
  ('kasir','master_customers','view',true),
  ('kasir','master_products','view',true),
  ('kasir','stock_levels','view',true),
  ('kasir','sales','view',true),
  ('kasir','sales','manage',true),
  ('kasir','payments_customer','view',true),
  ('kasir','payments_customer','manage',true);

-- STAF GUDANG
INSERT INTO public.role_default_permissions(role, module, action, allowed) VALUES
  ('staf_gudang','dashboard','view',true),
  ('staf_gudang','master_products','view',true),
  ('staf_gudang','master_warehouses','view',true),
  ('staf_gudang','master_suppliers','view',true),
  ('staf_gudang','stock_levels','view',true),
  ('staf_gudang','stock_in','view',true),
  ('staf_gudang','stock_in','manage',true),
  ('staf_gudang','stock_mutations','view',true),
  ('staf_gudang','stock_mutations','manage',true);

-- VIEWER / AUDITOR: view semua kecuali users + settings
INSERT INTO public.role_default_permissions(role, module, action, allowed)
SELECT 'viewer'::public.app_role, m, 'view', true
FROM unnest(ARRAY[
  'dashboard','master_customers','master_suppliers','master_employees','master_warehouses','master_products',
  'stock_levels','stock_in','stock_mutations','sales','payments_customer','payments_supplier','expenses',
  'salary_accrual','salary_advance','salary_payment','salary_bonus',
  'reports_cashflow','reports_receivables','reports_payables','reports_mutations'
]) AS m;

-- =========================================================
-- 5. UPDATE RPC: ganti assert_admin ke assert_permission
--    (kecuali RPC setup awal & reset — tetap super_admin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.record_stock_in(p_supplier_id uuid, p_warehouse_id uuid, p_product_id uuid, p_qty numeric, p_unit_price numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid; v_total numeric;
begin
  perform public.assert_permission('stock_in','manage');
  v_total := p_qty * p_unit_price;
  insert into public.stock_in(supplier_id, warehouse_id, product_id, qty, unit_price, total, note, created_by)
    values (p_supplier_id, p_warehouse_id, p_product_id, p_qty, p_unit_price, v_total, p_note, auth.uid())
    returning id into v_id;
  insert into public.stock_levels(product_id, warehouse_id, qty) values (p_product_id, p_warehouse_id, p_qty)
    on conflict (product_id, warehouse_id) do update set qty = stock_levels.qty + excluded.qty;
  insert into public.supplier_balances(supplier_id, payable) values (p_supplier_id, v_total)
    on conflict (supplier_id) do update set payable = supplier_balances.payable + v_total;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_mutation(p_from uuid, p_to uuid, p_product_id uuid, p_qty numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid; v_available numeric;
begin
  perform public.assert_permission('stock_mutations','manage');
  if p_from = p_to then raise exception 'from and to warehouse must differ'; end if;
  select qty into v_available from public.stock_levels where product_id = p_product_id and warehouse_id = p_from;
  if coalesce(v_available,0) < p_qty then raise exception 'stok tidak cukup di gudang asal'; end if;
  update public.stock_levels set qty = qty - p_qty where product_id = p_product_id and warehouse_id = p_from;
  insert into public.stock_levels(product_id, warehouse_id, qty) values (p_product_id, p_to, p_qty)
    on conflict (product_id, warehouse_id) do update set qty = stock_levels.qty + excluded.qty;
  insert into public.stock_mutations(from_warehouse_id, to_warehouse_id, product_id, qty, note, created_by)
    values (p_from, p_to, p_product_id, p_qty, p_note, auth.uid()) returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_sale(p_customer_id uuid, p_warehouse_id uuid, p_product_id uuid, p_qty numeric, p_unit_price numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid; v_total numeric; v_available numeric;
begin
  perform public.assert_permission('sales','manage');
  select qty into v_available from public.stock_levels where product_id = p_product_id and warehouse_id = p_warehouse_id;
  if coalesce(v_available,0) < p_qty then raise exception 'stok tidak cukup'; end if;
  v_total := p_qty * p_unit_price;
  update public.stock_levels set qty = qty - p_qty where product_id = p_product_id and warehouse_id = p_warehouse_id;
  insert into public.sales(customer_id, warehouse_id, product_id, qty, unit_price, total, note, created_by)
    values (p_customer_id, p_warehouse_id, p_product_id, p_qty, p_unit_price, v_total, p_note, auth.uid()) returning id into v_id;
  insert into public.customer_balances(customer_id, receivable) values (p_customer_id, v_total)
    on conflict (customer_id) do update set receivable = customer_balances.receivable + v_total;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_customer_payment(p_customer_id uuid, p_amount numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid;
begin
  perform public.assert_permission('payments_customer','manage');
  if p_amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into public.customer_payments(customer_id, amount, note, created_by)
    values (p_customer_id, p_amount, p_note, auth.uid()) returning id into v_id;
  insert into public.customer_balances(customer_id, receivable) values (p_customer_id, -p_amount)
    on conflict (customer_id) do update set receivable = customer_balances.receivable - p_amount;
  update public.cash_balance set amount = amount + p_amount where id = 1;
  insert into public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('in', p_amount, 'SETORAN_PELANGGAN', p_note, 'customer_payments', v_id, auth.uid());
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(p_supplier_id uuid, p_amount numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid;
begin
  perform public.assert_permission('payments_supplier','manage');
  if p_amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into public.supplier_payments(supplier_id, amount, note, created_by)
    values (p_supplier_id, p_amount, p_note, auth.uid()) returning id into v_id;
  insert into public.supplier_balances(supplier_id, payable) values (p_supplier_id, -p_amount)
    on conflict (supplier_id) do update set payable = supplier_balances.payable - p_amount;
  update public.cash_balance set amount = amount - p_amount where id = 1;
  insert into public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', p_amount, 'BAYAR_SUPPLIER', p_note, 'supplier_payments', v_id, auth.uid());
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_expense(p_category text, p_amount numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid;
begin
  perform public.assert_permission('expenses','manage');
  if p_amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into public.expenses(category, amount, note, created_by)
    values (p_category, p_amount, p_note, auth.uid()) returning id into v_id;
  update public.cash_balance set amount = amount - p_amount where id = 1;
  insert into public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', p_amount, 'PENGELUARAN:'||p_category, p_note, 'expenses', v_id, auth.uid());
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_salary_accrual(p_employee_id uuid, p_units numeric, p_rate numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid; v_amount numeric;
begin
  perform public.assert_permission('salary_accrual','manage');
  v_amount := p_units * p_rate;
  insert into public.salary_accruals(employee_id, units, rate, amount, note, created_by)
    values (p_employee_id, p_units, p_rate, v_amount, p_note, auth.uid()) returning id into v_id;
  insert into public.employee_salary_balances(employee_id, balance) values (p_employee_id, v_amount)
    on conflict (employee_id) do update set balance = employee_salary_balances.balance + v_amount;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_salary_advance(p_employee_id uuid, p_amount numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid;
begin
  perform public.assert_permission('salary_advance','manage');
  if p_amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into public.salary_advances(employee_id, amount, note, created_by)
    values (p_employee_id, p_amount, p_note, auth.uid()) returning id into v_id;
  update public.cash_balance set amount = amount - p_amount where id = 1;
  insert into public.employee_salary_balances(employee_id, balance) values (p_employee_id, -p_amount)
    on conflict (employee_id) do update set balance = employee_salary_balances.balance - p_amount;
  insert into public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', p_amount, 'KASBON_KURIR', p_note, 'salary_advances', v_id, auth.uid());
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_salary_payment(p_employee_id uuid, p_amount numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid;
begin
  perform public.assert_permission('salary_payment','manage');
  if p_amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into public.salary_payments(employee_id, amount, note, created_by)
    values (p_employee_id, p_amount, p_note, auth.uid()) returning id into v_id;
  update public.cash_balance set amount = amount - p_amount where id = 1;
  insert into public.employee_salary_balances(employee_id, balance) values (p_employee_id, -p_amount)
    on conflict (employee_id) do update set balance = employee_salary_balances.balance - p_amount;
  insert into public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', p_amount, 'BAYAR_GAJI', p_note, 'salary_payments', v_id, auth.uid());
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_employee_bonus(p_employee_id uuid, p_warehouse_id uuid, p_product_id uuid, p_qty numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
declare v_id uuid; v_available numeric;
begin
  perform public.assert_permission('salary_bonus','manage');
  select qty into v_available from public.stock_levels where product_id = p_product_id and warehouse_id = p_warehouse_id;
  if coalesce(v_available,0) < p_qty then raise exception 'stok tidak cukup'; end if;
  update public.stock_levels set qty = qty - p_qty where product_id = p_product_id and warehouse_id = p_warehouse_id;
  insert into public.employee_bonuses(employee_id, warehouse_id, product_id, qty, note, created_by)
    values (p_employee_id, p_warehouse_id, p_product_id, p_qty, p_note, auth.uid()) returning id into v_id;
  return v_id;
end;
$function$;

-- =========================================================
-- 6. RLS: master data → gunakan has_permission
-- =========================================================
-- customers
DROP POLICY IF EXISTS customers_admin_read ON public.customers;
DROP POLICY IF EXISTS customers_admin_write ON public.customers;
CREATE POLICY customers_read ON public.customers FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'master_customers','view'));
CREATE POLICY customers_write ON public.customers FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'master_customers','manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'master_customers','manage'));

-- suppliers
DROP POLICY IF EXISTS suppliers_admin_read ON public.suppliers;
DROP POLICY IF EXISTS suppliers_admin_write ON public.suppliers;
CREATE POLICY suppliers_read ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'master_suppliers','view'));
CREATE POLICY suppliers_write ON public.suppliers FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'master_suppliers','manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'master_suppliers','manage'));

-- employees
DROP POLICY IF EXISTS employees_admin_read ON public.employees;
DROP POLICY IF EXISTS employees_admin_write ON public.employees;
CREATE POLICY employees_read ON public.employees FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'master_employees','view'));
CREATE POLICY employees_write ON public.employees FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'master_employees','manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'master_employees','manage'));

-- warehouses
DROP POLICY IF EXISTS warehouses_admin_write ON public.warehouses;
DROP POLICY IF EXISTS warehouses_read ON public.warehouses;
CREATE POLICY warehouses_read ON public.warehouses FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'master_warehouses','view'));
CREATE POLICY warehouses_write ON public.warehouses FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'master_warehouses','manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'master_warehouses','manage'));

-- products
DROP POLICY IF EXISTS products_admin_write ON public.products;
DROP POLICY IF EXISTS products_read ON public.products;
CREATE POLICY products_read ON public.products FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'master_products','view'));
CREATE POLICY products_write ON public.products FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'master_products','manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'master_products','manage'));

-- =========================================================
-- 7. RLS: transaksi & saldo → SELECT via has_permission
--    (INSERT tetap via RPC SECURITY DEFINER, jadi tidak butuh policy tulis)
-- =========================================================
DROP POLICY IF EXISTS cash_admin_read ON public.cash_balance;
CREATE POLICY cash_read ON public.cash_balance FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'reports_cashflow','view'));

DROP POLICY IF EXISTS cash_mv_admin_read ON public.cash_movements;
CREATE POLICY cash_mv_read ON public.cash_movements FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'reports_cashflow','view'));

DROP POLICY IF EXISTS cust_bal_admin_read ON public.customer_balances;
CREATE POLICY cust_bal_read ON public.customer_balances FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'reports_receivables','view')
      OR public.has_permission(auth.uid(), 'payments_customer','view'));

DROP POLICY IF EXISTS cp_admin_read ON public.customer_payments;
CREATE POLICY cp_read ON public.customer_payments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'payments_customer','view'));

DROP POLICY IF EXISTS supplier_bal_admin_read ON public.supplier_balances;
CREATE POLICY supplier_bal_read ON public.supplier_balances FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'reports_payables','view')
      OR public.has_permission(auth.uid(), 'payments_supplier','view'));

DROP POLICY IF EXISTS sp_admin_read ON public.supplier_payments;
CREATE POLICY sp_read ON public.supplier_payments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'payments_supplier','view'));

DROP POLICY IF EXISTS exp_admin_read ON public.expenses;
CREATE POLICY exp_read ON public.expenses FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'expenses','view'));

DROP POLICY IF EXISTS emp_bal_admin_read ON public.employee_salary_balances;
CREATE POLICY emp_bal_read ON public.employee_salary_balances FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'salary_payment','view')
      OR public.has_permission(auth.uid(), 'salary_accrual','view'));

DROP POLICY IF EXISTS sac_admin_read ON public.salary_accruals;
CREATE POLICY sac_read ON public.salary_accruals FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'salary_accrual','view'));

DROP POLICY IF EXISTS sadv_admin_read ON public.salary_advances;
CREATE POLICY sadv_read ON public.salary_advances FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'salary_advance','view'));

DROP POLICY IF EXISTS spay_admin_read ON public.salary_payments;
CREATE POLICY spay_read ON public.salary_payments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'salary_payment','view'));

DROP POLICY IF EXISTS eb_admin_read ON public.employee_bonuses;
CREATE POLICY eb_read ON public.employee_bonuses FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'salary_bonus','view'));

DROP POLICY IF EXISTS sales_admin_read ON public.sales;
DROP POLICY IF EXISTS sales_staf_read ON public.sales;
CREATE POLICY sales_read ON public.sales FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'sales','view'));

DROP POLICY IF EXISTS stock_in_admin_read ON public.stock_in;
DROP POLICY IF EXISTS stock_in_staf_read ON public.stock_in;
CREATE POLICY stock_in_read ON public.stock_in FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'stock_in','view')
    AND (
      NOT public.has_role(auth.uid(), 'staf_gudang')
      OR warehouse_id = public.current_warehouse_id()
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

DROP POLICY IF EXISTS stock_admin_read ON public.stock_levels;
DROP POLICY IF EXISTS stock_staf_read ON public.stock_levels;
CREATE POLICY stock_levels_read ON public.stock_levels FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'stock_levels','view')
    AND (
      NOT public.has_role(auth.uid(), 'staf_gudang')
      OR warehouse_id = public.current_warehouse_id()
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

DROP POLICY IF EXISTS stock_mut_admin_read ON public.stock_mutations;
DROP POLICY IF EXISTS stock_mut_staf_read ON public.stock_mutations;
CREATE POLICY stock_mut_read ON public.stock_mutations FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'stock_mutations','view')
    AND (
      NOT public.has_role(auth.uid(), 'staf_gudang')
      OR from_warehouse_id = public.current_warehouse_id()
      OR to_warehouse_id = public.current_warehouse_id()
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- =========================================================
-- 8. GRANT eksekusi RPC ke authenticated (kontrol via assert_permission)
-- =========================================================
GRANT EXECUTE ON FUNCTION public.record_stock_in(uuid,uuid,uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mutation(uuid,uuid,uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sale(uuid,uuid,uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_expense(text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_salary_accrual(uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_salary_advance(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_salary_payment(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_employee_bonus(uuid,uuid,uuid,numeric,text) TO authenticated;
