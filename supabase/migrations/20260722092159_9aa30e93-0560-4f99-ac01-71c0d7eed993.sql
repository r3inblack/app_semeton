
CREATE TABLE public.telegram_templates (
  key text PRIMARY KEY,
  label text NOT NULL,
  module text NOT NULL,
  template text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.telegram_templates TO authenticated;
GRANT UPDATE ON public.telegram_templates TO authenticated;
GRANT ALL ON public.telegram_templates TO service_role;

ALTER TABLE public.telegram_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_read_authenticated" ON public.telegram_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_update_admin" ON public.telegram_templates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_telegram_templates_updated
  BEFORE UPDATE ON public.telegram_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.telegram_templates (key, label, module, template, variables) VALUES
  ('stock_in', 'Barang Masuk (langsung)', 'stok',
   E'📥 <b>Barang Masuk</b>\nSupplier: {{supplier}}\nGudang: {{warehouse}}\nProduk: {{product}}\nQty: {{qty}}\nHarga: {{unit_price}}\nTotal: {{total}}\n{{note_line}}',
   ARRAY['supplier','warehouse','product','qty','unit_price','total','note','note_line']),
  ('stock_in_approved', 'Barang Masuk Disetujui', 'stok',
   E'✅ <b>Barang Masuk Disetujui</b>\nSupplier: {{supplier}}\nGudang: {{warehouse}}\nProduk: {{product}}\nQty: {{qty}}\nHarga Beli: {{unit_price}}\nTotal: {{total}}',
   ARRAY['supplier','warehouse','product','qty','unit_price','total']),
  ('stock_in_pending', 'Pengajuan Barang Masuk (ke Owner)', 'pengajuan',
   E'📦 <b>Pengajuan Barang Masuk</b>\nSupplier: {{supplier}}\nGudang: {{warehouse}}\nProduk: {{product}}\nQty: {{qty}}\n{{note_line}}\nBalas pesan ini dengan format:\n<code>&lt;harga_beli&gt; &lt;harga_jual&gt;</code>\nContoh: <code>10000 12000</code>\n\n#ID:{{pending_id}}',
   ARRAY['supplier','warehouse','product','qty','note','note_line','pending_id']),
  ('stock_mutation', 'Mutasi Stok', 'stok',
   E'🔄 <b>Mutasi Stok</b>\nDari: {{from}}\nKe: {{to}}\nProduk: {{product}}\nQty: {{qty}}\n{{note_line}}',
   ARRAY['from','to','product','qty','note','note_line']),
  ('sale', 'Penjualan Kredit', 'kas',
   E'🛒 <b>Penjualan Kredit</b>\nPelanggan: {{customer}}\nProduk: {{product}}\nQty: {{qty}}\nHarga: {{unit_price}}\nTotal: {{total}}',
   ARRAY['customer','warehouse','product','qty','unit_price','total']),
  ('customer_payment', 'Setoran Pelanggan', 'kas',
   E'💰 <b>Setoran Pelanggan</b>\n{{customer}}: {{amount}}\n{{note_line}}',
   ARRAY['customer','amount','note','note_line']),
  ('supplier_payment', 'Bayar Supplier', 'kas',
   E'🏭 <b>Bayar Supplier</b>\n{{supplier}}: {{amount}}\n{{note_line}}',
   ARRAY['supplier','amount','note','note_line']),
  ('expense', 'Pengeluaran', 'kas',
   E'🧾 <b>Pengeluaran</b>\n{{category}}: {{amount}}\n{{note_line}}',
   ARRAY['category','amount','note','note_line']),
  ('salary_accrual_gudang', 'Tambah Hak Gaji (Gudang)', 'penggajian',
   E'➕ <b>Tambah Hak Gaji (Gudang)</b>\nKaryawan: {{employee}}\nJumlah: {{amount}}',
   ARRAY['employee','amount','note','note_line']),
  ('salary_accrual_kurir', 'Tambah Hak Gaji (Kurir)', 'penggajian',
   E'➕ <b>Tambah Hak Gaji (Kurir)</b>\nKurir: {{employee}}\nJumlah: {{amount}}',
   ARRAY['employee','amount','note','note_line']),
  ('salary_advance', 'Kasbon / Uang Jalan', 'penggajian',
   E'💸 <b>Kasbon/Uang Jalan</b>\nKaryawan: {{employee}}\nNominal: {{amount}}\n{{note_line}}',
   ARRAY['employee','amount','note','note_line']),
  ('salary_payment', 'Bayar Gaji', 'penggajian',
   E'💼 <b>Bayar Gaji</b>\nKaryawan: {{employee}}\nNominal: {{amount}}\n{{note_line}}',
   ARRAY['employee','amount','note','note_line']),
  ('employee_bonus', 'Bonus Barang Karyawan', 'penggajian',
   E'🎁 <b>Bonus Barang Karyawan</b>\nKaryawan: {{employee}}\nGudang: {{warehouse}}\nProduk: {{product}}\nQty: {{qty}}\n{{note_line}}',
   ARRAY['employee','warehouse','product','qty','note','note_line']);
