import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { useAppSettings, useAppSettingsAdmin } from "@/hooks/use-app-settings";
import { useList } from "@/lib/list-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { UsersManager } from "@/components/users-manager";
import { useRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { isSuperAdmin, can } = useRole();
  const canApp = isSuperAdmin || can("settings_app", "view");
  const canTelegram = isSuperAdmin || can("settings_telegram", "view");
  const canUsers = isSuperAdmin || can("users", "manage");
  const canInitial = isSuperAdmin;
  const canDanger = isSuperAdmin;

  const firstTab = canApp ? "general" : canTelegram ? "telegram" : canUsers ? "users" : "initial";

  return (
    <AppShell title="Pengaturan">
      <PageHeader title="Pengaturan Aplikasi" />
      <Tabs defaultValue={firstTab}>
        <TabsList className="mb-4 flex-wrap">
          {canApp && <TabsTrigger value="general">Nama Aplikasi</TabsTrigger>}
          {canTelegram && <TabsTrigger value="telegram">Notifikasi Telegram</TabsTrigger>}
          {canUsers && <TabsTrigger value="users">Pengguna & Hak Akses</TabsTrigger>}
          {canInitial && <TabsTrigger value="initial">Setup Data Awal</TabsTrigger>}
          {canDanger && <TabsTrigger value="danger">Danger Zone</TabsTrigger>}
        </TabsList>
        {canApp && <TabsContent value="general"><GeneralTab /></TabsContent>}
        {canTelegram && <TabsContent value="telegram"><TelegramTab /></TabsContent>}
        {canUsers && <TabsContent value="users"><UsersManager /></TabsContent>}
        {canInitial && <TabsContent value="initial"><InitialTab /></TabsContent>}
        {canDanger && <TabsContent value="danger"><DangerTab /></TabsContent>}
      </Tabs>
    </AppShell>
  );
}

