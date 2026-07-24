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
import { useList } from "@/lib/list-hooks";
import { fmtDate, fmtIDR, fmtNum } from "@/lib/format";
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/reports/returns")({
  component: Page,
});

function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [supplierId, setSupplierId] = useState<string>("");
  const suppliers = useList<any>("suppliers");

  const q = useQuery({
    queryKey: ["reports_returns", from, to, supplierId],
    queryFn: async () => {
      let query = supabase
        .from("supplier_returns" as any)
        .select("id, occurred_at, qty, unit_price, total, note, voided_at, void_reason, suppliers(name), warehouses(name), products(name)")
        .gte("occurred_at", from)
        .lte("occurred_at", to + "T23:59:59")
        .order("occurred_at", { ascending: false });
      if (supplierId) query = query.eq("supplier_id", supplierId);
      const { data } = await query;
      return data ?? [];
    },
  });

  const rows = q.data ?? [];
  const totalValue = rows.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
  const totalQty = rows.reduce((s: number, r: any) => s + Number(r.qty), 0);

  return (
    <AppShell title="Laporan Retur Supplier">
      <PageHeader title="Laporan Retur ke Supplier" description="Rekap barang yang dikembalikan ke supplier (mengurangi hutang)." />
      <Card className="mb-4">
        <CardContent className="pt-6 grid gap-3 md:grid-cols-3">
          <div className="space-y-1"><Label>Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label>Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Supplier</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">— semua —</option>
              {(suppliers.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Supplier</TableHead><TableHead>Gudang</TableHead>
              <TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.suppliers?.name}</TableCell>
                  <TableCell>{r.warehouses?.name}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(r.unit_price)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(r.total)}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>}
            </TableBody>
            {!!rows.length && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{fmtNum(totalQty)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold">{fmtIDR(totalValue)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
