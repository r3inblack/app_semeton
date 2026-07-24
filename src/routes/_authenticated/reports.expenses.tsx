import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fmtDate, fmtIDR } from "@/lib/format";
import { VoidButton } from "@/components/void-button";

export const Route = createFileRoute("/_authenticated/reports/expenses")({
  component: ExpensesReportPage,
});

type ExpenseRow = {
  occurred_at: string;
  category: string;
  amount: number;
  note: string | null;
};

function ExpensesReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");

  const cats = useQuery({
    queryKey: ["rep_exp_cats"],
    queryFn: async () => {
      const [masterRes, usedRes] = await Promise.all([
        (supabase as any).from("expense_categories").select("name"),
        (supabase as any).from("expenses").select("category").limit(1000),
      ]);
      const set = new Set<string>();
      for (const r of (masterRes.data ?? []) as { name: string }[]) {
        if (r.name) set.add(r.name);
      }
      for (const r of (usedRes.data ?? []) as { category: string }[]) {
        if (r.category) set.add(r.category);
      }
      return Array.from(set).sort();
    },
  });

  const q = useQuery({
    queryKey: ["rep_expenses", from, to, category],
    queryFn: async () => {
      let query: any = (supabase as any)
        .from("expenses")
        .select("occurred_at, category, amount, note")
        .order("occurred_at", { ascending: false })
        .limit(1000);
      if (from) query = query.gte("occurred_at", from);
      if (to) query = query.lte("occurred_at", `${to}T23:59:59`);
      if (category) query = query.eq("category", category);
      const { data } = await query;
      return (data as ExpenseRow[]) ?? [];
    },
  });

  const total = useMemo(
    () => (q.data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0),
    [q.data],
  );

  return (
    <AppShell title="Laporan Pengeluaran">
      <PageHeader title="Laporan Pengeluaran" description="Filter berdasarkan kategori dan rentang tanggal" />
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label>Dari</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Sampai</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <select
                className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">— semua kategori —</option>
                {(cats.data ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-muted-foreground">Total Pengeluaran</div>
              <div className="text-lg font-semibold text-rose-600">{fmtIDR(total)}</div>
            </div>
          </div>

          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(q.data ?? []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.note ?? "-"}</TableCell>
                    <TableCell className="text-right text-rose-600">{fmtIDR(r.amount)}</TableCell>
                  </TableRow>
                ))}
                {!q.data?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {q.isLoading ? "Memuat..." : "Tidak ada data"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
