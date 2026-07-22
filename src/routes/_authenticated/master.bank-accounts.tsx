import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";

export const Route = createFileRoute("/_authenticated/master/bank-accounts")({
  component: () => (
    <AppShell title="Master — Rekening Penerima">
      <PageHeader
        title="Rekening Penerima Setoran"
        description="Rekening yang muncul di portal setoran pelanggan."
      />
      <CrudTable
        table="bank_accounts"
        title="Rekening"
        fields={[
          { name: "bank_name", label: "Bank" },
          { name: "account_number", label: "Nomor Rekening" },
          { name: "account_holder", label: "Atas Nama" },
          { name: "active", label: "Aktif", type: "boolean" as any },
        ]}
      />
    </AppShell>
  ),
});
