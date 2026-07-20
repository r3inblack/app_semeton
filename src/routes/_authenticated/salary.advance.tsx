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

export const Route = createFileRoute("/_authenticated/salary/advance")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const employees = useList<any>("employees");
  const history = useQuery({
    queryKey: ["salary_advances_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salary_advances")
        .select("occurred_at, amount, note, employees(name, category)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Kasbon / Uang Jalan">
      <PageHeader title="Kasbon Karyawan / Uang Jalan Kurir" description="Kas berkurang & hak gaji terpotong" />
      <TxForm
        title="Catat Kasbon"
        fields={[
          { name: "employee_id", label: "Karyawan", type: "select", options: (employees.data ?? []).map((x) => ({ value: x.id, label: `${x.name} (${x.category})` })) },
          { name: "amount", label: "Nominal", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.rpc("record_salary_advance", {
            p_employee_id: v.employee_id, p_amount: Number(v.amount), p_note: v.note || null,
          });
          if (error) throw error;
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Kasbon</h3>
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
