CREATE POLICY "employees_self_linked_read"
ON public.employees
FOR SELECT
TO authenticated
USING (
  id = (
    SELECT profiles.employee_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "emp_bal_self_linked_read"
ON public.employee_salary_balances
FOR SELECT
TO authenticated
USING (
  employee_id = (
    SELECT profiles.employee_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "salary_payments_self_linked_read"
ON public.salary_payments
FOR SELECT
TO authenticated
USING (
  employee_id = (
    SELECT profiles.employee_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);