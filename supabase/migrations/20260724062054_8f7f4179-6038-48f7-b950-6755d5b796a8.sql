
-- Add void tracking columns to transaction tables
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.stock_in ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.stock_mutations ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.salary_accruals ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.salary_advances ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.employee_bonuses ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.supplier_returns ADD COLUMN IF NOT EXISTS voided_at timestamptz, ADD COLUMN IF NOT EXISTS voided_by uuid, ADD COLUMN IF NOT EXISTS void_reason text;

-- Universal void dispatcher. Super admin only. Reverses balance/stock effects then marks row voided.
CREATE OR REPLACE FUNCTION public.void_transaction(p_table text, p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r record;
  v_avail numeric;
  v_buy numeric;
  v_total numeric;
BEGIN
  PERFORM public.assert_admin();
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Alasan pembatalan wajib diisi';
  END IF;

  IF p_table = 'sales' THEN
    SELECT * INTO r FROM public.sales WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    INSERT INTO public.stock_levels(product_id, warehouse_id, qty) VALUES (r.product_id, r.warehouse_id, r.qty)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty = stock_levels.qty + EXCLUDED.qty;
    INSERT INTO public.customer_balances(customer_id, receivable) VALUES (r.customer_id, -r.total)
      ON CONFLICT (customer_id) DO UPDATE SET receivable = customer_balances.receivable - r.total;
    UPDATE public.sales SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'stock_in' THEN
    SELECT * INTO r FROM public.stock_in WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    SELECT qty INTO v_avail FROM public.stock_levels WHERE product_id=r.product_id AND warehouse_id=r.warehouse_id;
    IF COALESCE(v_avail,0) < r.qty THEN RAISE EXCEPTION 'stok tidak cukup untuk membatalkan (sudah terpakai)'; END IF;
    UPDATE public.stock_levels SET qty = qty - r.qty WHERE product_id=r.product_id AND warehouse_id=r.warehouse_id;
    INSERT INTO public.supplier_balances(supplier_id, payable) VALUES (r.supplier_id, -r.total)
      ON CONFLICT (supplier_id) DO UPDATE SET payable = supplier_balances.payable - r.total;
    UPDATE public.stock_in SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'stock_mutations' THEN
    SELECT * INTO r FROM public.stock_mutations WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    SELECT qty INTO v_avail FROM public.stock_levels WHERE product_id=r.product_id AND warehouse_id=r.to_warehouse_id;
    IF COALESCE(v_avail,0) < r.qty THEN RAISE EXCEPTION 'stok di gudang tujuan tidak cukup'; END IF;
    UPDATE public.stock_levels SET qty = qty - r.qty WHERE product_id=r.product_id AND warehouse_id=r.to_warehouse_id;
    INSERT INTO public.stock_levels(product_id, warehouse_id, qty) VALUES (r.product_id, r.from_warehouse_id, r.qty)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty = stock_levels.qty + EXCLUDED.qty;
    UPDATE public.stock_mutations SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'customer_payments' THEN
    SELECT * INTO r FROM public.customer_payments WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    INSERT INTO public.customer_balances(customer_id, receivable) VALUES (r.customer_id, r.amount)
      ON CONFLICT (customer_id) DO UPDATE SET receivable = customer_balances.receivable + r.amount;
    UPDATE public.cash_balance SET amount = amount - r.amount WHERE id = 1;
    INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
      VALUES ('out', r.amount, 'VOID:SETORAN_PELANGGAN', 'Pembatalan: '||COALESCE(p_reason,''), 'customer_payments', r.id, v_uid);
    UPDATE public.customer_payments SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'supplier_payments' THEN
    SELECT * INTO r FROM public.supplier_payments WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    INSERT INTO public.supplier_balances(supplier_id, payable) VALUES (r.supplier_id, r.amount)
      ON CONFLICT (supplier_id) DO UPDATE SET payable = supplier_balances.payable + r.amount;
    UPDATE public.cash_balance SET amount = amount + r.amount WHERE id = 1;
    INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
      VALUES ('in', r.amount, 'VOID:BAYAR_SUPPLIER', 'Pembatalan: '||COALESCE(p_reason,''), 'supplier_payments', r.id, v_uid);
    UPDATE public.supplier_payments SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'expenses' THEN
    SELECT * INTO r FROM public.expenses WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    UPDATE public.cash_balance SET amount = amount + r.amount WHERE id = 1;
    INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
      VALUES ('in', r.amount, 'VOID:PENGELUARAN:'||r.category, 'Pembatalan: '||COALESCE(p_reason,''), 'expenses', r.id, v_uid);
    UPDATE public.expenses SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'salary_accruals' THEN
    SELECT * INTO r FROM public.salary_accruals WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    INSERT INTO public.employee_salary_balances(employee_id, balance) VALUES (r.employee_id, -r.amount)
      ON CONFLICT (employee_id) DO UPDATE SET balance = employee_salary_balances.balance - r.amount;
    UPDATE public.salary_accruals SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'salary_advances' THEN
    SELECT * INTO r FROM public.salary_advances WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    UPDATE public.cash_balance SET amount = amount + r.amount WHERE id = 1;
    INSERT INTO public.employee_salary_balances(employee_id, balance) VALUES (r.employee_id, r.amount)
      ON CONFLICT (employee_id) DO UPDATE SET balance = employee_salary_balances.balance + r.amount;
    INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
      VALUES ('in', r.amount, 'VOID:KASBON_KURIR', 'Pembatalan: '||COALESCE(p_reason,''), 'salary_advances', r.id, v_uid);
    UPDATE public.salary_advances SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'salary_payments' THEN
    SELECT * INTO r FROM public.salary_payments WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    UPDATE public.cash_balance SET amount = amount + r.amount WHERE id = 1;
    INSERT INTO public.employee_salary_balances(employee_id, balance) VALUES (r.employee_id, r.amount)
      ON CONFLICT (employee_id) DO UPDATE SET balance = employee_salary_balances.balance + r.amount;
    INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
      VALUES ('in', r.amount, 'VOID:BAYAR_GAJI', 'Pembatalan: '||COALESCE(p_reason,''), 'salary_payments', r.id, v_uid);
    UPDATE public.salary_payments SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'employee_bonuses' THEN
    SELECT * INTO r FROM public.employee_bonuses WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    -- Return stock
    INSERT INTO public.stock_levels(product_id, warehouse_id, qty) VALUES (r.product_id, r.warehouse_id, r.qty)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty = stock_levels.qty + EXCLUDED.qty;
    -- Reverse auto-generated expense if present
    SELECT COALESCE(buy_price,0) INTO v_buy FROM public.products WHERE id = r.product_id;
    v_total := r.qty * v_buy;
    IF v_total > 0 THEN
      UPDATE public.expenses SET voided_at=now(), voided_by=v_uid, void_reason='Auto-void bonus '||r.id
        WHERE category='Bonus Karyawan' AND note LIKE '%bonus_id '||r.id||%'' AND voided_at IS NULL;
      UPDATE public.cash_balance SET amount = amount + v_total WHERE id = 1;
      INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
        VALUES ('in', v_total, 'VOID:PENGELUARAN:Bonus Karyawan', 'Pembatalan bonus: '||COALESCE(p_reason,''), 'employee_bonuses', r.id, v_uid);
    END IF;
    UPDATE public.employee_bonuses SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSIF p_table = 'supplier_returns' THEN
    SELECT * INTO r FROM public.supplier_returns WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'transaksi tidak ditemukan'; END IF;
    IF r.voided_at IS NOT NULL THEN RAISE EXCEPTION 'sudah dibatalkan'; END IF;
    INSERT INTO public.stock_levels(product_id, warehouse_id, qty) VALUES (r.product_id, r.warehouse_id, r.qty)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty = stock_levels.qty + EXCLUDED.qty;
    INSERT INTO public.supplier_balances(supplier_id, payable) VALUES (r.supplier_id, r.total)
      ON CONFLICT (supplier_id) DO UPDATE SET payable = supplier_balances.payable + r.total;
    UPDATE public.supplier_returns SET voided_at=now(), voided_by=v_uid, void_reason=p_reason WHERE id=p_id;

  ELSE
    RAISE EXCEPTION 'tabel tidak didukung: %', p_table;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.void_transaction(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_transaction(text, uuid, text) TO authenticated;
