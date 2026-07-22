import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader, MetricCard } from "@/components/page-header";
import { useRole } from "@/hooks/use-role";
import { fmtIDR, fmtDate, fmtNum } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, TrendingUp, TrendingDown, HandCoins } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Aplikasi Semeton" }] }),
  component: Dashboard,
});


function AdminDashboard({ can }: { can: (m: string, a?: any) => boolean }) {
  const showCash = can("dashboard_cash");
  const showRec = can("dashboard_receivables");
  const showPay = can("dashboard_payables");
  const showSal = can("dashboard_salary_debt");
  const showChart = can("dashboard_cash_chart");

  const cash = useQuery({
    queryKey: ["cash_balance"],
    enabled: showCash,
    queryFn: async () => (await supabase.from("cash_balance").select("amount").eq("id", 1).maybeSingle()).data,
  });
  const rec = useQuery({
    queryKey: ["cust_bal_sum"],
    enabled: showRec,
    queryFn: async () => {
      const { data } = await supabase.from("customer_balances").select("receivable");
      return (data ?? []).reduce((a, b) => a + Number(b.receivable), 0);
    },
  });
  const pay = useQuery({
    queryKey: ["sup_bal_sum"],
    enabled: showPay,
    queryFn: async () => {
      const { data } = await supabase.from("supplier_balances").select("payable");
      return (data ?? []).reduce((a, b) => a + Number(b.payable), 0);
    },
  });
  const sal = useQuery({
    queryKey: ["emp_bal_sum"],
    enabled: showSal,
    queryFn: async () => {
      const { data } = await supabase.from("employee_salary_balances").select("balance");
      return (data ?? []).reduce((a, b) => a + Number(b.balance), 0);
    },
  });
  const custList = useQuery({
    queryKey: ["cust_bal_list"],
    enabled: showRec,
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_balances")
        .select("receivable, customers(name)")
        .order("receivable", { ascending: false });
      return data ?? [];
    },
  });
  const empList = useQuery({
    queryKey: ["emp_bal_list"],
    enabled: showSal,
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_salary_balances")
        .select("balance, employees(name, category)")
        .order("balance", { ascending: false });
      return data ?? [];
    },
  });
  const chart = useQuery({
    queryKey: ["cash_chart"],
    enabled: showChart,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("cash_movements")
        .select("occurred_at, direction, amount")
        .gte("occurred_at", since.toISOString())
        .order("occurred_at", { ascending: true });
      const byDay: Record<string, number> = {};
      (data ?? []).forEach((m) => {
        const d = new Date(m.occurred_at).toISOString().slice(0, 10);
        const delta = m.direction === "in" ? Number(m.amount) : -Number(m.amount);
        byDay[d] = (byDay[d] ?? 0) + delta;
      });
      return Object.entries(byDay).map(([date, delta]) => ({ date: date.slice(5), delta }));
    },
  });

  const anyMetric = showCash || showRec || showPay || showSal;

  return (
    <>
      <PageHeader title="Dashboard Super Admin" description="Ringkasan keuangan & operasional" />
      {anyMetric && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showCash && (
            <MetricCard variant="primary" label="Sisa Saldo" value={fmtIDR(cash.data?.amount)}
              icon={<Wallet className="h-5 w-5 text-white" />} />
          )}
          {showRec && (
            <MetricCard variant="success" label="Total Piutang" value={fmtIDR(rec.data)}
              icon={<TrendingUp className="h-5 w-5 text-white" />} />
          )}
          {showPay && (
            <MetricCard variant="warning" label="Total Hutang Supplier" value={fmtIDR(pay.data)}
              icon={<TrendingDown className="h-5 w-5 text-white" />} />
          )}
          {showSal && (
            <MetricCard variant="danger" label="Sisa Hutang Gaji" value={fmtIDR(sal.data)}
              icon={<HandCoins className="h-5 w-5 text-white" />} />
          )}
        </div>
      )}

      {(showRec || showSal) && (
        <div className="grid gap-4 mt-6 lg:grid-cols-2">
          {showRec && (
            <Card>
              <CardHeader><CardTitle>Sisa Piutang per Pelanggan</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead className="text-right">Piutang</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(custList.data ?? []).map((r: any, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.customers?.name ?? "-"}</TableCell>
                          <TableCell className="text-right font-medium">{fmtIDR(r.receivable)}</TableCell>
                        </TableRow>
                      ))}
                      {!custList.data?.length && (
                        <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          {showSal && (
            <Card>
              <CardHeader><CardTitle>Sisa Hak Gaji per Karyawan</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Sisa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(empList.data ?? []).map((r: any, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.employees?.name ?? "-"}</TableCell>
                          <TableCell className="capitalize">{r.employees?.category ?? "-"}</TableCell>
                          <TableCell className="text-right font-medium">{fmtIDR(r.balance)}</TableCell>
                        </TableRow>
                      ))}
                      {!empList.data?.length && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showChart && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Pergerakan Kas 30 Hari Terakhir</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => fmtNum(v)} width={80} />
                  <Tooltip formatter={(v: any) => fmtIDR(v)} />
                  <Line type="monotone" dataKey="delta" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Dashboard() {
  const { isAdmin, isStaf, role, profile, can, loading } = useRole();
  if (loading)
    return (
      <AppShell title="Dashboard">
        <div>Memuat…</div>
      </AppShell>
    );
  // Super admin & custom roles use the granular widget dashboard.
  // Staf gudang keeps its dedicated personal dashboard.
  const useStaf = isStaf && !isAdmin;
  return (
    <AppShell title="Dashboard">
      {useStaf ? (
        <StafDashboard
          warehouseId={profile?.warehouse_id}
          employeeId={(profile as any)?.employee_id ?? null}
          can={can}
        />
      ) : (
        <AdminDashboard can={can} />
      )}
      {/* silence unused */}
      <span className="hidden">{role}</span>
    </AppShell>
  );
}



function StafDashboard({ warehouseId, employeeId, can }: { warehouseId?: string | null; employeeId?: string | null; can: (m: string, a?: any) => boolean }) {
  const stock = useQuery({
    queryKey: ["staf_stock", warehouseId],
    enabled: !!warehouseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_levels")
        .select("qty, products(name)")
        .eq("warehouse_id", warehouseId!);
      return data ?? [];
    },
  });
  const last = useQuery({
    queryKey: ["staf_last_sales", warehouseId],
    enabled: !!warehouseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("occurred_at, qty, total, customers(name), products(name)")
        .eq("warehouse_id", warehouseId!)
        .order("occurred_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });
  const salaryBalances = useQuery({
    queryKey: ["staf_salary_balances", employeeId, warehouseId],
    enabled: !!(employeeId || warehouseId),
    queryFn: async () => {
      let query = supabase
        .from("employee_salary_balances")
        .select("balance, employees!inner(name, category, warehouse_id)");
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      } else if (warehouseId) {
        query = query.eq("employees.warehouse_id", warehouseId);
      }
      const { data } = await query.order("balance", { ascending: false });
      return data ?? [];
    },
  });
  const salaryPayments = useQuery({
    queryKey: ["staf_salary_payments", employeeId, warehouseId],
    enabled: !!(employeeId || warehouseId),
    queryFn: async () => {
      let query = supabase
        .from("salary_payments")
        .select("occurred_at, amount, note, employees!inner(name, category, warehouse_id)");
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      } else if (warehouseId) {
        query = query.eq("employees.warehouse_id", warehouseId);
      }
      const { data } = await query.order("occurred_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  if (!warehouseId) {
    return (
      <>
        <PageHeader title="Dashboard Staf Gudang" />
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            Akun Anda belum dikaitkan dengan gudang. Hubungi Super Admin.
          </CardContent>
        </Card>
      </>
    );
  }

  const totalSisaGaji = (salaryBalances.data ?? []).reduce(
    (a: number, b: any) => a + Number(b.balance ?? 0),
    0,
  );

  return (
    <>
      <PageHeader title="Dashboard Staf Gudang" />
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          variant="warning"
          label="Total Sisa Hak Gaji"
          value={fmtIDR(totalSisaGaji)}
          icon={<HandCoins className="h-5 w-5 text-white" />}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sisa Hak Gaji per Karyawan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(salaryBalances.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{r.employees?.name ?? "-"}</TableCell>
                  <TableCell className="capitalize">{r.employees?.category ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{fmtIDR(r.balance)}</TableCell>
                </TableRow>
              ))}
              {!salaryBalances.data?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Belum ada data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Riwayat Penerimaan Gaji</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(salaryPayments.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.employees?.name ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{fmtIDR(r.amount)}</TableCell>
                  <TableCell>{r.note ?? "-"}</TableCell>
                </TableRow>
              ))}
              {!salaryPayments.data?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Belum ada penerimaan gaji
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sisa Stok di Gudang Anda</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stock.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{r.products?.name ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{fmtNum(r.qty)}</TableCell>
                </TableRow>
              ))}
              {!stock.data?.length && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Belum ada stok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>3 Transaksi Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(last.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.customers?.name ?? "-"}</TableCell>
                  <TableCell>{r.products?.name ?? "-"}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                  <TableCell>{fmtIDR(r.total)}</TableCell>
                </TableRow>
              ))}
              {!last.data?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Belum ada transaksi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
