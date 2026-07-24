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
import { useRole } from "@/hooks/use-role";
import { sendPricingNotification, sendTransactionNotification } from "@/lib/telegram";
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/salary/bonus")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useRole();
  const employees = useList<any>("employees");
  const warehouses = useList<any>("warehouses");
  const products = useList<any>("products");

  const history = useQuery({
    queryKey: ["employee_bonus_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_bonuses")
        .select("id, occurred_at, qty, note, voided_at, void_reason, employees(name), warehouses(name), products(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Bonus Barang">
      <PageHeader
        title="Bonus Barang untuk Karyawan"
        description={
          isSuperAdmin
            ? "Mencatat bonus akan mengurangi stok dan otomatis dicatat sebagai pengeluaran senilai harga beli."
            : "Ajukan bonus barang. Menunggu persetujuan Super Admin sebelum stok dikurangi."
        }
      />
      <TxForm
        title={isSuperAdmin ? "Catat Bonus Barang" : "Ajukan Bonus Barang"}
        submitLabel={isSuperAdmin ? "Simpan" : "Ajukan"}
        fields={[
          { name: "employee_id", label: "Karyawan", type: "select", options: (employees.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "warehouse_id", label: "Gudang Asal", type: "select", options: (warehouses.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "product_id", label: "Produk", type: "select", options: (products.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "qty", label: "Qty", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const qty = Number(v.qty);
          const emp = employees.data?.find((e) => e.id === v.employee_id)?.name ?? "-";
          const wh = warehouses.data?.find((w) => w.id === v.warehouse_id)?.name ?? "-";
          const prod = products.data?.find((p) => p.id === v.product_id)?.name ?? "-";

          if (isSuperAdmin) {
            const { error } = await supabase.rpc("record_employee_bonus", {
              p_employee_id: v.employee_id, p_warehouse_id: v.warehouse_id, p_product_id: v.product_id,
              p_qty: qty, p_note: v.note || null,
            });
            if (error) throw error;
            sendTransactionNotification(
              "employee_bonus",
              { employee: emp, warehouse: wh, product: prod, qty: fmtNum(qty), note: v.note || "" },
              `🎁 <b>Bonus Barang Karyawan</b>\nKaryawan: ${emp}\nGudang: ${wh}\nProduk: ${prod}\nQty: ${fmtNum(qty)}`,
            );
          } else {
            const { data: pendingId, error } = await supabase.rpc("submit_pending_employee_bonus", {
              p_employee_id: v.employee_id, p_warehouse_id: v.warehouse_id, p_product_id: v.product_id,
              p_qty: qty, p_note: v.note || null,
            });
            if (error) throw error;
            await sendPricingNotification(
              "employee_bonus_pending",
              { employee: emp, warehouse: wh, product: prod, qty: fmtNum(qty), note: v.note || "", pending_id: pendingId },
              `<b>🎁 Pengajuan Bonus Barang</b>\nKaryawan: ${emp}\nGudang: ${wh}\nProduk: ${prod}\nQty: ${fmtNum(qty)}\n\nBalas dengan <code>ok</code> untuk menyetujui.\n#BONUS:${pendingId}`,
            );
          }
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Bonus</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Karyawan</TableHead><TableHead>Gudang</TableHead>
              <TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i} className={r.voided_at ? "opacity-50" : ""}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.employees?.name}</TableCell>
                  <TableCell>{r.warehouses?.name}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.qty)}</TableCell>
                  <TableCell className="text-right">
                    <VoidButton table="employee_bonuses" id={r.id} voidedAt={r.voided_at} voidReason={r.void_reason} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
