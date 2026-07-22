
CREATE SEQUENCE IF NOT EXISTS public.customers_code_seq START 1;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS code text;

CREATE OR REPLACE FUNCTION public.set_customer_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'PLG-' || lpad(nextval('public.customers_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_customer_code ON public.customers;
CREATE TRIGGER trg_set_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_customer_code();

-- Backfill existing rows by created_at
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.customers
  WHERE code IS NULL OR code = ''
)
UPDATE public.customers c
SET code = 'PLG-' || lpad(o.rn::text, 5, '0')
FROM ordered o
WHERE c.id = o.id;

-- Advance sequence past current max
SELECT setval('public.customers_code_seq',
  GREATEST(
    (SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::bigint), 0) FROM public.customers),
    1
  )
);

ALTER TABLE public.customers ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customers_code_key ON public.customers(code);
