
-- =========================================================
-- ENUMS
-- =========================================================
create type public.app_role as enum ('super_admin', 'staf_gudang');
create type public.employee_category as enum ('gudang', 'kurir');
create type public.cash_direction as enum ('in', 'out');

-- =========================================================
-- PROFILES + USER ROLES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  warehouse_id uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_warehouse_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select warehouse_id from public.profiles where id = auth.uid()
$$;

-- Profiles RLS
create policy "profiles_self_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));
create policy "profiles_admin_write" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_roles RLS
create policy "user_roles_self_select" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));
create policy "user_roles_admin_write" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- APP SETTINGS (singleton)
-- =========================================================
create table public.app_settings (
  id int primary key default 1,
  app_name text not null default 'Aplikasi Semeton',
  telegram_enabled boolean not null default false,
  telegram_bot_token text,
  telegram_chat_id text,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);
grant select on public.app_settings to authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;

create policy "app_settings_all_read" on public.app_settings for select to authenticated using (true);
create policy "app_settings_admin_update" on public.app_settings for update to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

insert into public.app_settings (id, app_name) values (1, 'Aplikasi Semeton') on conflict (id) do nothing;

-- =========================================================
-- MASTER DATA
-- =========================================================
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.warehouses to authenticated;
grant all on public.warehouses to service_role;
alter table public.warehouses enable row level security;
create policy "warehouses_read" on public.warehouses for select to authenticated using (true);
create policy "warehouses_admin_write" on public.warehouses for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

alter table public.profiles add constraint profiles_warehouse_fk
  foreign key (warehouse_id) references public.warehouses(id) on delete set null;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers_read" on public.customers for select to authenticated using (true);
create policy "customers_admin_write" on public.customers for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy "suppliers_read" on public.suppliers for select to authenticated using (true);
create policy "suppliers_admin_write" on public.suppliers for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  category public.employee_category not null,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
create policy "employees_read" on public.employees for select to authenticated using (true);
create policy "employees_admin_write" on public.employees for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  sell_price numeric(14,2) not null default 0,
  buy_price numeric(14,2) not null default 0,
  commission_per_unit numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products_read" on public.products for select to authenticated using (true);
create policy "products_admin_write" on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- BALANCES
-- =========================================================
create table public.cash_balance (
  id int primary key default 1,
  amount numeric(14,2) not null default 0,
  constraint cash_singleton check (id = 1)
);
grant select on public.cash_balance to authenticated;
grant all on public.cash_balance to service_role;
alter table public.cash_balance enable row level security;
create policy "cash_admin_read" on public.cash_balance for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));
insert into public.cash_balance (id, amount) values (1, 0) on conflict do nothing;

create table public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  qty numeric(14,2) not null default 0,
  unique (product_id, warehouse_id)
);
grant select on public.stock_levels to authenticated;
grant all on public.stock_levels to service_role;
alter table public.stock_levels enable row level security;
create policy "stock_admin_read" on public.stock_levels for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));
create policy "stock_staf_read" on public.stock_levels for select to authenticated
  using (public.has_role(auth.uid(), 'staf_gudang') and warehouse_id = public.current_warehouse_id());

create table public.customer_balances (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  receivable numeric(14,2) not null default 0
);
grant select on public.customer_balances to authenticated;
grant all on public.customer_balances to service_role;
alter table public.customer_balances enable row level security;
create policy "cust_bal_admin_read" on public.customer_balances for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.supplier_balances (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  payable numeric(14,2) not null default 0
);
grant select on public.supplier_balances to authenticated;
grant all on public.supplier_balances to service_role;
alter table public.supplier_balances enable row level security;
create policy "sup_bal_admin_read" on public.supplier_balances for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.employee_salary_balances (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  balance numeric(14,2) not null default 0
);
grant select on public.employee_salary_balances to authenticated;
grant all on public.employee_salary_balances to service_role;
alter table public.employee_salary_balances enable row level security;
create policy "emp_bal_admin_read" on public.employee_salary_balances for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- CASH MOVEMENTS (ledger)
-- =========================================================
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  direction public.cash_direction not null,
  amount numeric(14,2) not null,
  category text not null,
  description text,
  ref_table text,
  ref_id uuid,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.cash_movements to authenticated;
