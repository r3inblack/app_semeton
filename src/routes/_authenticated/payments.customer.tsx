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
import { sendTelegramNotification } from "@/lib/telegram";

export const Route = createFileRoute("/_authenticated/payments/customer")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const customers = useList<any>("customers");
  const history = useQuery({
    queryKey: ["customer_payments_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_payments")
        .select("occurred_at, amount, note, customers(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Setoran Pelanggan">
      <PageHeader title="Setoran Pelanggan" description="Cicilan piutang → saldo kas bertambah" />
      <TxForm
        title="Catat Setoran"
        fields={[
          { name: "customer_id", label: "Pelanggan", type: "select", options: (customers.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "amount", label: "Nominal", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.rpc("record_customer_payment", {
            p_customer_id: v.customer_id, p_amount: Number(v.amount), p_note: v.note || null,
          });
          if (error) throw error;
          const cust = customers.data?.find((c) => c.id === v.customer_id);
          sendTelegramNotification(`💰 <b>Setoran Pelanggan</b>\n${cust?.name ?? ""}: ${fmtIDR(v.amount)}`);
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Setoran</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Pelanggan</TableHead><TableHead className="text-right">Nominal</TableHead><TableHead>Catatan</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.customers?.name}</TableCell>
                  <TableCell className="text-right">{fmtIDR(r.amount)}</TableCell>
                  <TableCell>{r.note ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
