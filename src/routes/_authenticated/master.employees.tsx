import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CrudTable } from "@/components/crud-table";
import { useList } from "@/lib/list-hooks";

export const Route = createFileRoute("/_authenticated/master/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const warehouses = useList<{ id: string; name: string }>("warehouses");
  return (
    <AppShell title="Master — Karyawan">
      <PageHeader title="Data Karyawan" description="Kategori: Gudang & Kurir" />
      <CrudTable
        table="employees"
        title="Karyawan"
        fields={[
          { name: "name", label: "Nama" },
          { name: "phone", label: "Telepon" },
          {
            name: "category",
            label: "Kategori",
            type: "select",
            options: [
              { value: "gudang", label: "Staf Gudang" },
              { value: "kurir", label: "Kurir" },
              { value: "kasir", label: "Kasir" },
              { value: "staff_keuangan", label: "Staff Keuangan" },
              { value: "manager", label: "Manager/Owner" },
            ],
          },
          {
            name: "warehouse_id",
            label: "Gudang",
            type: "select",
            options: (warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name })),
            render: (v) => warehouses.data?.find((w) => w.id === v)?.name ?? "-",
            disabledWhen: (f) => f.category !== "gudang",
          },
        ]}
      />
    </AppShell>
  );
}
