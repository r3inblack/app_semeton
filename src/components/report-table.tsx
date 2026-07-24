import { useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VoidButton, type VoidableTable } from "@/components/void-button";

export function ReportTable<T>({
  queryKey, table, select, orderCol = "occurred_at", dateCol = "occurred_at",
  columns, voidTable,
}: {
  queryKey: string;
  table: string;
  select: string;
  orderCol?: string;
  dateCol?: string;
  columns: { header: string; align?: "left" | "right"; cell: (row: T) => ReactNode }[];
  voidTable?: VoidableTable;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const finalSelect = voidTable ? `${select}, id, voided_at, void_reason` : select;
  const q = useQuery({
    queryKey: [queryKey, from, to],
    queryFn: async () => {
      let query: any = (supabase as any).from(table).select(finalSelect).order(orderCol, { ascending: false }).limit(500);
      if (from) query = query.gte(dateCol, from);
      if (to) query = query.lte(dateCol, `${to}T23:59:59`);
      const { data } = await query;
      return (data as any as T[]) ?? [];
    },
  });

  const colCount = columns.length + (voidTable ? 1 : 0);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1"><Label>Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label>Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader><TableRow>
              {columns.map((c, i) => <TableHead key={i} className={c.align === "right" ? "text-right" : ""}>{c.header}</TableHead>)}
              {voidTable && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).map((row: any, i) => (
                <TableRow key={i} className={row.voided_at ? "opacity-50" : ""}>
                  {columns.map((c, j) => <TableCell key={j} className={c.align === "right" ? "text-right" : ""}>{c.cell(row)}</TableCell>)}
                  {voidTable && (
                    <TableCell className="text-right">
                      <VoidButton table={voidTable} id={row.id} voidedAt={row.voided_at} voidReason={row.void_reason} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!q.data?.length && <TableRow><TableCell colSpan={colCount} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
