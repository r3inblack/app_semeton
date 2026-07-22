
CREATE OR REPLACE FUNCTION public.set_customer_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'S' || lpad(nextval('public.customers_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill existing rows to new format, preserving numeric order by created_at
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.customers
)
UPDATE public.customers c
SET code = 'S' || lpad(o.rn::text, 4, '0')
FROM ordered o
WHERE c.id = o.id;

-- Reset sequence to continue after the highest number
SELECT setval('public.customers_code_seq', COALESCE((SELECT COUNT(*) FROM public.customers), 0), true);
