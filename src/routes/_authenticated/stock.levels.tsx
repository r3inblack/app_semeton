import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/stock/levels")({
  component: StockLevels,
});

function StockLevels() {
  const q = useQuery({
    queryKey: ["stock_levels_all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_levels")
        .select("qty, products(name), warehouses(name)")
        .order("qty", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title="Stok Gudang">
      <PageHeader title="Sisa Stok per Gudang" />
      <Card>
        <CardContent className="pt-6 overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Produk</TableHead><TableHead>Gudang</TableHead><TableHead className="text-right">Qty</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell>{r.products?.name ?? "-"}</TableCell>
                  <TableCell>{r.warehouses?.name ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{fmtNum(r.qty)}</TableCell>
                </TableRow>
              ))}
              {!q.data?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada stok</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
