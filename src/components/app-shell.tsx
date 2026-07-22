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
  Bell,
  User as UserIcon,
  ClipboardCheck,
  Tags,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      { title: "Kategori Pengeluaran", url: "/master/expense-categories", module: "master_expense_categories" },
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
      { title: "Persetujuan Bonus", url: "/salary/bonus-pending", module: "salary_bonus_pending" },
    ],
  },
  {
    title: "Supplier",
    icon: Truck,
    children: [
      { title: "Retur ke Supplier", url: "/supplier/returns", module: "supplier_returns" },
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
      { title: "Bonus Barang", url: "/reports/bonus", module: "reports_bonus" },
      { title: "Retur Supplier", url: "/reports/returns", module: "reports_returns" },
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
  "Kategori Pengeluaran": Tags,
  "Stok Gudang": Boxes,
  "Barang Masuk": PackagePlus,
  "Persetujuan Barang Masuk": ClipboardCheck,
  "Mutasi Stok": ArrowRightLeft,
  "Setoran Pelanggan": Banknote,
  "Bayar Supplier": CreditCard,
  Pengeluaran: Receipt,
  "Tambah Hak Gaji": HandCoins,
  "Tambah Hak Gaji Kurir": HandCoins,
  "Kasbon / Uang Jalan": Wallet,
  "Bayar Cicilan Gaji": Banknote,
  "Bonus Barang": Gift,
  "Persetujuan Bonus": ClipboardCheck,
  "Retur ke Supplier": ArrowRightLeft,
  "Arus Kas": FileBarChart,
  "Piutang / Setoran": FileBarChart,
  "Hutang Supplier": FileBarChart,
  "Mutasi Barang": FileBarChart,
  "Retur Supplier": FileBarChart,
};

function AppSidebar() {
  const { role, can, isSuperAdmin } = useRole();
  const { data: settings } = useAppSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const hiddenForStafGudang = new Set(["supplier_returns", "reports_returns"]);
  const isHiddenForCurrentRole = (module?: string) =>
    role === "staf_gudang" && !!module && hiddenForStafGudang.has(module);

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
      const kids = item.children.filter(
        (c) => !isHiddenForCurrentRole(c.module) && (!c.module || can(c.module, "view")),
      );
      if (!kids.length) return null;
      return { ...item, children: kids };
    }
    if (isHiddenForCurrentRole(item.module)) return null;
    if (item.module && !can(item.module, "view")) return null;
    return item;
  }).filter(Boolean) as NavItem[];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground font-bold shadow-[var(--shadow-glow)]">
            {(settings?.app_name ?? "S").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">
              {settings?.app_name ?? "Aplikasi Semeton"}
            </div>
            <div className="truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/50 font-medium">
              {role ? ROLE_LABELS[role] : "—"}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
            Navigasi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {filtered.map((item) => {
                if (item.children) {
                  const openDefault = item.children.some((c) => pathname.startsWith(c.url));
                  return (
                    <NavGroup
                      key={item.title}
                      item={item}
                      defaultOpen={openDefault}
                      pathname={pathname}
                    />
                  );
                }
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-10 rounded-lg text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-[image:var(--gradient-primary)] data-[active=true]:text-white data-[active=true]:shadow-[var(--shadow-glow)]"
                    >
                      <Link to={item.url!} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <div className="rounded-lg bg-sidebar-accent/40 px-3 py-2.5 text-[11px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          <div className="font-medium text-sidebar-foreground/80">v1.0</div>
          <div>{settings?.app_name ?? "Aplikasi Semeton"}</div>
        </div>
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
  const hasActiveChild = item.children!.some((c) => pathname === c.url);
  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={`h-10 w-full rounded-lg transition-colors hover:bg-sidebar-accent hover:text-white ${
              hasActiveChild
                ? "text-white bg-sidebar-accent/60"
                : "text-sidebar-foreground/85"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left text-sm font-medium">{item.title}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-4 mt-1 gap-0.5 border-l border-sidebar-border/60 pl-2">
            {item.children!.map((c) => {
              const Icon = ICONS[c.title] ?? Boxes;
              const active = pathname === c.url;
              return (
                <SidebarMenuSubItem key={c.url}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={active}
                    className="h-8 rounded-md text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-primary/90 data-[active=true]:text-white"
                  >
                    <Link to={c.url} className="flex items-center gap-2.5">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[13px]">{c.title}</span>
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

function HeaderBar({ title }: { title?: string }) {
  const { data: settings } = useAppSettings();
  const { user } = useSession();
  const { role } = useRole();
  const navigate = useNavigate();

  const rawName = (user?.email ?? "").split("@")[0] || "User";
  const initials = rawName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/95 backdrop-blur-md shadow-[var(--shadow-xs)]">
      <div className="flex h-full items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold tracking-tight text-foreground">
            {title ?? settings?.app_name ?? "Aplikasi Semeton"}
          </div>
          <div className="hidden truncate text-xs text-muted-foreground sm:block">
            {settings?.app_name ?? "Aplikasi Semeton"}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifikasi"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full border border-border bg-background/60 py-1 pl-1 pr-2.5 transition-colors hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[image:var(--gradient-primary)] text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold leading-tight text-foreground">
                  {rawName}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {role ? ROLE_LABELS[role] : "—"}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">{rawName}</div>
              <div className="text-xs font-normal text-muted-foreground">
                {role ? ROLE_LABELS[role] : "—"}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <Settings className="mr-2 h-4 w-4" />
              Pengaturan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
              <UserIcon className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <HeaderBar title={title} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
