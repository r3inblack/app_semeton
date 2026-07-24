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
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
});

function SalesPage() {
  const qc = useQueryClient();
  const customers = useList<any>("customers");
  const warehouses = useList<any>("warehouses");
  const products = useList<any>("products");
  const history = useQuery({
    queryKey: ["sales_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, occurred_at, qty, unit_price, total, voided_at, void_reason, customers(name), warehouses(name), products(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Penjualan">
      <PageHeader title="Penjualan" description="Tunai, DP, atau kredit — harga bisa diubah per transaksi" />
      <TxForm
        title="Catat Penjualan"
        fields={[
          { name: "customer_id", label: "Pelanggan", type: "select", options: (customers.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "warehouse_id", label: "Gudang", type: "select", options: (warehouses.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "product_id", label: "Produk", type: "select", options: (products.data ?? []).map((x) => ({ value: x.id, label: `${x.name} — ${fmtIDR(x.sell_price)}` })) },
          { name: "qty", label: "Qty", type: "number" },
          { name: "unit_price", label: "Harga / unit (kosongkan = pakai harga jual default)", type: "number" },
          { name: "payment_type", label: "Jenis Pembayaran", type: "select", options: [
            { value: "kredit", label: "Kredit (belum bayar)" },
            { value: "tunai", label: "Tunai (lunas)" },
            { value: "dp", label: "DP (bayar sebagian)" },
          ] },
          { name: "paid_amount", label: "Nominal DP (isi jika DP)", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const prod = products.data?.find((p) => p.id === v.product_id);
          const price = v.unit_price ? Number(v.unit_price) : Number(prod?.sell_price ?? 0);
          const qty = Number(v.qty);
          const total = qty * price;
          const paymentType = (v.payment_type as string) || "kredit";
          let paid = 0;
          if (paymentType === "tunai") paid = total;
          else if (paymentType === "dp") paid = Number(v.paid_amount || 0);
          if (paymentType === "dp" && (!(paid > 0) || paid >= total)) {
            throw new Error("Nominal DP harus lebih dari 0 dan kurang dari total");
          }

          const { error } = await supabase.rpc("record_sale", {
            p_customer_id: v.customer_id, p_warehouse_id: v.warehouse_id, p_product_id: v.product_id,
            p_qty: qty, p_unit_price: price, p_note: v.note || null,
          });
          if (error) throw error;

          const cust = customers.data?.find((c) => c.id === v.customer_id);
          const wh = warehouses.data?.find((w) => w.id === v.warehouse_id);
          const label = paymentType === "tunai" ? "Tunai" : paymentType === "dp" ? "DP" : "Kredit";

          if (paid > 0) {
            const payNote = `${label} penjualan ${prod?.name ?? ""}${v.note ? " — " + v.note : ""}`;
            const { error: payErr } = await supabase.rpc("record_customer_payment", {
              p_customer_id: v.customer_id, p_amount: paid, p_note: payNote,
            });
            if (payErr) throw payErr;
          }

          sendTransactionNotification(
            "sale",
            {
              customer: cust?.name ?? "-",
              warehouse: wh?.name ?? "-",
              product: prod?.name ?? "-",
              qty: fmtNum(qty),
              unit_price: fmtIDR(price),
              total: fmtIDR(total),
            },
            `🛒 <b>Penjualan ${label}</b>\nPelanggan: ${cust?.name ?? "-"}\nProduk: ${prod?.name ?? "-"}\nQty: ${fmtNum(qty)}\nHarga: ${fmtIDR(price)}\nTotal: ${fmtIDR(total)}${paid > 0 ? `\nDibayar: ${fmtIDR(paid)}\nSisa Piutang: ${fmtIDR(total - paid)}` : ""}`,
          );
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Terbaru</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Pelanggan</TableHead><TableHead>Gudang</TableHead>
              <TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.customers?.name}</TableCell>
                  <TableCell>{r.warehouses?.name}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
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
