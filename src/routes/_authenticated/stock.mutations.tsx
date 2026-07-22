import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TxForm } from "@/components/tx-form";
import { useList } from "@/lib/list-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtNum } from "@/lib/format";
import { sendTransactionNotification } from "@/lib/telegram";

export const Route = createFileRoute("/_authenticated/stock/mutations")({
  component: MutationPage,
});

function MutationPage() {
  const qc = useQueryClient();
  const warehouses = useList<any>("warehouses");
  const products = useList<any>("products");
  const history = useQuery({
    queryKey: ["mutation_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_mutations")
        .select("occurred_at, qty, from_warehouse:warehouses!stock_mutations_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_mutations_to_warehouse_id_fkey(name), products(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Mutasi Stok">
      <PageHeader title="Mutasi Stok" description="Pindah barang antar gudang" />
      <TxForm
        title="Catat Mutasi"
        fields={[
          { name: "from", label: "Dari Gudang", type: "select", options: (warehouses.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "to", label: "Ke Gudang", type: "select", options: (warehouses.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "product_id", label: "Produk", type: "select", options: (products.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "qty", label: "Qty", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const qty = Number(v.qty);
          const { error } = await supabase.rpc("record_mutation", {
            p_from: v.from, p_to: v.to, p_product_id: v.product_id, p_qty: qty, p_note: v.note || null,
          });
          if (error) throw error;
          const from = warehouses.data?.find((w) => w.id === v.from)?.name ?? "-";
          const to = warehouses.data?.find((w) => w.id === v.to)?.name ?? "-";
          const prod = products.data?.find((p) => p.id === v.product_id)?.name ?? "-";
          sendTransactionNotification(
            "stock_mutation",
            { from, to, product: prod, qty: fmtNum(qty), note: v.note || "" },
            `🔄 <b>Mutasi Stok</b>\nDari: ${from}\nKe: ${to}\nProduk: ${prod}\nQty: ${fmtNum(qty)}`,
          );
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Terbaru</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Dari</TableHead><TableHead>Ke</TableHead><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.from_warehouse?.name}</TableCell>
                  <TableCell>{r.to_warehouse?.name}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
