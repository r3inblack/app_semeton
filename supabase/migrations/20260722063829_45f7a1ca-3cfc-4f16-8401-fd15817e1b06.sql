
CREATE OR REPLACE FUNCTION public.approve_pending_stock_in_via_telegram(
  p_id uuid, p_buy_price numeric, p_sell_price numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare r public.pending_stock_in%rowtype; v_stock_in_id uuid;
begin
  if p_buy_price <= 0 or p_sell_price <= 0 then raise exception 'harga beli dan harga jual harus > 0'; end if;
  select * into r from public.pending_stock_in where id = p_id and status = 'pending';
  if not found then raise exception 'pending tidak ditemukan'; end if;

  update public.products set buy_price = p_buy_price, sell_price = p_sell_price where id = r.product_id;

  insert into public.stock_in(supplier_id, warehouse_id, product_id, qty, unit_price, total, note, created_by)
    values (r.supplier_id, r.warehouse_id, r.product_id, r.qty, p_buy_price, r.qty * p_buy_price,
            coalesce(r.note,'') || ' (disetujui via Telegram dari pending ' || r.id || ')', r.created_by)
    returning id into v_stock_in_id;

  insert into public.stock_levels(product_id, warehouse_id, qty)
    values (r.product_id, r.warehouse_id, r.qty)
    on conflict (product_id, warehouse_id) do update set qty = stock_levels.qty + excluded.qty;

  insert into public.supplier_balances(supplier_id, payable)
    values (r.supplier_id, r.qty * p_buy_price)
    on conflict (supplier_id) do update set payable = supplier_balances.payable + excluded.payable;

  update public.pending_stock_in set status = 'approved' where id = p_id;
  return v_stock_in_id;
end; $$;

REVOKE ALL ON FUNCTION public.approve_pending_stock_in_via_telegram(uuid, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_pending_stock_in_via_telegram(uuid, numeric, numeric) FROM authenticated;
REVOKE ALL ON FUNCTION public.approve_pending_stock_in_via_telegram(uuid, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_stock_in_via_telegram(uuid, numeric, numeric) TO service_role;
