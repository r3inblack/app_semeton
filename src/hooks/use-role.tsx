import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-session";

export type AppRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "staff_keuangan"
  | "kasir"
  | "staf_gudang"
  | "viewer"
  | "custom";

export type PermAction = "view" | "manage";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager / Owner",
  staff_keuangan: "Staff Keuangan",
  kasir: "Kasir",
  staf_gudang: "Staf Gudang",
  viewer: "Viewer / Auditor",
  custom: "Custom",
};

export const ALL_MODULES: { key: string; label: string; group: string }[] = [
  { key: "dashboard", label: "Dashboard", group: "Umum" },
  { key: "master_customers", label: "Master Pelanggan", group: "Master Data" },
  { key: "master_suppliers", label: "Master Supplier", group: "Master Data" },
  { key: "master_employees", label: "Master Karyawan", group: "Master Data" },
  { key: "master_warehouses", label: "Master Gudang", group: "Master Data" },
  { key: "master_products", label: "Master Produk", group: "Master Data" },
  { key: "stock_levels", label: "Stok Gudang", group: "Stok" },
  { key: "stock_in", label: "Barang Masuk", group: "Stok" },
  { key: "stock_pending", label: "Persetujuan Barang Masuk", group: "Stok" },
  { key: "stock_mutations", label: "Mutasi Stok", group: "Stok" },
  { key: "sales", label: "Penjualan", group: "Transaksi" },
  { key: "payments_customer", label: "Setoran Pelanggan", group: "Kas" },
  { key: "payments_supplier", label: "Bayar Supplier", group: "Kas" },
  { key: "expenses", label: "Pengeluaran", group: "Kas" },
  { key: "salary_accrual", label: "Tambah Hak Gaji", group: "Gaji" },
  { key: "salary_advance", label: "Kasbon / Uang Jalan", group: "Gaji" },
  { key: "salary_payment", label: "Bayar Cicilan Gaji", group: "Gaji" },
  { key: "salary_bonus", label: "Bonus Barang", group: "Gaji" },
  { key: "reports_cashflow", label: "Laporan Arus Kas", group: "Laporan" },
  { key: "reports_receivables", label: "Laporan Piutang", group: "Laporan" },
  { key: "reports_payables", label: "Laporan Hutang", group: "Laporan" },
  { key: "reports_mutations", label: "Laporan Mutasi", group: "Laporan" },
  { key: "reports_expenses", label: "Laporan Pengeluaran", group: "Laporan" },
  { key: "users", label: "Manajemen User", group: "Pengaturan" },
  { key: "settings_app", label: "Nama Aplikasi", group: "Pengaturan" },
  { key: "settings_telegram", label: "Notifikasi Telegram", group: "Pengaturan" },
];

type PermMap = Record<string, { view: boolean; manage: boolean }>;

export function useRole() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: ["role-perms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      ]);
      const rlist = (roles ?? []).map((r) => r.role as AppRole);
      const role: AppRole =
        rlist.find((r) => r === "super_admin") ?? rlist[0] ?? "viewer";

      const perms: PermMap = {};
      for (const m of ALL_MODULES) perms[m.key] = { view: false, manage: false };

      if (role === "super_admin") {
        for (const k of Object.keys(perms)) perms[k] = { view: true, manage: true };
      } else if (role === "custom") {
        const { data: up } = await supabase
          .from("user_permissions" as any)
          .select("module, action, allowed")
          .eq("user_id", user!.id);
        for (const row of (up ?? []) as any[]) {
          if (!perms[row.module]) perms[row.module] = { view: false, manage: false };
          if (row.action === "view") perms[row.module].view = !!row.allowed;
          if (row.action === "manage") perms[row.module].manage = !!row.allowed;
        }
      } else {
        const { data: def } = await supabase
          .from("role_default_permissions" as any)
          .select("module, action, allowed")
          .eq("role", role);
        for (const row of (def ?? []) as any[]) {
          if (!perms[row.module]) perms[row.module] = { view: false, manage: false };
          if (row.action === "view") perms[row.module].view = !!row.allowed;
          if (row.action === "manage") perms[row.module].manage = !!row.allowed;
        }
      }
      // manage implies view
      for (const k of Object.keys(perms)) if (perms[k].manage) perms[k].view = true;

      return { role, profile, perms };
    },
  });

  const role = q.data?.role;
  const perms = q.data?.perms ?? ({} as PermMap);
  const can = (module: string, action: PermAction = "view") =>
    !!perms[module]?.[action];

  return {
    role,
    profile: q.data?.profile,
    perms,
    can,
    isAdmin: role === "super_admin",
    isSuperAdmin: role === "super_admin",
    isMaster: !!q.data?.profile?.is_master,
    isStaf: role === "staf_gudang",
    loading: q.isLoading,
  };
}
