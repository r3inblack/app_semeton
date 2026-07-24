import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TxForm } from "@/components/tx-form";
import { useList } from "@/lib/list-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtIDR } from "@/lib/format";
import { sendTransactionNotification } from "@/lib/telegram";
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/payments/supplier")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const suppliers = useList<any>("suppliers");
  const history = useQuery({
    queryKey: ["supplier_payments_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_payments")
        .select("id, occurred_at, amount, note, voided_at, void_reason, suppliers(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Bayar Supplier">
      <PageHeader title="Bayar Supplier" description="Kas berkurang → hutang supplier berkurang" />
      <TxForm
        title="Catat Pembayaran"
        fields={[
          { name: "supplier_id", label: "Supplier", type: "select", options: (suppliers.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "amount", label: "Nominal", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.rpc("record_supplier_payment", {
            p_supplier_id: v.supplier_id, p_amount: Number(v.amount), p_note: v.note || null,
          });
          if (error) throw error;
          const sup = suppliers.data?.find((s) => s.id === v.supplier_id);
          sendTransactionNotification(
            "supplier_payment",
            { supplier: sup?.name ?? "-", amount: fmtIDR(v.amount), note: v.note || "" },
            `🏭 <b>Bayar Supplier</b>\n${sup?.name ?? ""}: ${fmtIDR(v.amount)}`,
          );
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Pembayaran</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Nominal</TableHead><TableHead>Catatan</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i} className={r.voided_at ? "opacity-50" : ""}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.suppliers?.name}</TableCell>
                  <TableCell className="text-right">{fmtIDR(r.amount)}</TableCell>
                  <TableCell>{r.note ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <VoidButton table="supplier_payments" id={r.id} voidedAt={r.voided_at} voidReason={r.void_reason} />
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
