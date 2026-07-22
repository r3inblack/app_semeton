DELETE FROM public.role_default_permissions
WHERE role = 'staf_gudang'
  AND module IN ('supplier_returns', 'reports_returns');

INSERT INTO public.role_default_permissions(role, module, action, allowed) VALUES
  ('staf_gudang','supplier_returns','view',false),
  ('staf_gudang','supplier_returns','manage',false),
  ('staf_gudang','reports_returns','view',false),
  ('staf_gudang','reports_returns','manage',false)
ON CONFLICT (role, module, action) DO UPDATE
SET allowed = EXCLUDED.allowed;