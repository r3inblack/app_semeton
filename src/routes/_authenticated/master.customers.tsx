import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";

export const Route = createFileRoute("/_authenticated/master/customers")({
  component: () => (
    <AppShell title="Master — Pelanggan">
      <PageHeader title="Data Pelanggan" />
      <CrudTable
        table="customers"
        title="Pelanggan"
        fields={[
          { name: "code", label: "Nomor ID", hideInTable: false, render: (v) => v ?? "-", disabledWhen: () => true },
          { name: "name", label: "Nama" },
          { name: "phone", label: "Telepon" },
          { name: "address", label: "Alamat" },
        ]}
      />
    </AppShell>
  ),
});
