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

export const Route = createFileRoute("/_authenticated/salary/accrual-kurir")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const employees = useList<any>("employees");
  const kurirEmployees = (employees.data ?? []).filter((e) => e.category === "kurir");
  const history = useQuery({
    queryKey: ["salary_accruals_history", "kurir"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salary_accruals")
        .select("occurred_at, amount, note, employees!inner(name, category)")
        .eq("employees.category", "kurir")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Tambah Hak Gaji Kurir">
      <PageHeader
        title="Tambah Hak Gaji Kurir"
        description="Catat penambahan hak gaji untuk kurir."
      />
      <TxForm
        title="Catat Hak Gaji"
        fields={[
          { name: "employee_id", label: "Kurir", type: "select", options: kurirEmployees.map((x) => ({ value: x.id, label: x.name })) },
          { name: "amount", label: "Jumlah Gaji", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const amount = Number(v.amount);
          if (!v.employee_id) throw new Error("Pilih kurir");
          if (!amount || amount <= 0) throw new Error("Jumlah gaji tidak valid");
          const { error } = await supabase.rpc("record_salary_accrual", {
            p_employee_id: v.employee_id, p_units: 1, p_rate: amount, p_note: v.note || null,
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
              <TableHead>Waktu</TableHead><TableHead>Kurir</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.employees?.name}</TableCell>
                  <TableCell className="text-right font-medium">{fmtIDR(r.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
