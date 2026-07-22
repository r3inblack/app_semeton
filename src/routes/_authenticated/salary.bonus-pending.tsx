import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtIDR, fmtNum } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { toast } from "sonner";
import { sendTransactionNotification } from "@/lib/telegram";

export const Route = createFileRoute("/_authenticated/salary/bonus-pending")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useRole();

  const q = useQuery({
    queryKey: ["pending_employee_bonus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_employee_bonus" as any)
        .select("id, qty, note, status, created_at, employees(name), warehouses(name), products(id, name, buy_price)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const approve = async (row: any) => {
    if (!confirm("Setujui pengajuan bonus ini? Stok akan dikurangi dan dicatat sebagai pengeluaran.")) return;
    const { error } = await supabase.rpc("approve_pending_employee_bonus", { p_id: row.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Disetujui");
    const buy = Number(row.products?.buy_price ?? 0);
    const qty = Number(row.qty);
    sendTransactionNotification(
      "employee_bonus_approved",
      {
        employee: row.employees?.name ?? "-",
        warehouse: row.warehouses?.name ?? "-",
        product: row.products?.name ?? "-",
        qty: fmtNum(qty),
        unit_price: fmtIDR(buy),
        total: fmtIDR(qty * buy),
      },
      `✅ <b>Bonus Barang Disetujui</b>\nKaryawan: ${row.employees?.name}\nGudang: ${row.warehouses?.name}\nProduk: ${row.products?.name}\nQty: ${fmtNum(qty)}\nNilai: ${fmtIDR(qty * buy)}`,
    );
    qc.invalidateQueries();
  };

  const reject = async (id: string) => {
    if (!confirm("Tolak pengajuan ini?")) return;
    const { error } = await supabase.rpc("reject_pending_employee_bonus", { p_id: id, p_reason: "" });
    if (error) { toast.error(error.message); return; }
    toast.success("Ditolak");
    qc.invalidateQueries();
  };

  return (
    <AppShell title="Persetujuan Bonus Barang">
      <PageHeader title="Persetujuan Bonus Barang" description="Setujui bonus untuk mengurangi stok dan mencatat pengeluaran senilai harga beli." />
      <Card>
        <CardContent className="pt-6 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Gudang</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Estimasi Nilai</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((r: any) => {
                const est = Number(r.qty) * Number(r.products?.buy_price ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.created_at)}</TableCell>
                    <TableCell>{r.employees?.name}</TableCell>
                    <TableCell>{r.warehouses?.name}</TableCell>
                    <TableCell>{r.products?.name}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(est)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {isSuperAdmin ? (
                        <>
                          <Button size="sm" onClick={() => approve(r)}>Setujui</Button>
                          <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>Tolak</Button>
                        </>
                      ) : <span className="text-xs text-muted-foreground">menunggu admin</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!q.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Tidak ada pengajuan menunggu</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
