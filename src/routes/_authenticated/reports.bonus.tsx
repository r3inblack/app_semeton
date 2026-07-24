import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtIDR, fmtNum } from "@/lib/format";
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/reports/bonus")({
  component: Page,
});

function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);

  const q = useQuery({
    queryKey: ["reports_bonus", from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_bonuses")
        .select("id, occurred_at, qty, note, voided_at, void_reason, employees(name), warehouses(name), products(name, buy_price)")
        .gte("occurred_at", from)
        .lte("occurred_at", to + "T23:59:59")
        .order("occurred_at", { ascending: false });
      return data ?? [];
    },
  });

  const rows = q.data ?? [];
  const totalValue = rows.reduce((s: number, r: any) => s + Number(r.qty) * Number(r.products?.buy_price ?? 0), 0);
  const totalQty = rows.reduce((s: number, r: any) => s + Number(r.qty), 0);

  return (
    <AppShell title="Laporan Bonus Barang">
      <PageHeader title="Laporan Bonus Barang" description="Rekap bonus barang karyawan senilai harga beli." />
      <Card className="mb-4">
        <CardContent className="pt-6 grid gap-3 md:grid-cols-3">
          <div className="space-y-1"><Label>Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label>Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Karyawan</TableHead><TableHead>Gudang</TableHead>
              <TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Nilai</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any, i: number) => {
                const buy = Number(r.products?.buy_price ?? 0);
                return (
                  <TableRow key={i} className={r.voided_at ? "opacity-50" : ""}>
                    <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                    <TableCell>{r.employees?.name}</TableCell>
                    <TableCell>{r.warehouses?.name}</TableCell>
                    <TableCell>{r.products?.name}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(buy)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(Number(r.qty) * buy)}</TableCell>
                    <TableCell className="text-right">
                      <VoidButton table="employee_bonuses" id={r.id} voidedAt={r.voided_at} voidReason={r.void_reason} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>}
            </TableBody>
            {!!rows.length && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{fmtNum(totalQty)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold">{fmtIDR(totalValue)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
