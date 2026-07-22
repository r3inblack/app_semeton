
-- =========================================
-- pending_employee_bonus
-- =========================================
CREATE TABLE IF NOT EXISTS public.pending_employee_bonus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  qty numeric NOT NULL CHECK (qty > 0),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_employee_bonus TO authenticated;
GRANT ALL ON public.pending_employee_bonus TO service_role;
ALTER TABLE public.pending_employee_bonus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peb_read_authenticated" ON public.pending_employee_bonus
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "peb_write_admin" ON public.pending_employee_bonus
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- =========================================
-- supplier_returns
-- =========================================
CREATE TABLE IF NOT EXISTS public.supplier_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  qty numeric NOT NULL CHECK (qty > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total numeric NOT NULL,
  note text,
  created_by uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_returns TO authenticated;
GRANT ALL ON public.supplier_returns TO service_role;
ALTER TABLE public.supplier_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sr_read_authenticated" ON public.supplier_returns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_write_admin" ON public.supplier_returns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- =========================================
-- Default permissions for new modules
-- =========================================
INSERT INTO public.role_default_permissions (role, module, action, allowed) VALUES
  ('staf_gudang', 'salary_bonus', 'view', true),
  ('staf_gudang', 'salary_bonus', 'manage', true),
  ('staf_gudang', 'salary_bonus_pending', 'view', true),
  ('admin', 'salary_bonus', 'view', true),
  ('admin', 'salary_bonus', 'manage', true),
  ('admin', 'salary_bonus_pending', 'view', true),
  ('admin', 'salary_bonus_pending', 'manage', true),
  ('admin', 'supplier_returns', 'view', true),
  ('admin', 'supplier_returns', 'manage', true),
  ('manager', 'salary_bonus_pending', 'view', true),
  ('manager', 'salary_bonus_pending', 'manage', true),
  ('manager', 'supplier_returns', 'view', true),
  ('manager', 'supplier_returns', 'manage', true),
  ('manager', 'reports_bonus', 'view', true),
  ('manager', 'reports_returns', 'view', true),
  ('admin', 'reports_bonus', 'view', true),
  ('admin', 'reports_returns', 'view', true),
  ('staff_keuangan', 'reports_bonus', 'view', true),
  ('staff_keuangan', 'reports_returns', 'view', true),
  ('viewer', 'reports_bonus', 'view', true),
  ('viewer', 'reports_returns', 'view', true)
ON CONFLICT (role, module, action) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Default expense categories
INSERT INTO public.expense_categories (name)
SELECT 'Bonus Karyawan' WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name='Bonus Karyawan');

