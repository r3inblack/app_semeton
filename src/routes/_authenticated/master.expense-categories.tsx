import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";

export const Route = createFileRoute("/_authenticated/master/expense-categories")({
  component: () => (
    <AppShell title="Master — Kategori Pengeluaran">
      <PageHeader title="Kategori Pengeluaran" description="Daftar kategori untuk pencatatan pengeluaran operasional" />
      <CrudTable
        table="expense_categories"
        title="Kategori Pengeluaran"
        fields={[
          { name: "name", label: "Nama Kategori" },
          { name: "description", label: "Keterangan" },
        ]}
      />
    </AppShell>
  ),
});
