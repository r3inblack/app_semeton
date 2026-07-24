import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReportTable } from "@/components/report-table";
import { fmtDate, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports/mutations")({
  component: () => (
    <AppShell title="Laporan Mutasi Barang">
      <PageHeader title="Mutasi Barang" />
      <ReportTable<any>
        queryKey="rep_mut"
        table="stock_mutations"
        voidTable="stock_mutations"
        select="occurred_at, qty, note, from_warehouse:warehouses!stock_mutations_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_mutations_to_warehouse_id_fkey(name), products(name)"
        columns={[
          { header: "Waktu", cell: (r) => fmtDate(r.occurred_at) },
          { header: "Dari", cell: (r) => r.from_warehouse?.name },
          { header: "Ke", cell: (r) => r.to_warehouse?.name },
          { header: "Produk", cell: (r) => r.products?.name },
          { header: "Qty", align: "right", cell: (r) => fmtNum(r.qty) },
          { header: "Catatan", cell: (r) => r.note ?? "-" },
        ]}
      />
    </AppShell>
  ),
});
