import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtDate, fmtIDR } from "@/lib/format";
import { toast } from "sonner";
import {
  portalGetSummary,
  portalListBankAccounts,
  portalLookupCustomer,
  portalSubmitPayment,
  portalUploadProof,
} from "@/lib/portal.functions";
import { CheckCircle2, Clock, XCircle, Upload, LogOut } from "lucide-react";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal Setoran Pelanggan — Aplikasi Semeton" },
      { name: "description", content: "Kirim setoran cicilan Anda dengan cepat & aman." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

type Verified = { id: string; code: string; name: string };

function PortalPage() {
  const [code, setCode] = useState("");
  const [customer, setCustomer] = useState<Verified | null>(null);
  const [checking, setChecking] = useState(false);

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return toast.error("Masukkan Nomor ID Pelanggan");
    setChecking(true);
    try {
      const res = await portalLookupCustomer({ data: { code: c } });
      if (!res.ok) {
        toast.error(
          res.reason === "not_found"
            ? "Nomor ID tidak ditemukan. Cek kembali."
            : "Nomor ID tidak valid.",
        );
        return;
      }
      setCustomer({ id: res.customer.id, code: res.customer.code, name: res.customer.name });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.02_255)] via-background to-[oklch(0.94_0.04_255)] p-4">
      <div className="mx-auto max-w-2xl py-8 space-y-6">
        <div className="text-center">
          <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.48_0.20_258)] text-primary-foreground font-bold text-xl shadow-lg shadow-primary/30 mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Portal Setoran Pelanggan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kirim bukti setoran cicilan Anda dengan mudah
          </p>
        </div>

        {!customer ? (
          <Card className="border-border/60 shadow-xl shadow-primary/5">
            <CardHeader>
              <CardTitle>Verifikasi Nomor ID Pelanggan</CardTitle>
              <CardDescription>
                Contoh: <code className="rounded bg-muted px-1.5 py-0.5">S0001</code>.
                Hubungi admin jika lupa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={verify} className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Nomor ID"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="uppercase"
                />
                <Button type="submit" disabled={checking}>
                  {checking ? "Memeriksa…" : "Lanjut"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <CustomerPortal
            customer={customer}
            onExit={() => {
              setCustomer(null);
              setCode("");
            }}
          />
        )}
      </div>
    </div>
  );
}

function CustomerPortal({ customer, onExit }: { customer: Verified; onExit: () => void }) {
  const qc = useQueryClient();
  const summary = useQuery({
    queryKey: ["portal_summary", customer.code],
    queryFn: () => portalGetSummary({ data: { code: customer.code } }),
    refetchInterval: 8000,
  });
  const banks = useQuery({
    queryKey: ["portal_banks"],
    queryFn: () => portalListBankAccounts(),
  });

  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitter, setSubmitter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Nominal wajib diisi");
      let proofPath: string | null = null;
      if (file) {
        setUploading(true);
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const s = String(reader.result || "");
            const idx = s.indexOf(",");
            resolve(idx >= 0 ? s.slice(idx + 1) : s);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const up = await portalUploadProof({
          data: {
            code: customer.code,
            filename: file.name,
            content_type: file.type || null,
            data_base64: b64,
          },
        });
        setUploading(false);
        if (!up.ok) throw new Error("reason" in up ? String(up.reason) : "upload gagal");
        proofPath = up.path;
      }
      const res = await portalSubmitPayment({
        data: {
          code: customer.code,
          amount: amt,
          bank_account_id: bankId || null,
          proof_path: proofPath,
          note: note || null,
          submitter_name: submitter || null,
        },
      });
      if (!res.ok) throw new Error("reason" in res ? String(res.reason) : "Gagal");
      return res;
    },
    onSuccess: () => {
      toast.success("Setoran berhasil dikirim! Menunggu verifikasi owner.");
      setAmount("");
      setNote("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["portal_summary", customer.code] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mengirim setoran"),
  });

  const receivable = summary.data?.receivable ?? 0;

  return (
    <div className="space-y-5">
      <Card className="border-border/60 shadow-xl shadow-primary/5">
        <CardContent className="pt-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {customer.code}
            </div>
            <div className="text-lg font-semibold">{customer.name}</div>
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Sisa Hutang: </span>
              <span className="font-semibold text-destructive">{fmtIDR(receivable)}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onExit}>
            <LogOut className="h-4 w-4 mr-1" /> Keluar
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Kirim Setoran</CardTitle>
          <CardDescription>
            Isi nominal, pilih rekening tujuan, dan unggah bukti transfer.
            Setoran akan tercatat setelah diverifikasi owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nominal Setoran</Label>
              <NumberInput
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label>Rekening Tujuan</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening" />
                </SelectTrigger>
                <SelectContent>
                  {(banks.data ?? []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bank_name} — {b.account_number} ({b.account_holder})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nama Pengirim (opsional)</Label>
            <Input value={submitter} onChange={(e) => setSubmitter(e.target.value)} placeholder="Nama pengirim jika berbeda" />
          </div>
          <div className="space-y-1">
            <Label>Bukti Transfer</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <Badge variant="secondary" className="whitespace-nowrap">
                  <Upload className="h-3 w-3 mr-1" /> {file.name.slice(0, 22)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Foto/screenshot bukti TF (opsional tapi disarankan).</p>
          </div>
          <div className="space-y-1">
            <Label>Catatan (opsional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button
            className="w-full"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || uploading}
          >
            {uploading ? "Mengunggah bukti…" : submit.isPending ? "Mengirim…" : "Kirim Setoran"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Riwayat Setoran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(summary.data?.pending ?? []).length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Pengajuan Terbaru
              </div>
              <div className="space-y-2">
                {summary.data!.pending.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{fmtIDR(p.amount)}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</div>
                    </div>
                    <PendingBadge status={p.status} reason={p.reject_reason} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Setoran Tercatat
            </div>
            {(summary.data?.history ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada setoran tercatat.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.data!.history.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtIDR(r.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.note ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingBadge({ status, reason }: { status: string; reason?: string | null }) {
  if (status === "approved")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Disetujui
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200" title={reason ?? undefined}>
        <XCircle className="h-3 w-3 mr-1" /> Ditolak
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
      <Clock className="h-3 w-3 mr-1" /> Menunggu
    </Badge>
  );
}
