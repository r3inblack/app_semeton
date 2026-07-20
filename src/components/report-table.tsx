import { useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ReportTable<T>({
  queryKey, table, select, orderCol = "occurred_at", dateCol = "occurred_at",
  columns,
}: {
  queryKey: string;
  table: string;
  select: string;
  orderCol?: string;
  dateCol?: string;
  columns: { header: string; align?: "left" | "right"; cell: (row: T) => ReactNode }[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useQuery({
    queryKey: [queryKey, from, to],
    queryFn: async () => {
      let query: any = (supabase as any).from(table).select(select).order(orderCol, { ascending: false }).limit(500);
      if (from) query = query.gte(dateCol, from);
      if (to) query = query.lte(dateCol, `${to}T23:59:59`);
      const { data } = await query;
      return (data as any as T[]) ?? [];
    },
  });

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
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c, j) => <TableCell key={j} className={c.align === "right" ? "text-right" : ""}>{c.cell(row)}</TableCell>)}
                </TableRow>
              ))}
              {!q.data?.length && <TableRow><TableCell colSpan={columns.length} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
