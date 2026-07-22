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

export const Route = createFileRoute("/_authenticated/salary/accrual")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const employees = useList<any>("employees");
  const gudangEmployees = (employees.data ?? []).filter((e) => e.category === "gudang");
  const history = useQuery({
    queryKey: ["salary_accruals_history", "gudang"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salary_accruals")
        .select("occurred_at, amount, note, employees!inner(name, category)")
        .eq("employees.category", "gudang")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Tambah Hak Gaji">
      <PageHeader
        title="Tambah Hak Gaji Staf Gudang"
        description="Catat penambahan hak gaji untuk staf gudang."
      />
      <TxForm
        title="Catat Hak Gaji"
        fields={[
          { name: "employee_id", label: "Karyawan", type: "select", options: gudangEmployees.map((x) => ({ value: x.id, label: x.name })) },
          { name: "amount", label: "Jumlah Gaji", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          const amount = Number(v.amount);
          if (!v.employee_id) throw new Error("Pilih karyawan");
          if (!amount || amount <= 0) throw new Error("Jumlah gaji tidak valid");
          const { error } = await supabase.rpc("record_salary_accrual", {
            p_employee_id: v.employee_id, p_units: 1, p_rate: amount, p_note: v.note || null,
          });
          if (error) throw error;
          const emp = gudangEmployees.find((e) => e.id === v.employee_id);
          sendTransactionNotification(
            "salary_accrual_gudang",
            { employee: emp?.name ?? "-", amount: fmtIDR(amount), note: v.note || "" },
            `➕ <b>Tambah Hak Gaji (Gudang)</b>\nKaryawan: ${emp?.name ?? "-"}\nJumlah: ${fmtIDR(amount)}`,
          );
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Karyawan</TableHead>
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
