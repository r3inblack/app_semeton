
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_categories_read_authenticated"
  ON public.expense_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "expense_categories_write_super_admin"
  ON public.expense_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.role_default_permissions(role, module, action, allowed) VALUES
  ('super_admin','master_expense_categories','view',true),
  ('super_admin','master_expense_categories','manage',true),
  ('admin','master_expense_categories','view',true),
  ('admin','master_expense_categories','manage',true),
  ('manager','master_expense_categories','view',true),
  ('staff_keuangan','master_expense_categories','view',true),
  ('viewer','master_expense_categories','view',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories(name) VALUES
  ('Listrik'),('Bensin'),('Air'),('Internet'),('Konsumsi'),('Lain-lain')
ON CONFLICT (name) DO NOTHING;
