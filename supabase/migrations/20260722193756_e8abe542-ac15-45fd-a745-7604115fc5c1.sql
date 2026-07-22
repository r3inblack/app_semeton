DELETE FROM public.role_default_permissions WHERE role = 'staf_gudang' AND module = 'supplier_returns';
INSERT INTO public.role_default_permissions(role, module, action, allowed) VALUES
  ('staf_gudang','supplier_returns','view',false),
  ('staf_gudang','supplier_returns','manage',false);