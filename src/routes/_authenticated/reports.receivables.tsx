import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReportTable } from "@/components/report-table";
import { fmtDate, fmtIDR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports/receivables")({
  component: () => (
    <AppShell title="Laporan Piutang & Setoran">
      <PageHeader title="Piutang & Setoran Pelanggan" />
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Penjualan (piutang bertambah)</h3>
          <ReportTable<any>
            queryKey="rep_sales"
            table="sales"
            voidTable="sales"
            select="occurred_at, qty, total, customers(name), products(name)"
            columns={[
              { header: "Waktu", cell: (r) => fmtDate(r.occurred_at) },
              { header: "Pelanggan", cell: (r) => r.customers?.name },
              { header: "Produk", cell: (r) => r.products?.name },
              { header: "Qty", align: "right", cell: (r) => r.qty },
              { header: "Total", align: "right", cell: (r) => fmtIDR(r.total) },
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Setoran (piutang berkurang)</h3>
          <ReportTable<any>
            queryKey="rep_pay"
            table="customer_payments"
            voidTable="customer_payments"
            select="occurred_at, amount, note, customers(name)"
            columns={[
              { header: "Waktu", cell: (r) => fmtDate(r.occurred_at) },
              { header: "Pelanggan", cell: (r) => r.customers?.name },
              { header: "Nominal", align: "right", cell: (r) => fmtIDR(r.amount) },
              { header: "Catatan", cell: (r) => r.note ?? "-" },
            ]}
          />
        </div>
      </div>
    </AppShell>
  ),
});
