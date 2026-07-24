import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TxForm } from "@/components/tx-form";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtIDR } from "@/lib/format";
import { sendTransactionNotification } from "@/lib/telegram";
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();

  const cats = useQuery({
    queryKey: ["expense_categories"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("expense_categories")
        .select("id, name")
        .order("name", { ascending: true });
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const history = useQuery({
    queryKey: ["expenses_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("id, occurred_at, category, amount, note, voided_at, void_reason")
        .order("occurred_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const categoryOptions = (cats.data ?? []).map((c) => ({ value: c.name, label: c.name }));

  return (
    <AppShell title="Pengeluaran">
      <PageHeader title="Pengeluaran Operasional" description="Biaya listrik, bensin, dll → kas berkurang" />
      <TxForm
        key={categoryOptions.length}
        title="Catat Pengeluaran"
        fields={[
          { name: "category", label: "Kategori", type: "select", options: categoryOptions },
          { name: "amount", label: "Nominal", type: "number" },
          { name: "note", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          if (!v.category) throw new Error("Pilih kategori terlebih dahulu");
          const { error } = await supabase.rpc("record_expense", {
            p_category: v.category, p_amount: Number(v.amount), p_note: v.note || null,
          });
          if (error) throw error;
          sendTransactionNotification(
            "expense",
            { category: v.category, amount: fmtIDR(v.amount), note: v.note || "" },
            `🧾 <b>Pengeluaran</b>\n${v.category}: ${fmtIDR(v.amount)}`,
          );
          qc.invalidateQueries();
        }}
      />
      <Card className="mt-6">
        <CardContent className="pt-6 overflow-auto">
          <h3 className="font-semibold mb-3">Riwayat Pengeluaran</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Waktu</TableHead><TableHead>Kategori</TableHead><TableHead className="text-right">Nominal</TableHead><TableHead>Catatan</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                  <TableCell>{r.category}</TableCell>
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
