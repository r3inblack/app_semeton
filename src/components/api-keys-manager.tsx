import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ALL_PERMS = [
  { id: "read", label: "Baca (lookup master & saldo)" },
  { id: "customer_payment", label: "Setoran Pelanggan" },
  { id: "supplier_payment", label: "Bayar Supplier" },
  { id: "expense", label: "Pengeluaran" },
  { id: "sale", label: "Penjualan" },
  { id: "stock_in", label: "Barang Masuk" },
  { id: "salary_payment", label: "Bayar Gaji" },
  { id: "salary_advance", label: "Kasbon" },
];

function randomKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sk_smt_${hex}`;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ApiKeysManager() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<string[]>(["read"]);
  const [showAll, setShowAll] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ["api_keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const logs = useQuery({
    queryKey: ["api_request_logs", showAll],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_request_logs" as any)
        .select("id, endpoint, method, status, ip, created_at")
        .order("created_at", { ascending: false })
        .limit(showAll ? 200 : 30);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 10000,
  });

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const host = window.location.host;
    const m = host.match(/^id-preview--([^.]+)\.(.+)$/);
    const stableHost = m ? `project--${m[1]}-dev.${m[2]}` : host;
    return `https://${stableHost}/api/public/v1`;
  }, []);

  const toggle = (p: string) =>
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const create = async () => {
    if (!name.trim()) return toast.error("Nama wajib diisi");
    if (perms.length === 0) return toast.error("Pilih minimal 1 izin");
    const key = randomKey();
    const key_hash = await sha256Hex(key);
    const { error } = await supabase.from("api_keys" as any).insert({
      name: name.trim(),
      key_prefix: key.slice(0, 12),
      key_hash,
      permissions: perms,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    setJustCreated(key);
    setName("");
    setPerms(["read"]);
    qc.invalidateQueries({ queryKey: ["api_keys"] });
    toast.success("API key dibuat. Salin sekarang — tidak akan ditampilkan lagi.");
  };

  const toggleActive = async (id: string, v: boolean) => {
    const { error } = await supabase.from("api_keys" as any).update({ is_active: v }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["api_keys"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Cabut API key ini? Aplikasi/integrasi yang memakainya akan langsung berhenti.")) return;
    const { error } = await supabase.from("api_keys" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["api_keys"] });
  };

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-3">
        <div>
          <h3 className="font-semibold">Base URL API</h3>
          <p className="text-sm text-muted-foreground">Gunakan URL ini dari n8n, Zapier, Make, script, dll.</p>
        </div>
        <Input value={baseUrl} readOnly className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">
          Autentikasi: header <code>X-API-Key: &lt;key&gt;</code> atau <code>Authorization: Bearer &lt;key&gt;</code>.
        </p>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-semibold">Buat API Key Baru</h3>
          <p className="text-sm text-muted-foreground">Key hanya ditampilkan sekali setelah dibuat.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-1">
            <Label>Nama / Keterangan</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="n8n Setoran Otomatis" />
          </div>
          <Button onClick={create}>Buat Key</Button>
        </div>
        <div>
          <Label className="mb-2 block">Izin</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_PERMS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={perms.includes(p.id)}
                  onChange={() => toggle(p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        {justCreated && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-900">Salin key ini sekarang — tidak akan ditampilkan lagi:</p>
            <div className="flex gap-2">
              <Input value={justCreated} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(justCreated); toast.success("Disalin"); }}
              >Salin</Button>
              <Button variant="ghost" onClick={() => setJustCreated(null)}>Tutup</Button>
            </div>
          </div>
        )}
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Daftar API Key</h3>
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">Nama</th>
                <th className="text-left px-3 py-2">Prefix</th>
                <th className="text-left px-3 py-2">Izin</th>
                <th className="text-left px-3 py-2">Terakhir dipakai</th>
                <th className="text-center px-3 py-2">Aktif</th>
                <th className="text-right px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(keys.data ?? []).map((k) => (
                <tr key={k.id} className="border-t">
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(k.permissions ?? []).map((p: string) => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString("id-ID") : "-"}</td>
                  <td className="px-3 py-2 text-center">
                    <Switch checked={k.is_active} onCheckedChange={(v) => toggleActive(k.id, v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="destructive" onClick={() => remove(k.id)}>Cabut</Button>
                  </td>
                </tr>
              ))}
              {(keys.data ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada API key.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Log Panggilan API (auto-refresh)</h3>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Tampilkan 200 terakhir
          </label>
        </div>
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">Waktu</th>
                <th className="text-left px-3 py-2">Method</th>
                <th className="text-left px-3 py-2">Endpoint</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {(logs.data ?? []).map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2 text-xs">{new Date(l.created_at).toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.endpoint}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={l.status < 300 ? "default" : "destructive"}>{l.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">{l.ip ?? "-"}</td>
                </tr>
              ))}
              {(logs.data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada log.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3 text-sm">
        <h3 className="font-semibold">Dokumentasi Singkat</h3>
        <p>Semua request pakai header:</p>
        <pre className="bg-muted rounded p-2 text-xs overflow-auto">X-API-Key: sk_smt_xxxxxxxx
Content-Type: application/json</pre>

        <div className="space-y-2">
          <b>GET /customers · /suppliers · /products · /warehouses · /employees · /balances · /logs</b>
          <p className="text-muted-foreground text-xs">Lookup master data & saldo. Butuh izin <code>read</code>.</p>
        </div>

        <div className="space-y-2">
          <b>POST /customer-payment</b> — setoran pelanggan
          <pre className="bg-muted rounded p-2 text-xs overflow-auto">{`{
  "customer": "Budi Santoso",   // uuid | nama | no. hp
  "amount": 500000,
  "note": "Setoran via BCA 21/07"
}`}</pre>
        </div>

        <div className="space-y-2">
          <b>POST /supplier-payment</b> — bayar supplier
          <pre className="bg-muted rounded p-2 text-xs overflow-auto">{`{ "supplier": "PT XYZ", "amount": 1000000, "note": "TF Mandiri" }`}</pre>
        </div>

        <div className="space-y-2">
          <b>POST /expense</b> — pengeluaran operasional
          <pre className="bg-muted rounded p-2 text-xs overflow-auto">{`{ "category": "BBM", "amount": 100000, "note": "" }`}</pre>
        </div>

        <div className="space-y-2">
          <b>POST /sale</b> — penjualan (kredit, otomatis kurangi stok & tambah piutang)
          <pre className="bg-muted rounded p-2 text-xs overflow-auto">{`{
  "customer": "Budi", "warehouse": "Gudang A", "product": "Beras 5kg",
  "qty": 10, "unit_price": 75000, "note": "PO #123"
}`}</pre>
        </div>

        <div className="space-y-2">
          <b>POST /stock-in</b> — barang masuk (langsung, tanpa alur pending)
          <pre className="bg-muted rounded p-2 text-xs overflow-auto">{`{
  "supplier": "PT XYZ", "warehouse": "Gudang A", "product": "Beras 5kg",
  "qty": 100, "unit_price": 65000
}`}</pre>
        </div>

        <div className="space-y-2">
          <b>POST /salary-payment · /salary-advance</b>
          <pre className="bg-muted rounded p-2 text-xs overflow-auto">{`{ "employee": "Andi", "amount": 500000, "note": "Kasbon Jumat" }`}</pre>
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          Semua transaksi POST akan otomatis memicu notifikasi Telegram (jika aktif) & masuk ke laporan seperti transaksi manual.
          Cocok dipakai dari n8n: kirim bukti TF ke bot Telegram → n8n / AI parse nominal & nama → POST ke endpoint di atas.
        </p>
      </CardContent></Card>
    </div>
  );
}
