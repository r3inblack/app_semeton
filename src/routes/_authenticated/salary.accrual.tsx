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

export const Route = createFileRoute("/_authenticated/salary/accrual")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const employees = useList<any>("employees");
  const history = useQuery({
    queryKey: ["salary_accruals_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salary_accruals")
        .select("occurred_at, units, rate, amount, note, employees(name, category)")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Tambah Hak Gaji">
      <PageHeader
        title="Tambah Hak Gaji Karyawan"
        description="Untuk staf gudang: unit = stok masuk. Untuk kurir: unit = barang diantar."
      />
      <TxForm
        title="Catat Hak Gaji"
        fields={[
          { name: "employee_id", label: "Karyawan", type: "select", options: (employees.data ?? []).map((x) => ({ value: x.id, label: `${x.name} (${x.category})` })) },
          { name: "units", label: "Jumlah Unit", type: "number" },
          { name: "rate", label: "Komisi / unit", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.rpc("record_salary_accrual", {
            p_employee_id: v.employee_id, p_units: Number(v.units), p_rate: Number(v.rate), p_note: v.note || null,
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
              <TableHead>Waktu</TableHead><TableHead>Karyawan</TableHead>
              <TableHead className="text-right">Unit</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.employees?.name} <span className="text-muted-foreground text-xs">({r.employees?.category})</span></TableCell>
                  <TableCell className="text-right">{fmtNum(r.units)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(r.rate)}</TableCell>
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