grant all on public.cash_movements to service_role;
alter table public.cash_movements enable row level security;
create policy "cash_mv_admin_read" on public.cash_movements for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- TRANSACTIONS
-- =========================================================
create table public.stock_in (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  supplier_id uuid not null references public.suppliers(id),
  warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  qty numeric(14,2) not null,
  unit_price numeric(14,2) not null,
  total numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.stock_in to authenticated;
grant all on public.stock_in to service_role;
alter table public.stock_in enable row level security;
create policy "stock_in_admin_read" on public.stock_in for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));
create policy "stock_in_staf_read" on public.stock_in for select to authenticated
  using (public.has_role(auth.uid(), 'staf_gudang') and warehouse_id = public.current_warehouse_id());

create table public.stock_mutations (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  from_warehouse_id uuid not null references public.warehouses(id),
  to_warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  qty numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.stock_mutations to authenticated;
grant all on public.stock_mutations to service_role;
alter table public.stock_mutations enable row level security;
create policy "stock_mut_admin_read" on public.stock_mutations for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));
create policy "stock_mut_staf_read" on public.stock_mutations for select to authenticated
  using (public.has_role(auth.uid(), 'staf_gudang')
    and (from_warehouse_id = public.current_warehouse_id() or to_warehouse_id = public.current_warehouse_id()));

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  customer_id uuid not null references public.customers(id),
  warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  qty numeric(14,2) not null,
  unit_price numeric(14,2) not null,
  total numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy "sales_admin_read" on public.sales for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));
create policy "sales_staf_read" on public.sales for select to authenticated
  using (public.has_role(auth.uid(), 'staf_gudang') and warehouse_id = public.current_warehouse_id());

create table public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  customer_id uuid not null references public.customers(id),
  amount numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.customer_payments to authenticated;
grant all on public.customer_payments to service_role;
alter table public.customer_payments enable row level security;
create policy "cp_admin_read" on public.customer_payments for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  supplier_id uuid not null references public.suppliers(id),
  amount numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.supplier_payments to authenticated;
grant all on public.supplier_payments to service_role;
alter table public.supplier_payments enable row level security;
create policy "sp_admin_read" on public.supplier_payments for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  category text not null,
  amount numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "exp_admin_read" on public.expenses for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.salary_accruals (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  employee_id uuid not null references public.employees(id),
  units numeric(14,2) not null,
  rate numeric(14,2) not null,
  amount numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.salary_accruals to authenticated;
grant all on public.salary_accruals to service_role;
alter table public.salary_accruals enable row level security;
create policy "sac_admin_read" on public.salary_accruals for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.salary_advances (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  employee_id uuid not null references public.employees(id),
  amount numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.salary_advances to authenticated;
grant all on public.salary_advances to service_role;
alter table public.salary_advances enable row level security;
create policy "sadv_admin_read" on public.salary_advances for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  employee_id uuid not null references public.employees(id),
  amount numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.salary_payments to authenticated;
grant all on public.salary_payments to service_role;
alter table public.salary_payments enable row level security;
create policy "spay_admin_read" on public.salary_payments for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create table public.employee_bonuses (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  employee_id uuid not null references public.employees(id),
  warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  qty numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id) on delete set null
);
grant select on public.employee_bonuses to authenticated;
grant all on public.employee_bonuses to service_role;
alter table public.employee_bonuses enable row level security;
create policy "eb_admin_read" on public.employee_bonuses for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- TRIGGERS
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count int;
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'staf_gudang');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- RPC FUNCTIONS (atomic transactions)
-- Only super_admin may call these.
-- =========================================================
create or replace function public.assert_admin() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'forbidden: super_admin required';
  end if;
end;
$$;

