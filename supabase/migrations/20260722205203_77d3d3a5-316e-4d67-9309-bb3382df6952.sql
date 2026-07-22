
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_accounts read" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts admin write" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER bank_accounts_touch BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pending_customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  proof_path TEXT,
  note TEXT,
  submitter_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID
);
CREATE INDEX pending_customer_payments_status_idx ON public.pending_customer_payments(status, created_at DESC);
CREATE INDEX pending_customer_payments_customer_idx ON public.pending_customer_payments(customer_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_customer_payments TO authenticated;
GRANT ALL ON public.pending_customer_payments TO service_role;
ALTER TABLE public.pending_customer_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcp read" ON public.pending_customer_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_permission(auth.uid(),'payments_customer','manage'));
CREATE POLICY "pcp admin write" ON public.pending_customer_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.approve_pending_customer_payment(p_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.pending_customer_payments%ROWTYPE; v_id UUID;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO r FROM public.pending_customer_payments WHERE id=p_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'pengajuan tidak ditemukan'; END IF;
  INSERT INTO public.customer_payments(customer_id, amount, note, created_by)
    VALUES (r.customer_id, r.amount, COALESCE(r.note,'') || ' (setoran mandiri)', auth.uid())
    RETURNING id INTO v_id;
  INSERT INTO public.customer_balances(customer_id, receivable) VALUES (r.customer_id, -r.amount)
    ON CONFLICT (customer_id) DO UPDATE SET receivable = customer_balances.receivable - r.amount;
  UPDATE public.cash_balance SET amount = amount + r.amount WHERE id=1;
  INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    VALUES ('in', r.amount, 'SETORAN_PELANGGAN', 'Setoran mandiri via portal', 'customer_payments', v_id, auth.uid());
  UPDATE public.pending_customer_payments SET status='approved', processed_at=now(), processed_by=auth.uid() WHERE id=p_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_pending_customer_payment_via_telegram(p_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.pending_customer_payments%ROWTYPE; v_id UUID;
BEGIN
  SELECT * INTO r FROM public.pending_customer_payments WHERE id=p_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'pengajuan tidak ditemukan'; END IF;
  INSERT INTO public.customer_payments(customer_id, amount, note, created_by)
    VALUES (r.customer_id, r.amount, COALESCE(r.note,'') || ' (setoran mandiri via Telegram)', NULL)
    RETURNING id INTO v_id;
  INSERT INTO public.customer_balances(customer_id, receivable) VALUES (r.customer_id, -r.amount)
    ON CONFLICT (customer_id) DO UPDATE SET receivable = customer_balances.receivable - r.amount;
  UPDATE public.cash_balance SET amount = amount + r.amount WHERE id=1;
  INSERT INTO public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    VALUES ('in', r.amount, 'SETORAN_PELANGGAN', 'Setoran mandiri via Telegram', 'customer_payments', v_id, NULL);
  UPDATE public.pending_customer_payments SET status='approved', processed_at=now() WHERE id=p_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_pending_customer_payment(p_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.assert_admin();
  UPDATE public.pending_customer_payments
    SET status='rejected', reject_reason=COALESCE(p_reason,''), processed_at=now()
    WHERE id=p_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'pengajuan tidak ditemukan'; END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.approve_pending_customer_payment(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_pending_customer_payment_via_telegram(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_pending_customer_payment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_customer_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_pending_customer_payment(UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "payment_proofs upload" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs read" ON storage.objects;
CREATE POLICY "payment_proofs upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');
CREATE POLICY "payment_proofs read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment-proofs');
