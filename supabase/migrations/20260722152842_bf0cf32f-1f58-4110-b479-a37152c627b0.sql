
-- API keys table
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_api_keys_hash on public.api_keys(key_hash) where is_active;
grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy "super admin view api keys" on public.api_keys for select to authenticated
  using (public.has_role(auth.uid(),'super_admin'));
create policy "super admin insert api keys" on public.api_keys for insert to authenticated
  with check (public.has_role(auth.uid(),'super_admin'));
create policy "super admin update api keys" on public.api_keys for update to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));
create policy "super admin delete api keys" on public.api_keys for delete to authenticated
  using (public.has_role(auth.uid(),'super_admin'));

-- API request logs
create table public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  method text not null,
  status int not null,
  ip text,
  request jsonb,
  response jsonb,
  created_at timestamptz not null default now()
);
create index idx_api_request_logs_created on public.api_request_logs(created_at desc);
grant select on public.api_request_logs to authenticated;
grant all on public.api_request_logs to service_role;
alter table public.api_request_logs enable row level security;
create policy "super admin view api logs" on public.api_request_logs for select to authenticated
  using (public.has_role(auth.uid(),'super_admin'));

-- API RPCs (bypass auth.uid, take explicit actor)
create or replace function public.api_record_customer_payment(_actor uuid, _customer uuid, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if _amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into customer_payments(customer_id, amount, note, created_by)
    values (_customer, _amount, _note, _actor) returning id into v_id;
  insert into customer_balances(customer_id, receivable) values (_customer, -_amount)
    on conflict (customer_id) do update set receivable = customer_balances.receivable - _amount;
  update cash_balance set amount = amount + _amount where id = 1;
  insert into cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('in', _amount, 'SETORAN_PELANGGAN', _note, 'customer_payments', v_id, _actor);
  return v_id;
end $$;

create or replace function public.api_record_supplier_payment(_actor uuid, _supplier uuid, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if _amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into supplier_payments(supplier_id, amount, note, created_by)
    values (_supplier, _amount, _note, _actor) returning id into v_id;
  insert into supplier_balances(supplier_id, payable) values (_supplier, -_amount)
    on conflict (supplier_id) do update set payable = supplier_balances.payable - _amount;
  update cash_balance set amount = amount - _amount where id = 1;
  insert into cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', _amount, 'BAYAR_SUPPLIER', _note, 'supplier_payments', v_id, _actor);
  return v_id;
end $$;

create or replace function public.api_record_expense(_actor uuid, _category text, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if _amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into expenses(category, amount, note, created_by)
    values (_category, _amount, _note, _actor) returning id into v_id;
  update cash_balance set amount = amount - _amount where id = 1;
  insert into cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', _amount, 'PENGELUARAN:'||_category, _note, 'expenses', v_id, _actor);
  return v_id;
end $$;

create or replace function public.api_record_salary_payment(_actor uuid, _employee uuid, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if _amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into salary_payments(employee_id, amount, note, created_by)
    values (_employee, _amount, _note, _actor) returning id into v_id;
  update cash_balance set amount = amount - _amount where id = 1;
  insert into employee_salary_balances(employee_id, balance) values (_employee, -_amount)
    on conflict (employee_id) do update set balance = employee_salary_balances.balance - _amount;
  insert into cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', _amount, 'BAYAR_GAJI', _note, 'salary_payments', v_id, _actor);
  return v_id;
end $$;

create or replace function public.api_record_salary_advance(_actor uuid, _employee uuid, _amount numeric, _note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if _amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into salary_advances(employee_id, amount, note, created_by)
    values (_employee, _amount, _note, _actor) returning id into v_id;
  update cash_balance set amount = amount - _amount where id = 1;
  insert into employee_salary_balances(employee_id, balance) values (_employee, -_amount)
    on conflict (employee_id) do update set balance = employee_salary_balances.balance - _amount;
  insert into cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', _amount, 'KASBON_KURIR', _note, 'salary_advances', v_id, _actor);
  return v_id;
end $$;

create or replace function public.api_record_stock_in(_actor uuid, _supplier uuid, _warehouse uuid, _product uuid, _qty numeric, _unit_price numeric, _note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_total numeric;
begin
  if _qty <= 0 or _unit_price <= 0 then raise exception 'qty & harga harus > 0'; end if;
  v_total := _qty * _unit_price;
  insert into stock_in(supplier_id, warehouse_id, product_id, qty, unit_price, total, note, created_by)
    values (_supplier, _warehouse, _product, _qty, _unit_price, v_total, _note, _actor) returning id into v_id;
  insert into stock_levels(product_id, warehouse_id, qty) values (_product, _warehouse, _qty)
    on conflict (product_id, warehouse_id) do update set qty = stock_levels.qty + excluded.qty;
  insert into supplier_balances(supplier_id, payable) values (_supplier, v_total)
    on conflict (supplier_id) do update set payable = supplier_balances.payable + v_total;
  return v_id;
end $$;

create or replace function public.api_record_sale(_actor uuid, _customer uuid, _warehouse uuid, _product uuid, _qty numeric, _unit_price numeric, _note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_total numeric; v_available numeric;
begin
  select qty into v_available from stock_levels where product_id=_product and warehouse_id=_warehouse;
  if coalesce(v_available,0) < _qty then raise exception 'stok tidak cukup'; end if;
  v_total := _qty * _unit_price;
  update stock_levels set qty = qty - _qty where product_id=_product and warehouse_id=_warehouse;
  insert into sales(customer_id, warehouse_id, product_id, qty, unit_price, total, note, created_by)
    values (_customer,_warehouse,_product,_qty,_unit_price,v_total,_note,_actor) returning id into v_id;
  insert into customer_balances(customer_id, receivable) values (_customer, v_total)
    on conflict (customer_id) do update set receivable = customer_balances.receivable + v_total;
  return v_id;
end $$;

revoke execute on function public.api_record_customer_payment(uuid,uuid,numeric,text) from public, anon, authenticated;
revoke execute on function public.api_record_supplier_payment(uuid,uuid,numeric,text) from public, anon, authenticated;
revoke execute on function public.api_record_expense(uuid,text,numeric,text) from public, anon, authenticated;
revoke execute on function public.api_record_salary_payment(uuid,uuid,numeric,text) from public, anon, authenticated;
revoke execute on function public.api_record_salary_advance(uuid,uuid,numeric,text) from public, anon, authenticated;
revoke execute on function public.api_record_stock_in(uuid,uuid,uuid,uuid,numeric,numeric,text) from public, anon, authenticated;
revoke execute on function public.api_record_sale(uuid,uuid,uuid,uuid,numeric,numeric,text) from public, anon, authenticated;
grant execute on function public.api_record_customer_payment(uuid,uuid,numeric,text) to service_role;
grant execute on function public.api_record_supplier_payment(uuid,uuid,numeric,text) to service_role;
grant execute on function public.api_record_expense(uuid,text,numeric,text) to service_role;
grant execute on function public.api_record_salary_payment(uuid,uuid,numeric,text) to service_role;
grant execute on function public.api_record_salary_advance(uuid,uuid,numeric,text) to service_role;
grant execute on function public.api_record_stock_in(uuid,uuid,uuid,uuid,numeric,numeric,text) to service_role;
grant execute on function public.api_record_sale(uuid,uuid,uuid,uuid,numeric,numeric,text) to service_role;
