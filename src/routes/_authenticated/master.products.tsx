import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";
import { fmtIDR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/master/products")({
  component: () => (
    <AppShell title="Master — Produk">
      <PageHeader title="Data Produk" description="Harga jual, harga beli & komisi per unit" />
      <CrudTable
        table="products"
        title="Produk"
        fields={[
          { name: "name", label: "Nama" },
          { name: "sku", label: "SKU" },
          { name: "sell_price", label: "Harga Jual", type: "number", render: (v) => fmtIDR(v) },
          { name: "buy_price", label: "Harga Beli", type: "number", render: (v) => fmtIDR(v) },
          { name: "commission_per_unit", label: "Komisi/unit", type: "number", render: (v) => fmtIDR(v) },
        ]}
      />
    </AppShell>
  ),
});