function GeneralTab() {
  const { data } = useAppSettings();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  useEffect(() => { if (data?.app_name) setName(data.app_name); }, [data?.app_name]);

  const save = async () => {
    const { error } = await supabase.from("app_settings").update({ app_name: name }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Nama aplikasi diperbarui");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  return (
    <Card><CardContent className="pt-6 space-y-4 max-w-md">
      <div className="space-y-1"><Label>Nama Aplikasi</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button onClick={save}>Simpan</Button>
    </CardContent></Card>
  );
}

function TelegramTab() {
  const { data } = useAppSettingsAdmin();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    telegram_enabled: false,
    telegram_bot_token: "",
    telegram_chat_id: "",
    telegram_group_bot_token: "",
    telegram_group_chat_id: "",
  });
  useEffect(() => {
    if (data) setForm({
      telegram_enabled: data.telegram_enabled ?? false,
      telegram_bot_token: data.telegram_bot_token ?? "",
      telegram_chat_id: data.telegram_chat_id ?? "",
      telegram_group_bot_token: (data as any).telegram_group_bot_token ?? "",
      telegram_group_chat_id: (data as any).telegram_group_chat_id ?? "",
    });
  }, [data]);

  const save = async () => {
    const { error } = await supabase.from("app_settings").update(form).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Notifikasi Telegram diperbarui");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  const test = async () => {
    try {
      const r = await fetch(`https://api.telegram.org/bot${form.telegram_bot_token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: form.telegram_chat_id, text: "✅ Test notifikasi Aplikasi Semeton" }),
      });
      const j = await r.json();
      if (j.ok) toast.success("Pesan terkirim");
      else toast.error(j.description || "Gagal");
    } catch (e: any) { toast.error(e.message); }
  };

  const testGroup = async () => {
    const token = form.telegram_group_bot_token || form.telegram_bot_token;
    if (!token || !form.telegram_group_chat_id) return toast.error("Bot Token & Chat ID grup wajib diisi");
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: form.telegram_group_chat_id, text: "✅ Test notifikasi transaksi grup" }),
      });
      const j = await r.json();
      if (j.ok) toast.success("Pesan terkirim ke grup");
      else toast.error(j.description || "Gagal");
    } catch (e: any) { toast.error(e.message); }
  };

  const webhookUrl = (() => {
    if (typeof window === "undefined") return "";
    const host = window.location.host;
    // Prefer stable public host for TanStack public routes.
    // id-preview--<uuid>.<domain>  -> project--<uuid>-dev.<domain>
    const m = host.match(/^id-preview--([^.]+)\.(.+)$/);
    const stableHost = m ? `project--${m[1]}-dev.${m[2]}` : host;
    return `https://${stableHost}/api/public/telegram/webhook`;
  })();

  const deriveSecretBrowser = async (token: string) => {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("tg-webhook:" + token),
    );
    // base64url
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const registerWebhook = async () => {
    if (!form.telegram_bot_token) return toast.error("Bot Token belum diisi");
    try {
      const secret = await deriveSecretBrowser(form.telegram_bot_token);
      const r = await fetch(`https://api.telegram.org/bot${form.telegram_bot_token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["message", "edited_message"],
        }),
      });
      const j = await r.json();
      if (j.ok) toast.success("Webhook terdaftar");
      else toast.error(j.description || "Gagal mendaftarkan webhook");
    } catch (e: any) { toast.error(e.message); }
  };

  const removeWebhook = async () => {
    if (!form.telegram_bot_token) return toast.error("Bot Token belum diisi");
    try {
      const r = await fetch(`https://api.telegram.org/bot${form.telegram_bot_token}/deleteWebhook`, {
        method: "POST",
      });
      const j = await r.json();
      if (j.ok) toast.success("Webhook dihapus");
      else toast.error(j.description || "Gagal");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4 max-w-lg">
        <div className="flex items-center gap-3">
          <Switch checked={form.telegram_enabled} onCheckedChange={(v) => setForm({ ...form, telegram_enabled: v })} />
          <Label>Aktifkan notifikasi Telegram</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Master switch untuk semua notifikasi Telegram (transaksi & pengajuan barang masuk).
        </p>
        <div className="flex">
          <Button onClick={save}>Simpan</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4 max-w-lg">
        <div>
          <h3 className="font-semibold">Notifikasi Transaksi (Grup)</h3>
          <p className="text-sm text-muted-foreground">
            Bot & chat_id grup Telegram tujuan notifikasi transaksi kas masuk/keluar
            (setoran pelanggan, bayar supplier, pengeluaran, dsb).
          </p>
        </div>
        <div className="space-y-1">
          <Label>Bot API Token (Grup)</Label>
          <Input
            value={form.telegram_group_bot_token}
            onChange={(e) => setForm({ ...form, telegram_group_bot_token: e.target.value })}
            placeholder="123456:ABCDEF..."
          />
          <p className="text-xs text-muted-foreground">
            Kosongkan untuk memakai Bot Token yang sama dengan menu pengajuan di bawah.
          </p>
        </div>
        <div className="space-y-1">
          <Label>Chat ID Grup</Label>
          <Input
            value={form.telegram_group_chat_id}
            onChange={(e) => setForm({ ...form, telegram_group_chat_id: e.target.value })}
            placeholder="-1001234567890"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save}>Simpan</Button>
          <Button
            variant="outline"
            onClick={testGroup}
            disabled={!form.telegram_group_chat_id || !(form.telegram_group_bot_token || form.telegram_bot_token)}
          >
            Kirim Test ke Grup
          </Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4 max-w-lg">
        <div>
          <h3 className="font-semibold">Notifikasi Pengajuan Barang Masuk & Harga</h3>
          <p className="text-sm text-muted-foreground">
            Bot khusus untuk pengajuan barang masuk oleh Staf Gudang. Owner yang berwenang
            akan menerima notifikasi & dapat menentukan harga beli/jual via balasan Telegram.
          </p>
        </div>
        <div className="space-y-1"><Label>Bot API Token</Label>
          <Input value={form.telegram_bot_token} onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })} placeholder="123456:ABCDEF..." />
        </div>
        <div className="space-y-1">
          <Label>Chat ID default (opsional)</Label>
          <Input value={form.telegram_chat_id} onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })} />
          <p className="text-xs text-muted-foreground">
            Kosongkan jika penerima notifikasi diatur pada daftar Owner di bawah.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save}>Simpan</Button>
          <Button variant="outline" onClick={test} disabled={!form.telegram_bot_token || !form.telegram_chat_id}>Kirim Test</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3 max-w-lg">
        <div>
          <h3 className="font-semibold">Webhook Balasan Harga</h3>
          <p className="text-sm text-muted-foreground">
            Daftarkan webhook agar owner yang memiliki izin dapat menentukan harga beli & jual pengajuan barang masuk langsung dari Telegram (reply pesan dengan format: <code>&lt;harga_beli&gt; &lt;harga_jual&gt;</code>).
          </p>
        </div>
        <div className="space-y-1">
          <Label>URL Webhook</Label>
          <Input value={webhookUrl} readOnly />
          <p className="text-xs text-muted-foreground">Aplikasi harus sudah dipublish agar URL ini bisa dijangkau Telegram.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={registerWebhook} disabled={!form.telegram_bot_token}>Daftarkan Webhook</Button>
          <Button variant="outline" onClick={removeWebhook} disabled={!form.telegram_bot_token}>Hapus Webhook</Button>
        </div>
      </CardContent></Card>

      <TelegramRecipientsCard botToken={form.telegram_bot_token} />
    </div>
  );
}

