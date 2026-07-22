
CREATE TABLE public.pending_stock_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty numeric NOT NULL CHECK (qty > 0),
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_stock_in TO authenticated;
GRANT ALL ON public.pending_stock_in TO service_role;

ALTER TABLE public.pending_stock_in ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending view by permission"
  ON public.pending_stock_in FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'stock_in', 'view'));

CREATE POLICY "pending managed by definer only"
  ON public.pending_stock_in FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- Submit pending stock in (staf gudang / semua yang punya izin stock_in manage)
CREATE OR REPLACE FUNCTION public.submit_pending_stock_in(
  p_supplier_id uuid, p_warehouse_id uuid, p_product_id uuid, p_qty numeric, p_note text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_id uuid;
begin
  perform public.assert_permission('stock_in','manage');
  if p_qty <= 0 then raise exception 'qty harus > 0'; end if;
  insert into public.pending_stock_in(supplier_id, warehouse_id, product_id, qty, note, created_by)
    values (p_supplier_id, p_warehouse_id, p_product_id, p_qty, p_note, auth.uid())
    returning id into v_id;
  return v_id;
end;
$$;

-- Approve pending: set prices, add to stock_in + stock + supplier debt
CREATE OR REPLACE FUNCTION public.approve_pending_stock_in(
  p_id uuid, p_buy_price numeric, p_sell_price numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  r public.pending_stock_in%rowtype;
  v_stock_in_id uuid;
begin
  perform public.assert_admin();
  if p_buy_price <= 0 or p_sell_price <= 0 then
    raise exception 'harga beli dan harga jual harus > 0';
  end if;
  select * into r from public.pending_stock_in where id = p_id and status = 'pending';
  if not found then raise exception 'pending tidak ditemukan'; end if;

  update public.products
    set buy_price = p_buy_price, sell_price = p_sell_price
    where id = r.product_id;

  insert into public.stock_in(supplier_id, warehouse_id, product_id, qty, unit_price, total, note, created_by)
    values (r.supplier_id, r.warehouse_id, r.product_id, r.qty, p_buy_price, r.qty * p_buy_price,
            coalesce(r.note,'') || ' (disetujui dari pending ' || r.id || ')', auth.uid())
    returning id into v_stock_in_id;

  insert into public.stock_levels(product_id, warehouse_id, qty)
    values (r.product_id, r.warehouse_id, r.qty)
    on conflict (product_id, warehouse_id)
    do update set qty = stock_levels.qty + excluded.qty;

  insert into public.supplier_balances(supplier_id, payable)
    values (r.supplier_id, r.qty * p_buy_price)
    on conflict (supplier_id)
    do update set payable = supplier_balances.payable + excluded.payable;

  update public.pending_stock_in set status = 'approved' where id = p_id;
  return v_stock_in_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.reject_pending_stock_in(p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  perform public.assert_admin();
  update public.pending_stock_in
    set status = 'rejected', note = coalesce(note,'') || ' | Ditolak: ' || coalesce(p_reason,'')
    where id = p_id and status = 'pending';
  if not found then raise exception 'pending tidak ditemukan'; end if;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_pending_stock_in(uuid,uuid,uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pending_stock_in(uuid,uuid,uuid,numeric,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_pending_stock_in(uuid,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_stock_in(uuid,numeric,numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_pending_stock_in(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_pending_stock_in(uuid,text) TO authenticated;
