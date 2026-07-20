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
import { useRole } from "@/hooks/use-role";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSession } from "@/hooks/use-session";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavChild = { title: string; url: string };
type NavItem = {
  title: string;
  url?: string;
  icon: typeof LayoutDashboard;
  children?: NavChild[];
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Master Data",
    icon: Users,
    adminOnly: true,
    children: [
      { title: "Pelanggan", url: "/master/customers" },
      { title: "Supplier", url: "/master/suppliers" },
      { title: "Karyawan", url: "/master/employees" },
      { title: "Gudang", url: "/master/warehouses" },
      { title: "Produk", url: "/master/products" },
    ],
  },
  {
    title: "Stok",
    icon: Boxes,
    children: [
      { title: "Stok Gudang", url: "/stock/levels" },
      { title: "Barang Masuk", url: "/stock/in" },
      { title: "Mutasi Stok", url: "/stock/mutations" },
    ],
  },
  { title: "Penjualan", url: "/sales", icon: ShoppingCart, adminOnly: true },
  {
    title: "Kas",
    icon: Wallet,
    adminOnly: true,
    children: [
      { title: "Setoran Pelanggan", url: "/payments/customer" },
      { title: "Bayar Supplier", url: "/payments/supplier" },
      { title: "Pengeluaran", url: "/expenses" },
    ],
  },
  {
    title: "Penggajian",
    icon: HandCoins,
    adminOnly: true,
    children: [
      { title: "Tambah Hak Gaji", url: "/salary/accrual" },
      { title: "Kasbon / Uang Jalan", url: "/salary/advance" },
      { title: "Bayar Cicilan Gaji", url: "/salary/payment" },
      { title: "Bonus Barang", url: "/salary/bonus" },
    ],
  },
  {
    title: "Laporan",
    icon: FileBarChart,
    adminOnly: true,
    children: [
      { title: "Arus Kas", url: "/reports/cashflow" },
      { title: "Piutang / Setoran", url: "/reports/receivables" },
      { title: "Hutang Supplier", url: "/reports/payables" },
      { title: "Mutasi Barang", url: "/reports/mutations" },
    ],
  },
  { title: "Pengaturan", url: "/settings", icon: Settings, adminOnly: true },
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
  const { isAdmin } = useRole();
  const { data: settings } = useAppSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useSession();

  const filtered = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            S
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">
              {settings?.app_name ?? "Aplikasi Semeton"}
            </div>
            <div className="truncate text-xs text-sidebar-foreground/60">
              {isAdmin ? "Super Admin" : "Staf Gudang"}
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
        <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
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
          <header className="sticky top-0 z-10 h-14 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-4">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
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