function TelegramRecipientsCard({ botToken }: { botToken: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["telegram_recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_recipients" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const [newRow, setNewRow] = useState({ label: "", chat_id: "", can_price: false });

  const add = async () => {
    if (!newRow.label.trim() || !newRow.chat_id.trim()) {
      return toast.error("Nama dan Chat ID wajib diisi");
    }
    const { error } = await supabase.from("telegram_recipients" as any).insert({
      label: newRow.label.trim(),
      chat_id: newRow.chat_id.trim(),
      can_price: newRow.can_price,
      notify_enabled: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Owner ditambahkan");
    setNewRow({ label: "", chat_id: "", can_price: false });
    qc.invalidateQueries({ queryKey: ["telegram_recipients"] });
  };

  const update = async (id: string, patch: Record<string, any>) => {
    const { error } = await supabase.from("telegram_recipients" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["telegram_recipients"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("telegram_recipients" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Owner dihapus");
    qc.invalidateQueries({ queryKey: ["telegram_recipients"] });
  };

  const testOne = async (chat_id: string) => {
    if (!botToken) return toast.error("Bot Token belum diisi");
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text: "✅ Test notifikasi Aplikasi Semeton" }),
      });
      const j = await r.json();
      if (j.ok) toast.success("Pesan terkirim");
      else toast.error(j.description || "Gagal");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div>
        <h3 className="font-semibold">Daftar Owner Penerima Notifikasi</h3>
        <p className="text-sm text-muted-foreground">
          Semua nomor aktif akan menerima notifikasi transaksi. Centang <b>Boleh menentukan harga</b> untuk nomor yang berwenang menentukan harga beli & jual pada persetujuan barang masuk.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
        <div className="space-y-1">
          <Label>Nama / Label</Label>
          <Input value={newRow.label} onChange={(e) => setNewRow({ ...newRow, label: e.target.value })} placeholder="Owner 1" />
        </div>
        <div className="space-y-1">
          <Label>Chat ID Telegram</Label>
          <Input value={newRow.chat_id} onChange={(e) => setNewRow({ ...newRow, chat_id: e.target.value })} placeholder="123456789" />
        </div>
        <label className="flex items-center gap-2 text-sm h-9">
          <input
            type="checkbox"
            checked={newRow.can_price}
            onChange={(e) => setNewRow({ ...newRow, can_price: e.target.checked })}
          />
          Boleh menentukan harga
        </label>
        <Button onClick={add}>Tambah</Button>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">Nama</th>
              <th className="text-left px-3 py-2">Chat ID</th>
              <th className="text-center px-3 py-2">Notifikasi</th>
              <th className="text-center px-3 py-2">Boleh menentukan harga</th>
              <th className="text-right px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2 font-mono">{r.chat_id}</td>
                <td className="px-3 py-2 text-center">
                  <Switch
                    checked={!!r.notify_enabled}
                    onCheckedChange={(v) => update(r.id, { notify_enabled: v })}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!r.can_price}
                    onChange={(e) => update(r.id, { can_price: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => testOne(r.chat_id)}>Test</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Hapus</Button>
                </td>
              </tr>
            ))}
            {(q.data ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada owner</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
  );
}


function InitialTab() {
  const qc = useQueryClient();
  const customers = useList<any>("customers");
  const suppliers = useList<any>("suppliers");
  const employees = useList<any>("employees");
  const products = useList<any>("products");
  const warehouses = useList<any>("warehouses");

  const [cash, setCash] = useState("");
  const [stock, setStock] = useState({ product_id: "", warehouse_id: "", qty: "" });
  const [rec, setRec] = useState({ customer_id: "", amount: "" });
  const [pay, setPay] = useState({ supplier_id: "", amount: "" });
  const [sal, setSal] = useState({ employee_id: "", amount: "" });

  const call = async (fn: string, args: Record<string, any>, msg: string, onSuccess?: () => void) => {
    const { error } = await supabase.rpc(fn as any, args);
    if (error) return toast.error(error.message);
    toast.success(msg);
    onSuccess?.();
    qc.invalidateQueries();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Saldo Awal Kas</h3>
        <NumberInput placeholder="Nominal" value={cash} onChange={(e) => setCash(e.target.value)} />
        <Button onClick={() => call("set_initial_cash", { p_amount: Number(cash) }, "Saldo kas awal disimpan", () => setCash(""))}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Stok Awal Gudang</h3>
        <Select value={stock.product_id} onChange={(v) => setStock({ ...stock, product_id: v })} label="Produk" options={products.data?.map((p: any) => ({ value: p.id, label: p.name })) ?? []} />
        <Select value={stock.warehouse_id} onChange={(v) => setStock({ ...stock, warehouse_id: v })} label="Gudang" options={warehouses.data?.map((w: any) => ({ value: w.id, label: w.name })) ?? []} />
        <NumberInput placeholder="Qty" value={stock.qty} onChange={(e) => setStock({ ...stock, qty: e.target.value })} />
        <Button onClick={() => call("set_initial_stock", { p_product_id: stock.product_id, p_warehouse_id: stock.warehouse_id, p_qty: Number(stock.qty) }, "Stok awal disimpan", () => setStock({ product_id: "", warehouse_id: "", qty: "" }))}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Piutang Awal Pelanggan</h3>
        <Select value={rec.customer_id} onChange={(v) => setRec({ ...rec, customer_id: v })} label="Pelanggan" options={customers.data?.map((c: any) => ({ value: c.id, label: c.name })) ?? []} />
        <NumberInput placeholder="Nominal" value={rec.amount} onChange={(e) => setRec({ ...rec, amount: e.target.value })} />
        <Button onClick={() => call("set_initial_receivable", { p_customer_id: rec.customer_id, p_amount: Number(rec.amount) }, "Piutang awal disimpan", () => setRec({ customer_id: "", amount: "" }))}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Hutang Awal Supplier</h3>
        <Select value={pay.supplier_id} onChange={(v) => setPay({ ...pay, supplier_id: v })} label="Supplier" options={suppliers.data?.map((s: any) => ({ value: s.id, label: s.name })) ?? []} />
        <NumberInput placeholder="Nominal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
        <Button onClick={() => call("set_initial_payable", { p_supplier_id: pay.supplier_id, p_amount: Number(pay.amount) }, "Hutang awal disimpan", () => setPay({ supplier_id: "", amount: "" }))}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Sisa Gaji Awal Karyawan</h3>
        <Select value={sal.employee_id} onChange={(v) => setSal({ ...sal, employee_id: v })} label="Karyawan" options={employees.data?.map((e: any) => ({ value: e.id, label: e.name })) ?? []} />
        <NumberInput placeholder="Nominal" value={sal.amount} onChange={(e) => setSal({ ...sal, amount: e.target.value })} />
        <Button onClick={() => call("set_initial_salary", { p_employee_id: sal.employee_id, p_amount: Number(sal.amount) }, "Sisa gaji awal disimpan", () => setSal({ employee_id: "", amount: "" }))}>Simpan</Button>
      </CardContent></Card>
    </div>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— pilih —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function DangerTab() {
  const qc = useQueryClient();
  const reset = async () => {
    const { error } = await supabase.rpc("reset_transactions");
    if (error) return toast.error(error.message);
    toast.success("Semua data transaksi direset");
    qc.invalidateQueries();
  };
  return (
    <Card className="border-destructive"><CardContent className="pt-6 space-y-4 max-w-lg">
      <h3 className="font-semibold text-destructive">Reset Database Transaksi</h3>
      <p className="text-sm text-muted-foreground">
        Menghapus semua riwayat transaksi (penjualan, stok masuk, mutasi, setoran, pembayaran, pengeluaran, gaji, kasbon, bonus)
        beserta saldo terkait. Master data (user, produk, pelanggan, supplier, karyawan, gudang) tetap ada.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Reset Sekarang</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin ingin reset?</AlertDialogTitle>
            <AlertDialogDescription>
              Aksi ini tidak dapat dibatalkan. Semua data transaksi akan hilang permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={reset} className="bg-destructive text-destructive-foreground">Ya, Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardContent></Card>
  );
}
