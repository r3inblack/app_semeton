import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const [form, setForm] = useState({ telegram_enabled: false, telegram_bot_token: "", telegram_chat_id: "" });
  useEffect(() => {
    if (data) setForm({
      telegram_enabled: data.telegram_enabled ?? false,
      telegram_bot_token: data.telegram_bot_token ?? "",
      telegram_chat_id: data.telegram_chat_id ?? "",
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

  return (
    <Card><CardContent className="pt-6 space-y-4 max-w-lg">
      <div className="flex items-center gap-3">
        <Switch checked={form.telegram_enabled} onCheckedChange={(v) => setForm({ ...form, telegram_enabled: v })} />
        <Label>Aktifkan notifikasi Telegram</Label>
      </div>
      <div className="space-y-1"><Label>Bot API Token</Label>
        <Input value={form.telegram_bot_token} onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })} placeholder="123456:ABCDEF..." />
      </div>
      <div className="space-y-1"><Label>Chat ID</Label>
        <Input value={form.telegram_chat_id} onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <Button onClick={save}>Simpan</Button>
        <Button variant="outline" onClick={test} disabled={!form.telegram_bot_token || !form.telegram_chat_id}>Kirim Test</Button>
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

  const call = async (fn: string, args: Record<string, any>, msg: string) => {
    const { error } = await supabase.rpc(fn as any, args);
    if (error) return toast.error(error.message);
    toast.success(msg);
    qc.invalidateQueries();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Saldo Awal Kas</h3>
        <NumberInput placeholder="Nominal" value={cash} onChange={(e) => setCash(e.target.value)} />
        <Button onClick={() => call("set_initial_cash", { p_amount: Number(cash) }, "Saldo kas awal disimpan")}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Stok Awal Gudang</h3>
        <Select value={stock.product_id} onChange={(v) => setStock({ ...stock, product_id: v })} label="Produk" options={products.data?.map((p: any) => ({ value: p.id, label: p.name })) ?? []} />
        <Select value={stock.warehouse_id} onChange={(v) => setStock({ ...stock, warehouse_id: v })} label="Gudang" options={warehouses.data?.map((w: any) => ({ value: w.id, label: w.name })) ?? []} />
        <NumberInput placeholder="Qty" value={stock.qty} onChange={(e) => setStock({ ...stock, qty: e.target.value })} />
        <Button onClick={() => call("set_initial_stock", { p_product_id: stock.product_id, p_warehouse_id: stock.warehouse_id, p_qty: Number(stock.qty) }, "Stok awal disimpan")}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Piutang Awal Pelanggan</h3>
        <Select value={rec.customer_id} onChange={(v) => setRec({ ...rec, customer_id: v })} label="Pelanggan" options={customers.data?.map((c: any) => ({ value: c.id, label: c.name })) ?? []} />
        <NumberInput placeholder="Nominal" value={rec.amount} onChange={(e) => setRec({ ...rec, amount: e.target.value })} />
        <Button onClick={() => call("set_initial_receivable", { p_customer_id: rec.customer_id, p_amount: Number(rec.amount) }, "Piutang awal disimpan")}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Hutang Awal Supplier</h3>
        <Select value={pay.supplier_id} onChange={(v) => setPay({ ...pay, supplier_id: v })} label="Supplier" options={suppliers.data?.map((s: any) => ({ value: s.id, label: s.name })) ?? []} />
        <Input type="number" placeholder="Nominal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
        <Button onClick={() => call("set_initial_payable", { p_supplier_id: pay.supplier_id, p_amount: Number(pay.amount) }, "Hutang awal disimpan")}>Simpan</Button>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold">Sisa Gaji Awal Karyawan</h3>
        <Select value={sal.employee_id} onChange={(v) => setSal({ ...sal, employee_id: v })} label="Karyawan" options={employees.data?.map((e: any) => ({ value: e.id, label: e.name })) ?? []} />
        <Input type="number" placeholder="Nominal" value={sal.amount} onChange={(e) => setSal({ ...sal, amount: e.target.value })} />
        <Button onClick={() => call("set_initial_salary", { p_employee_id: sal.employee_id, p_amount: Number(sal.amount) }, "Sisa gaji awal disimpan")}>Simpan</Button>
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
