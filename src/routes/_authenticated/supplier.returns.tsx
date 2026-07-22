import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TxForm } from "@/components/tx-form";
import { useList } from "@/lib/list-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtIDR, fmtNum } from "@/lib/format";
import { sendTransactionNotification } from "@/lib/telegram";

export const Route = createFileRoute("/_authenticated/supplier/returns")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const suppliers = useList<any>("suppliers");
  const warehouses = useList<any>("warehouses");
  const products = useList<any>("products");

  const history = useQuery({
    queryKey: ["supplier_returns_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_returns" as any)
        .select("occurred_at, qty, unit_price, total, note, suppliers(name), warehouses(name), products(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Retur ke Supplier">
      <PageHeader
        title="Retur Barang ke Supplier"
        description="Mengurangi stok gudang dan mengurangi hutang supplier senilai harga beli per unit."
      />
      <TxForm
        title="Catat Retur"
        fields={[
          { name: "supplier_id", label: "Supplier", type: "select", options: (suppliers.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "warehouse_id", label: "Gudang Asal", type: "select", options: (warehouses.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "product_id", label: "Produk", type: "select", options: (products.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "qty", label: "Qty", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const qty = Number(v.qty);
          const { error } = await supabase.rpc("record_supplier_return", {
            p_supplier_id: v.supplier_id,
            p_warehouse_id: v.warehouse_id,
            p_product_id: v.product_id,
            p_qty: qty,
            p_note: v.note || null,
          });
          if (error) throw error;
          const sup = suppliers.data?.find((x) => x.id === v.supplier_id)?.name ?? "-";
          const wh = warehouses.data?.find((x) => x.id === v.warehouse_id)?.name ?? "-";
          const prod = products.data?.find((x) => x.id === v.product_id);
          const buy = Number(prod?.buy_price ?? 0);
          const total = qty * buy;
          sendTransactionNotification(
            "supplier_return",
            { supplier: sup, warehouse: wh, product: prod?.name ?? "-", qty: fmtNum(qty), unit_price: fmtIDR(buy), total: fmtIDR(total), note: v.note || "" },
            `↩️ <b>Retur ke Supplier</b>\nSupplier: ${sup}\nGudang: ${wh}\nProduk: ${prod?.name ?? "-"}\nQty: ${fmtNum(qty)}\nNilai: ${fmtIDR(total)} (mengurangi hutang)`,
          );
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Retur</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Supplier</TableHead><TableHead>Gudang</TableHead>
              <TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
