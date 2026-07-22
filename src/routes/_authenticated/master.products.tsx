import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";
import { fmtIDR } from "@/lib/format";
import { useRole } from "@/hooks/use-role";

function ProductsPage() {
  const { role } = useRole();
  const isGudang = role === "staf_gudang";
  const fields = [
    { name: "name", label: "Nama" },
    { name: "sku", label: "SKU" },
    { name: "sell_price", label: "Harga Jual", type: "number" as const, render: (v: any) => fmtIDR(v) },
    ...(isGudang ? [] : [{ name: "buy_price", label: "Harga Beli", type: "number" as const, render: (v: any) => fmtIDR(v) }]),
  ];
  return (
    <AppShell title="Master — Produk">
      <PageHeader title="Data Produk" description={isGudang ? "Harga jual" : "Harga jual & harga beli"} />
      <CrudTable table="products" title="Produk" fields={fields} />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/master/products")({
  component: ProductsPage,
});