-- =========================================
-- RPC: submit pending bonus (Staf Gudang)
-- =========================================
CREATE OR REPLACE FUNCTION public.submit_pending_employee_bonus(
  p_employee_id uuid, p_warehouse_id uuid, p_product_id uuid, p_qty numeric, p_note text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_available numeric;
BEGIN
  PERFORM public.assert_permission('salary_bonus','manage');
  IF p_qty <= 0 THEN RAISE EXCEPTION 'qty harus > 0'; END IF;
  SELECT qty INTO v_available FROM public.stock_levels
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
  IF COALESCE(v_available,0) < p_qty THEN RAISE EXCEPTION 'stok tidak cukup di gudang'; END IF;
  INSERT INTO public.pending_employee_bonus(employee_id, warehouse_id, product_id, qty, note, created_by)
    VALUES (p_employee_id, p_warehouse_id, p_product_id, p_qty, p_note, auth.uid())
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- =========================================
-- RPC: approve pending bonus (app / super_admin)
-- Reduces stock, records expense (Bonus Karyawan) at buy_price*qty
-- =========================================
CREATE OR REPLACE FUNCTION public.approve_pending_employee_bonus(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.pending_employee_bonus%ROWTYPE;
  v_buy numeric;
  v_total numeric;
  v_available numeric;
  v_bonus_id uuid;
  v_expense_id uuid;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO r FROM public.pending_employee_bonus WHERE id = p_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'pengajuan tidak ditemukan'; END IF;

  SELECT qty INTO v_available FROM public.stock_levels
    WHERE product_id = r.product_id AND warehouse_id = r.warehouse_id;
  IF COALESCE(v_available,0) < r.qty THEN RAISE EXCEPTION 'stok tidak cukup'; END IF;

  SELECT COALESCE(buy_price,0) INTO v_buy FROM public.products WHERE id = r.product_id;
  v_total := r.qty * v_buy;

  UPDATE public.stock_levels SET qty = qty - r.qty
    WHERE product_id = r.product_id AND warehouse_id = r.warehouse_id;

  INSERT INTO public.employee_bonuses(employee_id, warehouse_id, product_id, qty, note, created_by)
    VALUES (r.employee_id, r.warehouse_id, r.product_id, r.qty,
            COALESCE(r.note,'') || ' (disetujui dari pending ' || r.id || ')', auth.uid())
    RETURNING id INTO v_bonus_id;

  IF v_total > 0 THEN
    INSERT INTO public.expenses(category, amount, note, created_by)
      VALUES ('Bonus Karyawan', v_total,
              'Bonus barang (bonus_id ' || v_bonus_id || ')', auth.uid())
      RETURNING id INTO v_expense_id;
    UPDATE public.cash_balance SET amount = amount - v_total WHERE id = 1;
    INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
      VALUES ('out', v_total, 'PENGELUARAN:Bonus Karyawan',
              'Bonus barang karyawan', 'expenses', v_expense_id, auth.uid());
  END IF;

  UPDATE public.pending_employee_bonus SET status='approved' WHERE id = p_id;
  RETURN v_bonus_id;
END; $$;

-- Telegram variant (no auth.uid() context — actor from pending)
CREATE OR REPLACE FUNCTION public.approve_pending_employee_bonus_via_telegram(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.pending_employee_bonus%ROWTYPE;
  v_buy numeric;
  v_total numeric;
  v_available numeric;
  v_bonus_id uuid;
  v_expense_id uuid;
BEGIN
  SELECT * INTO r FROM public.pending_employee_bonus WHERE id = p_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'pengajuan tidak ditemukan'; END IF;

  SELECT qty INTO v_available FROM public.stock_levels
    WHERE product_id = r.product_id AND warehouse_id = r.warehouse_id;
  IF COALESCE(v_available,0) < r.qty THEN RAISE EXCEPTION 'stok tidak cukup'; END IF;

  SELECT COALESCE(buy_price,0) INTO v_buy FROM public.products WHERE id = r.product_id;
  v_total := r.qty * v_buy;

  UPDATE public.stock_levels SET qty = qty - r.qty
    WHERE product_id = r.product_id AND warehouse_id = r.warehouse_id;

  INSERT INTO public.employee_bonuses(employee_id, warehouse_id, product_id, qty, note, created_by)
    VALUES (r.employee_id, r.warehouse_id, r.product_id, r.qty,
            COALESCE(r.note,'') || ' (disetujui via Telegram dari pending ' || r.id || ')', r.created_by)
    RETURNING id INTO v_bonus_id;

  IF v_total > 0 THEN
    INSERT INTO public.expenses(category, amount, note, created_by)
      VALUES ('Bonus Karyawan', v_total,
              'Bonus barang (bonus_id ' || v_bonus_id || ')', r.created_by)
      RETURNING id INTO v_expense_id;
    UPDATE public.cash_balance SET amount = amount - v_total WHERE id = 1;
    INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
      VALUES ('out', v_total, 'PENGELUARAN:Bonus Karyawan',
              'Bonus barang karyawan (Telegram)', 'expenses', v_expense_id, r.created_by);
  END IF;

  UPDATE public.pending_employee_bonus SET status='approved' WHERE id = p_id;
  RETURN v_bonus_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_pending_employee_bonus(p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_admin();
  UPDATE public.pending_employee_bonus
    SET status='rejected',
        note = COALESCE(note,'') || ' | Ditolak: ' || COALESCE(p_reason,'')
    WHERE id = p_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'pengajuan tidak ditemukan'; END IF;
END; $$;

-- =========================================
-- RPC: record_supplier_return
-- Reduces stock, reduces supplier payable (no cash movement)
-- =========================================
CREATE OR REPLACE FUNCTION public.record_supplier_return(
  p_supplier_id uuid, p_warehouse_id uuid, p_product_id uuid,
  p_qty numeric, p_note text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_buy numeric;
  v_total numeric;
  v_available numeric;
BEGIN
  PERFORM public.assert_permission('supplier_returns','manage');
  IF p_qty <= 0 THEN RAISE EXCEPTION 'qty harus > 0'; END IF;

  SELECT qty INTO v_available FROM public.stock_levels
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
  IF COALESCE(v_available,0) < p_qty THEN RAISE EXCEPTION 'stok tidak cukup di gudang'; END IF;

  SELECT COALESCE(buy_price,0) INTO v_buy FROM public.products WHERE id = p_product_id;
  v_total := p_qty * v_buy;

  UPDATE public.stock_levels SET qty = qty - p_qty
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

  INSERT INTO public.supplier_returns(supplier_id, warehouse_id, product_id, qty, unit_price, total, note, created_by)
    VALUES (p_supplier_id, p_warehouse_id, p_product_id, p_qty, v_buy, v_total, p_note, auth.uid())
    RETURNING id INTO v_id;

  -- Reduce supplier payable
  INSERT INTO public.supplier_balances(supplier_id, payable)
    VALUES (p_supplier_id, -v_total)
    ON CONFLICT (supplier_id) DO UPDATE
      SET payable = supplier_balances.payable - v_total;

  RETURN v_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.approve_pending_employee_bonus_via_telegram(uuid) FROM anon, authenticated;
