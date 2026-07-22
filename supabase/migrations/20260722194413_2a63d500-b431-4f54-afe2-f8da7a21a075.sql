INSERT INTO public.role_default_permissions (role, module, action, allowed) VALUES
  ('staf_gudang', 'supplier_returns', 'view', true),
  ('staf_gudang', 'supplier_returns', 'manage', true)
ON CONFLICT (role, module, action) DO UPDATE
SET allowed = EXCLUDED.allowed;