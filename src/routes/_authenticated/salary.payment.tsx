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

export const Route = createFileRoute("/_authenticated/salary/payment")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const employees = useList<any>("employees");
  const history = useQuery({
    queryKey: ["salary_payments_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salary_payments")
        .select("occurred_at, amount, note, employees(name)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Bayar Gaji">
      <PageHeader title="Pembayaran Cicilan Gaji" description="Kas berkurang & sisa hak gaji berkurang" />
      <TxForm
        title="Catat Pembayaran"
        fields={[
          { name: "employee_id", label: "Karyawan", type: "select", options: (employees.data ?? []).map((x) => ({ value: x.id, label: x.name })) },
          { name: "amount", label: "Nominal", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.rpc("record_salary_payment", {
            p_employee_id: v.employee_id, p_amount: Number(v.amount), p_note: v.note || null,
          });
          if (error) throw error;
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Karyawan</TableHead><TableHead className="text-right">Nominal</TableHead><TableHead>Catatan</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.employees?.name}</TableCell>
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
