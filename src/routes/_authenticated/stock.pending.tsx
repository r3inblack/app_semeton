import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { fmtDate, fmtNum } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock/pending")({
  component: PendingStockInPage,
});

function PendingStockInPage() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useRole();
  const [selected, setSelected] = useState<any | null>(null);
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [loading, setLoading] = useState(false);

  const q = useQuery({
    queryKey: ["pending_stock_in"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_stock_in" as any)
        .select("id, qty, note, status, created_at, suppliers(name), warehouses(name), products(id, name, buy_price, sell_price)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const openApprove = (row: any) => {
    setSelected(row);
    setBuy(row.products?.buy_price ? String(row.products.buy_price) : "");
    setSell(row.products?.sell_price ? String(row.products.sell_price) : "");
  };

  const approve = async () => {
    if (!selected) return;
    const b = Number(buy), s = Number(sell);
    if (!b || !s) { toast.error("Harga beli dan jual wajib diisi"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("approve_pending_stock_in", {
      p_id: selected.id, p_buy_price: b, p_sell_price: s,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Disetujui dan stok ditambahkan");
    setSelected(null); setBuy(""); setSell("");
    qc.invalidateQueries();
  };

  const reject = async (id: string) => {
    if (!confirm("Tolak pengajuan ini?")) return;
    const { error } = await supabase.rpc("reject_pending_stock_in", { p_id: id, p_reason: "" });
    if (error) { toast.error(error.message); return; }
    toast.success("Ditolak");
    qc.invalidateQueries();
  };

  return (
    <AppShell title="Persetujuan Barang Masuk">
      <PageHeader
        title="Persetujuan Barang Masuk"
        description="Tetapkan harga beli & jual sebelum stok masuk ke gudang."
      />
      <Card>
        <CardContent className="pt-6 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Gudang</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.created_at)}</TableCell>
                  <TableCell>{r.suppliers?.name}</TableCell>
                  <TableCell>{r.warehouses?.name}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.note ?? "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {isSuperAdmin ? (
                      <>
                        <Button size="sm" onClick={() => openApprove(r)}>Setujui</Button>
                        <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>Tolak</Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">menunggu admin</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!q.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Tidak ada pengajuan menunggu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui & Tetapkan Harga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 bg-muted/40 space-y-1">
              <div><span className="text-muted-foreground">Produk: </span>{selected?.products?.name}</div>
              <div><span className="text-muted-foreground">Qty: </span>{fmtNum(selected?.qty ?? 0)}</div>
              <div><span className="text-muted-foreground">Supplier: </span>{selected?.suppliers?.name}</div>
              <div><span className="text-muted-foreground">Gudang: </span>{selected?.warehouses?.name}</div>
            </div>
            <div className="space-y-1">
              <Label>Harga Beli / unit</Label>
              <NumberInput value={buy} onChange={(e) => setBuy(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Harga Jual / unit</Label>
              <NumberInput value={sell} onChange={(e) => setSell(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Menyetujui akan memperbarui harga di master produk, menambah stok, dan menambah hutang supplier.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={approve} disabled={loading}>{loading ? "Menyimpan..." : "Setujui"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
