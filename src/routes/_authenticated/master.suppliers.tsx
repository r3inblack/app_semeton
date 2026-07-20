import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";

export const Route = createFileRoute("/_authenticated/master/suppliers")({
  component: () => (
    <AppShell title="Master — Supplier">
      <PageHeader title="Data Supplier" />
      <CrudTable
        table="suppliers"
        title="Supplier"
        fields={[
          { name: "name", label: "Nama" },
          { name: "phone", label: "Telepon" },
          { name: "address", label: "Alamat" },
        ]}
      />
    </AppShell>
  ),
});
