import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";

export const Route = createFileRoute("/_authenticated/master/warehouses")({
  component: () => (
    <AppShell title="Master — Gudang">
      <PageHeader title="Data Gudang" />
      <CrudTable
        table="warehouses"
        title="Gudang"
        fields={[
          { name: "name", label: "Nama Gudang" },
          { name: "address", label: "Alamat" },
        ]}
      />
    </AppShell>
  ),
});
