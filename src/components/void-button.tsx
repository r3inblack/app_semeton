import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type VoidableTable =
  | "sales"
  | "stock_in"
  | "stock_mutations"
  | "customer_payments"
  | "supplier_payments"
  | "expenses"
  | "salary_accruals"
  | "salary_advances"
  | "salary_payments"
  | "employee_bonuses"
  | "supplier_returns";

export function VoidButton({
  table,
  id,
  voidedAt,
  voidReason,
}: {
  table: VoidableTable;
  id: string;
  voidedAt?: string | null;
  voidReason?: string | null;
}) {
  const { isSuperAdmin } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (voidedAt) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
        title={voidReason ?? ""}
      >
        Dibatalkan
      </span>
    );
  }
  if (!isSuperAdmin) return null;

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Alasan wajib diisi");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("void_transaction" as any, {
      p_table: table,
      p_id: id,
      p_reason: reason.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Transaksi dibatalkan");
    setOpen(false);
    setReason("");
    qc.invalidateQueries();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        onClick={() => setOpen(true)}
      >
        Batalkan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Saldo kas, stok, piutang/hutang, dan gaji akan dikembalikan otomatis. Tindakan ini akan tercatat sebagai audit.
            </p>
            <Label>Alasan pembatalan</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: salah nominal, salah pelanggan, dst." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button>
            <Button onClick={submit} disabled={loading} className="bg-rose-600 hover:bg-rose-700">
              {loading ? "Memproses..." : "Ya, Batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
