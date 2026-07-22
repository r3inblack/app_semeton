import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Truck,
  UserCog,
  Warehouse,
  Package,
  Boxes,
  PackagePlus,
  ArrowRightLeft,
  ShoppingCart,
  Banknote,
  CreditCard,
  Receipt,
  Wallet,
  HandCoins,
  Gift,
  FileBarChart,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRole, ROLE_LABELS } from "@/hooks/use-role";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSession } from "@/hooks/use-session";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavChild = { title: string; url: string; module?: string };
type NavItem = {
  title: string;
  url?: string;
  icon: typeof LayoutDashboard;
  module?: string;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  {
    title: "Master Data",
    icon: Users,
    children: [
      { title: "Pelanggan", url: "/master/customers", module: "master_customers" },
      { title: "Supplier", url: "/master/suppliers", module: "master_suppliers" },
      { title: "Karyawan", url: "/master/employees", module: "master_employees" },
      { title: "Gudang", url: "/master/warehouses", module: "master_warehouses" },
      { title: "Produk", url: "/master/products", module: "master_products" },
    ],
  },
  {
    title: "Stok",
    icon: Boxes,
    children: [
      { title: "Stok Gudang", url: "/stock/levels", module: "stock_levels" },
      { title: "Barang Masuk", url: "/stock/in", module: "stock_in" },
      { title: "Persetujuan Barang Masuk", url: "/stock/pending", module: "stock_pending" },
      { title: "Mutasi Stok", url: "/stock/mutations", module: "stock_mutations" },
    ],
  },
  { title: "Penjualan", url: "/sales", icon: ShoppingCart, module: "sales" },
  {
    title: "Kas",
    icon: Wallet,
    children: [
      { title: "Setoran Pelanggan", url: "/payments/customer", module: "payments_customer" },
      { title: "Bayar Supplier", url: "/payments/supplier", module: "payments_supplier" },
      { title: "Pengeluaran", url: "/expenses", module: "expenses" },
    ],
  },
  {
    title: "Penggajian",
    icon: HandCoins,
    children: [
      { title: "Tambah Hak Gaji", url: "/salary/accrual", module: "salary_accrual" },
      { title: "Tambah Hak Gaji Kurir", url: "/salary/accrual-kurir", module: "salary_accrual" },
      { title: "Kasbon / Uang Jalan", url: "/salary/advance", module: "salary_advance" },
      { title: "Bayar Cicilan Gaji", url: "/salary/payment", module: "salary_payment" },
      { title: "Bonus Barang", url: "/salary/bonus", module: "salary_bonus" },
    ],
  },
  {
    title: "Laporan",
    icon: FileBarChart,
    children: [
      { title: "Arus Kas", url: "/reports/cashflow", module: "reports_cashflow" },
      { title: "Piutang / Setoran", url: "/reports/receivables", module: "reports_receivables" },
      { title: "Hutang Supplier", url: "/reports/payables", module: "reports_payables" },
      { title: "Mutasi Barang", url: "/reports/mutations", module: "reports_mutations" },
      { title: "Pengeluaran", url: "/reports/expenses", module: "reports_expenses" },
    ],
  },
  { title: "Pengaturan", url: "/settings", icon: Settings, module: "__settings__" },
];

const ICONS: Record<string, typeof LayoutDashboard> = {
  Pelanggan: Users,
  Supplier: Truck,
  Karyawan: UserCog,
  Gudang: Warehouse,
  Produk: Package,
  "Stok Gudang": Boxes,
  "Barang Masuk": PackagePlus,
  "Mutasi Stok": ArrowRightLeft,
  "Setoran Pelanggan": Banknote,
  "Bayar Supplier": CreditCard,
  Pengeluaran: Receipt,
  "Tambah Hak Gaji": HandCoins,
  "Kasbon / Uang Jalan": Wallet,
  "Bayar Cicilan Gaji": Banknote,
  "Bonus Barang": Gift,
};

function AppSidebar() {
  const { role, can, isSuperAdmin } = useRole();
  const { data: settings } = useAppSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useSession();

  const settingsVisible =
    isSuperAdmin ||
    can("users", "view") ||
    can("users", "manage") ||
    can("settings_app", "view") ||
    can("settings_telegram", "view");

  const filtered = NAV.map((item) => {
    if (item.module === "__settings__") {
      return settingsVisible ? item : null;
    }
    if (item.children) {
      const kids = item.children.filter((c) => !c.module || can(c.module, "view"));
      if (!kids.length) return null;
      return { ...item, children: kids };
    }
    if (item.module && !can(item.module, "view")) return null;
    return item;
  }).filter(Boolean) as NavItem[];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.48_0.20_258)] text-primary-foreground font-bold shadow-sm shadow-primary/30">
            S
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">
              {settings?.app_name ?? "Aplikasi Semeton"}
            </div>
            <div className="truncate text-[11px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">
              {role ? ROLE_LABELS[role] : "—"}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filtered.map((item) => {
                if (item.children) {
                  const openDefault = item.children.some((c) => pathname.startsWith(c.url));
                  return <NavGroup key={item.title} item={item} defaultOpen={openDefault} pathname={pathname} />;
                }
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url!} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
          {/* Email hidden per request */}
        </div>
        <Button
          variant="ghost"
          className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Keluar
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({
  item,
  defaultOpen,
  pathname,
}: {
  item: NavItem;
  defaultOpen: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full">
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((c) => {
              const Icon = ICONS[c.title] ?? Boxes;
              const active = pathname === c.url;
              return (
                <SidebarMenuSubItem key={c.url}>
                  <SidebarMenuSubButton asChild isActive={active}>
                    <Link to={c.url} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{c.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { data: settings } = useAppSettings();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-16 flex items-center gap-3 border-b bg-card/90 backdrop-blur-md px-4 md:px-6 shadow-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold tracking-tight">
                {title ?? settings?.app_name ?? "Aplikasi Semeton"}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 max-w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