create or replace function public.record_stock_in(
  p_supplier_id uuid, p_warehouse_id uuid, p_product_id uuid,
  p_qty numeric, p_unit_price numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_total numeric;
begin
  perform public.assert_admin();
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
$$;

create or replace function public.record_mutation(
  p_from uuid, p_to uuid, p_product_id uuid, p_qty numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_available numeric;
begin
  perform public.assert_admin();
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
$$;

create or replace function public.record_sale(
  p_customer_id uuid, p_warehouse_id uuid, p_product_id uuid,
  p_qty numeric, p_unit_price numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_total numeric; v_available numeric;
begin
  perform public.assert_admin();
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
$$;

create or replace function public.record_customer_payment(
  p_customer_id uuid, p_amount numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public.assert_admin();
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
$$;

create or replace function public.record_supplier_payment(
  p_supplier_id uuid, p_amount numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public.assert_admin();
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
$$;

create or replace function public.record_expense(
  p_category text, p_amount numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public.assert_admin();
  if p_amount <= 0 then raise exception 'nominal harus > 0'; end if;
  insert into public.expenses(category, amount, note, created_by)
    values (p_category, p_amount, p_note, auth.uid()) returning id into v_id;
  update public.cash_balance set amount = amount - p_amount where id = 1;
  insert into public.cash_movements(direction, amount, category, description, ref_table, ref_id, created_by)
    values ('out', p_amount, 'PENGELUARAN:'||p_category, p_note, 'expenses', v_id, auth.uid());
  return v_id;
end;
$$;

create or replace function public.record_salary_accrual(
  p_employee_id uuid, p_units numeric, p_rate numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_amount numeric;
begin
  perform public.assert_admin();
  v_amount := p_units * p_rate;
  insert into public.salary_accruals(employee_id, units, rate, amount, note, created_by)
    values (p_employee_id, p_units, p_rate, v_amount, p_note, auth.uid()) returning id into v_id;
  insert into public.employee_salary_balances(employee_id, balance) values (p_employee_id, v_amount)
    on conflict (employee_id) do update set balance = employee_salary_balances.balance + v_amount;
  return v_id;
end;
$$;

create or replace function public.record_salary_advance(
  p_employee_id uuid, p_amount numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public.assert_admin();
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
$$;

create or replace function public.record_salary_payment(
  p_employee_id uuid, p_amount numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public.assert_admin();
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
$$;

create or replace function public.record_employee_bonus(
  p_employee_id uuid, p_warehouse_id uuid, p_product_id uuid, p_qty numeric, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_available numeric;
begin
  perform public.assert_admin();
  select qty into v_available from public.stock_levels where product_id = p_product_id and warehouse_id = p_warehouse_id;
  if coalesce(v_available,0) < p_qty then raise exception 'stok tidak cukup'; end if;
  update public.stock_levels set qty = qty - p_qty where product_id = p_product_id and warehouse_id = p_warehouse_id;
  insert into public.employee_bonuses(employee_id, warehouse_id, product_id, qty, note, created_by)
    values (p_employee_id, p_warehouse_id, p_product_id, p_qty, p_note, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_initial_cash(p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.cash_balance set amount = p_amount where id = 1;
end;
$$;

create or replace function public.set_initial_stock(p_product_id uuid, p_warehouse_id uuid, p_qty numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  insert into public.stock_levels(product_id, warehouse_id, qty) values (p_product_id, p_warehouse_id, p_qty)
    on conflict (product_id, warehouse_id) do update set qty = excluded.qty;
end;
$$;

create or replace function public.set_initial_receivable(p_customer_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  insert into public.customer_balances(customer_id, receivable) values (p_customer_id, p_amount)
    on conflict (customer_id) do update set receivable = excluded.receivable;
end;
$$;

create or replace function public.set_initial_payable(p_supplier_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  insert into public.supplier_balances(supplier_id, payable) values (p_supplier_id, p_amount)
    on conflict (supplier_id) do update set payable = excluded.payable;
end;
$$;

create or replace function public.set_initial_salary(p_employee_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  insert into public.employee_salary_balances(employee_id, balance) values (p_employee_id, p_amount)
    on conflict (employee_id) do update set balance = excluded.balance;
end;
$$;

create or replace function public.reset_transactions()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  truncate table
    public.cash_movements,
    public.stock_in,
    public.stock_mutations,
    public.sales,
    public.customer_payments,
    public.supplier_payments,
    public.expenses,
    public.salary_accruals,
    public.salary_advances,
    public.salary_payments,
    public.employee_bonuses
    restart identity;
  update public.cash_balance set amount = 0 where id = 1;
  update public.stock_levels set qty = 0;
  update public.customer_balances set receivable = 0;
  update public.supplier_balances set payable = 0;
  update public.employee_salary_balances set balance = 0;
end;
$$;
