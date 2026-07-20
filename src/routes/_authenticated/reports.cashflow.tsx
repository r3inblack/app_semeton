import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReportTable } from "@/components/report-table";
import { fmtDate, fmtIDR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports/cashflow")({
  component: () => (
    <AppShell title="Laporan Arus Kas">
      <PageHeader title="Arus Kas" />
      <ReportTable<any>
        queryKey="rep_cash"
        table="cash_movements"
        select="occurred_at, direction, amount, source, note"
        columns={[
          { header: "Waktu", cell: (r) => fmtDate(r.occurred_at) },
          { header: "Sumber", cell: (r) => r.source },
          { header: "Arah", cell: (r) => r.direction === "in" ? "Masuk" : "Keluar" },
          { header: "Nominal", align: "right", cell: (r) => <span className={r.direction === "in" ? "text-emerald-500" : "text-rose-500"}>{fmtIDR(r.amount)}</span> },
          { header: "Catatan", cell: (r) => r.note ?? "-" },
        ]}
      />
    </AppShell>
  ),
});
