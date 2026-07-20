import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReportTable } from "@/components/report-table";
import { fmtDate, fmtIDR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports/payables")({
  component: () => (
    <AppShell title="Laporan Hutang Supplier">
      <PageHeader title="Hutang Supplier" />
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Barang Masuk (hutang bertambah)</h3>
          <ReportTable<any>
            queryKey="rep_stockin"
            table="stock_in"
            select="occurred_at, qty, total, suppliers(name), products(name)"
            columns={[
              { header: "Waktu", cell: (r) => fmtDate(r.occurred_at) },
              { header: "Supplier", cell: (r) => r.suppliers?.name },
              { header: "Produk", cell: (r) => r.products?.name },
              { header: "Qty", align: "right", cell: (r) => r.qty },
              { header: "Total", align: "right", cell: (r) => fmtIDR(r.total) },
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Pembayaran Supplier</h3>
          <ReportTable<any>
            queryKey="rep_paysup"
            table="supplier_payments"
            select="occurred_at, amount, note, suppliers(name)"
            columns={[
              { header: "Waktu", cell: (r) => fmtDate(r.occurred_at) },
              { header: "Supplier", cell: (r) => r.suppliers?.name },
              { header: "Nominal", align: "right", cell: (r) => fmtIDR(r.amount) },
              { header: "Catatan", cell: (r) => r.note ?? "-" },
            ]}
          />
        </div>
      </div>
    </AppShell>
  ),
});
