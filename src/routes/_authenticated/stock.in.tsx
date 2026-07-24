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
import { useRole } from "@/hooks/use-role";
import { sendPricingNotification, sendTransactionNotification } from "@/lib/telegram";
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/stock/in")({
  component: StockInPage,
});

function StockInPage() {
  const qc = useQueryClient();
  const { role } = useRole();
  const isGudang = role === "staf_gudang";
  const suppliers = useList<any>("suppliers");
  const warehouses = useList<any>("warehouses");
  const products = useList<any>("products");
  const history = useQuery({
    queryKey: ["stock_in_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_in")
        .select("occurred_at, qty, unit_price, total, suppliers(name), warehouses(name), products(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const baseFields = [
    { name: "supplier_id", label: "Supplier", type: "select" as const, options: (suppliers.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
    { name: "warehouse_id", label: "Gudang", type: "select" as const, options: (warehouses.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
    { name: "product_id", label: "Produk", type: "select" as const, options: (products.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
    { name: "qty", label: "Qty", type: "number" as const },
  ];

  return (
    <AppShell title="Barang Masuk">
      <PageHeader
        title="Barang Masuk"
        description={
          isGudang
            ? "Ajukan barang masuk. Harga beli & jual ditentukan Super Admin sebelum stok dapat dipakai."
            : "Menambah stok gudang dan hutang supplier"
        }
      />
      <TxForm
        title={isGudang ? "Ajukan Barang Masuk" : "Catat Barang Masuk"}
        submitLabel={isGudang ? "Ajukan" : "Simpan"}
        fields={
          isGudang
            ? [...baseFields, { name: "note", label: "Catatan", type: "textarea" }]
            : [
                ...baseFields,
                { name: "unit_price", label: "Harga Beli / unit", type: "number" as const },
                { name: "note", label: "Catatan", type: "textarea" as const },
              ]
        }
        onSubmit={async (v) => {
          if (isGudang) {
            const { data: pendingId, error } = await supabase.rpc("submit_pending_stock_in", {
              p_supplier_id: v.supplier_id,
              p_warehouse_id: v.warehouse_id,
              p_product_id: v.product_id,
              p_qty: Number(v.qty),
              p_note: v.note || null,
            });
            if (error) throw error;
            const supplier = (suppliers.data ?? []).find((x: any) => x.id === v.supplier_id)?.name ?? "-";
            const warehouse = (warehouses.data ?? []).find((x: any) => x.id === v.warehouse_id)?.name ?? "-";
            const product = (products.data ?? []).find((x: any) => x.id === v.product_id)?.name ?? "-";
            await sendPricingNotification(
              "stock_in_pending",
              {
                supplier,
                warehouse,
                product,
                qty: fmtNum(Number(v.qty)),
                note: v.note || "",
                pending_id: pendingId,
              },
              `<b>📦 Pengajuan Barang Masuk</b>\nSupplier: ${supplier}\nGudang: ${warehouse}\nProduk: ${product}\nQty: ${fmtNum(Number(v.qty))}\n\n#ID:${pendingId}`,
            );
          } else {
            const qty = Number(v.qty);
            const price = Number(v.unit_price);
            const { error } = await supabase.rpc("record_stock_in", {
              p_supplier_id: v.supplier_id,
              p_warehouse_id: v.warehouse_id,
              p_product_id: v.product_id,
              p_qty: qty,
              p_unit_price: price,
              p_note: v.note || null,
            });
            if (error) throw error;
            const supplier = (suppliers.data ?? []).find((x: any) => x.id === v.supplier_id)?.name ?? "-";
            const warehouse = (warehouses.data ?? []).find((x: any) => x.id === v.warehouse_id)?.name ?? "-";
            const product = (products.data ?? []).find((x: any) => x.id === v.product_id)?.name ?? "-";
            sendTransactionNotification(
              "stock_in",
              {
                supplier,
                warehouse,
                product,
                qty: fmtNum(qty),
                unit_price: fmtIDR(price),
                total: fmtIDR(qty * price),
                note: v.note || "",
              },
              `📥 <b>Barang Masuk</b>\nSupplier: ${supplier}\nGudang: ${warehouse}\nProduk: ${product}\nQty: ${fmtNum(qty)}\nTotal: ${fmtIDR(qty * price)}`,
            );
          }
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Terbaru</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Gudang</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                {!isGudang && <TableHead className="text-right">Total</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.suppliers?.name}</TableCell>
                  <TableCell>{r.warehouses?.name}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                  {!isGudang && <TableCell className="text-right">{fmtIDR(r.total)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
