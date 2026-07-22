import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettingsAdmin } from "@/hooks/use-app-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_COLOR: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  no_id: "bg-amber-100 text-amber-800",
  bad_format: "bg-amber-100 text-amber-800",
  bad_price: "bg-amber-100 text-amber-800",
  denied: "bg-red-100 text-red-800",
  unauthorized: "bg-red-100 text-red-800",
  rpc_error: "bg-red-100 text-red-800",
  skipped: "bg-slate-100 text-slate-700",
  ignored: "bg-slate-100 text-slate-700",
};

export function TelegramWebhookDiagnostics() {
  const { data: settings } = useAppSettingsAdmin();
  const botToken = (settings as any)?.telegram_bot_token as string | undefined;
  const [info, setInfo] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const logs = useQuery({
    queryKey: ["telegram_webhook_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_webhook_logs" as any)
        .select("*")
        .order("received_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 5000,
  });

  const check = async () => {
    if (!botToken) return toast.error("Bot Token belum diisi");
    setChecking(true);
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const j = await r.json();
      setInfo(j.result ?? j);
      if (j.ok) toast.success("Status webhook diperbarui");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold">Status Webhook Telegram</h3>
              <p className="text-sm text-muted-foreground">
                Cek apakah Telegram berhasil menghubungi aplikasi & lihat error terakhir dari Telegram.
              </p>
            </div>
            <Button onClick={check} disabled={!botToken || checking} size="sm">
              {checking ? "Mengecek..." : "Cek Status"}
            </Button>
          </div>
          {info && (
            <div className="text-sm grid gap-1 rounded-md border p-3 bg-muted/30">
              <div><b>URL:</b> <span className="font-mono break-all">{info.url || "-"}</span></div>
              <div><b>Pending updates:</b> {info.pending_update_count ?? 0}</div>
              <div><b>Last error:</b> {info.last_error_message || <span className="text-muted-foreground">tidak ada</span>}</div>
              {info.last_error_date && (
                <div><b>Last error at:</b> {new Date(info.last_error_date * 1000).toLocaleString("id-ID")}</div>
              )}
              <div><b>Allowed updates:</b> {(info.allowed_updates ?? []).join(", ") || "semua"}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold">Log Pesan Masuk (30 terbaru)</h3>
              <p className="text-sm text-muted-foreground">
                Auto-refresh tiap 5 detik. Jika status <b>no_id</b> muncul → pengirim belum mem-<i>reply</i> pesan pengajuan; jika <b>denied</b> → Chat ID pengirim belum dicentang <b>Boleh menentukan harga</b>; jika kosong sama sekali → Telegram belum menghubungi webhook (cek Status di atas).
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => logs.refetch()}>Refresh</Button>
          </div>
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2">Waktu</th>
                  <th className="text-left px-3 py-2">Pengirim</th>
                  <th className="text-left px-3 py-2">Pesan</th>
                  <th className="text-left px-3 py-2">Balas Pesan</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.received_at).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2">
                      <div>{r.from_name || "-"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.from_id || ""}</div>
                    </td>
                    <td className="px-3 py-2 max-w-[240px] whitespace-pre-wrap break-words">{r.text || "-"}</td>
                    <td className="px-3 py-2 max-w-[240px] whitespace-pre-wrap break-words text-muted-foreground">
                      {r.reply_to_text || <span className="italic">bukan reply</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={STATUS_COLOR[r.status] ?? "bg-slate-100 text-slate-700"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.detail || ""}</td>
                  </tr>
                ))}
                {(logs.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada pesan masuk</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
