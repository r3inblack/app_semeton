
-- app_settings: explicit deny INSERT/DELETE (UPDATE already restricted; SELECT admin-only)
CREATE POLICY "app_settings_deny_insert" ON public.app_settings FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "app_settings_deny_delete" ON public.app_settings FOR DELETE TO authenticated, anon USING (false);

-- cash_balance: deny all direct writes; changes go through SECURITY DEFINER RPCs
CREATE POLICY "cash_balance_deny_insert" ON public.cash_balance FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "cash_balance_deny_update" ON public.cash_balance FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "cash_balance_deny_delete" ON public.cash_balance FOR DELETE TO authenticated, anon USING (false);

-- employee_salary_balances: deny all direct writes
CREATE POLICY "employee_salary_balances_deny_insert" ON public.employee_salary_balances FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "employee_salary_balances_deny_update" ON public.employee_salary_balances FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "employee_salary_balances_deny_delete" ON public.employee_salary_balances FOR DELETE TO authenticated, anon USING (false);

-- stock_levels: deny all direct writes
CREATE POLICY "stock_levels_deny_insert" ON public.stock_levels FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "stock_levels_deny_update" ON public.stock_levels FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "stock_levels_deny_delete" ON public.stock_levels FOR DELETE TO authenticated, anon USING (false);
