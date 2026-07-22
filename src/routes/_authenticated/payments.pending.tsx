import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtIDR } from "@/lib/format";
import { toast } from "sonner";
import { useRole } from "@/hooks/use-role";
import { sendTransactionNotification } from "@/lib/telegram";

export const Route = createFileRoute("/_authenticated/payments/pending")({
  component: PendingCustomerPayments,
});

function PendingCustomerPayments() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useRole();
  const [busy, setBusy] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["pending_customer_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_customer_payments" as any)
        .select(
          "id, amount, note, proof_path, submitter_name, status, created_at, reject_reason, customers(name, code), bank_accounts(bank_name, account_number, account_holder)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const viewProof = async (id: string, path: string) => {
    if (proofUrls[id]) {
      window.open(proofUrls[id], "_blank");
      return;
    }
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return toast.error("Gagal membuka bukti");
    setProofUrls((s) => ({ ...s, [id]: data.signedUrl }));
    window.open(data.signedUrl, "_blank");
  };

  const approve = async (r: any) => {
    setBusy(r.id);
    const { error } = await supabase.rpc("approve_pending_customer_payment", { p_id: r.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Setoran disetujui & tercatat");
    sendTransactionNotification(
      "customer_payment",
      {
        customer: r.customers?.name ?? "-",
        amount: fmtIDR(r.amount),
        note: `Setoran mandiri via portal${r.submitter_name ? ` (${r.submitter_name})` : ""}`,
      },
      `💰 <b>Setoran Pelanggan (Portal)</b>\n${r.customers?.name ?? ""} (${r.customers?.code ?? ""}): ${fmtIDR(r.amount)}`,
    );
    qc.invalidateQueries();
  };

  const reject = async (id: string) => {
    const reason = prompt("Alasan penolakan (opsional):") ?? "";
    setBusy(id);
    const { error } = await supabase.rpc("reject_pending_customer_payment", {
      p_id: id,
      p_reason: reason,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Setoran ditolak");
    qc.invalidateQueries();
  };

  return (
    <AppShell title="Persetujuan Setoran">
      <PageHeader
        title="Persetujuan Setoran Mandiri"
        description="Pengajuan setoran dari portal pelanggan. Setujui untuk mencatat sebagai setoran & mengurangi piutang."
      />
      <Card>
        <CardContent className="pt-6 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Rekening Tujuan</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.created_at)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.customers?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.customers?.code}
                      {r.submitter_name ? ` • ${r.submitter_name}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtIDR(r.amount)}</TableCell>
                  <TableCell className="text-xs">
                    {r.bank_accounts ? (
                      <>
                        <div>{r.bank_accounts.bank_name} — {r.bank_accounts.account_number}</div>
                        <div className="text-muted-foreground">a.n. {r.bank_accounts.account_holder}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.proof_path ? (
                      <Button size="sm" variant="outline" onClick={() => viewProof(r.id, r.proof_path)}>
                        Lihat
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.status === "approved" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Disetujui</Badge>
                    ) : r.status === "rejected" ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200" title={r.reject_reason ?? ""}>Ditolak</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">Menunggu</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {r.status === "pending" && isSuperAdmin ? (
                      <>
                        <Button size="sm" onClick={() => approve(r)} disabled={busy === r.id}>
                          Setujui
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => reject(r.id)} disabled={busy === r.id}>
                          Tolak
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {r.status === "pending" ? "menunggu admin" : "-"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!q.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Belum ada pengajuan setoran
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
