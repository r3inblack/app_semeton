import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen,
  LogIn,
  Users,
  Package,
  ShoppingCart,
  Wallet,
  HandCoins,
  Gift,
  Truck,
  FileBarChart,
  Settings as SettingsIcon,
  Bell,
  KeyRound,
  ShieldAlert,
  LifeBuoy,
} from "lucide-react";
import type { ReactNode } from "react";

type Section = {
  id: string;
  title: string;
  icon: typeof BookOpen;
  content: ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "intro",
    title: "1. Pengenalan Aplikasi",
    icon: BookOpen,
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>
          <b>Aplikasi Semeton</b> adalah sistem manajemen stok & keuangan internal (POS
          sederhana + arus kas) dengan sistem multi-role. Setiap pengguna hanya melihat
          menu sesuai hak aksesnya.
        </p>
        <p className="text-muted-foreground">
          Panduan ini merangkum alur kerja utama. Jika ada menu yang tidak muncul,
          hubungi Super Admin untuk mengaktifkan hak aksesnya di{" "}
          <b>Pengaturan → Pengguna &amp; Hak Akses</b>.
        </p>
      </div>
    ),
  },
  {
    id: "login",
    title: "2. Login & Akun",
    icon: LogIn,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li>Login menggunakan <b>username</b> dan <b>password</b> (bukan email).</li>
        <li>Akun master awal: <code className="rounded bg-muted px-1">admin</code> / <code className="rounded bg-muted px-1">admin123</code> — segera ubah password setelah login pertama.</li>
        <li>Akun master tidak dapat dihapus, hanya bisa ganti password.</li>
        <li>Untuk keluar, klik nama pengguna di kanan atas → <b>Keluar</b>.</li>
      </ul>
    ),
  },
  {
    id: "users",
    title: "3. Pengguna & Role",
    icon: Users,
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>Menu <b>Pengaturan → Pengguna &amp; Hak Akses</b> untuk membuat akun karyawan.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Akun harus terhubung ke data <b>Karyawan</b> agar sisa gaji tampil di Dashboard.</li>
          <li>Role bawaan: Super Admin, Admin, Kasir, Staff Keuangan, Staff Gudang, Manager/Owner, Viewer, dan <b>Custom</b>.</li>
          <li>Buat role baru di tab <b>Role &amp; Hak Akses</b>, atur centang menu (lihat/buat/ubah/hapus).</li>
          <li>Role <b>Staf Gudang</b> tidak dapat melihat harga beli.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "master",
    title: "4. Master Data",
    icon: Package,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li><b>Pelanggan</b> — ID pelanggan otomatis (S0001, S0002, ...).</li>
        <li><b>Supplier</b>, <b>Karyawan</b> (kategori: Gudang / Kurir / Kantor), <b>Gudang</b>, <b>Produk</b>.</li>
        <li><b>Kategori Pengeluaran</b> — dipakai di Pengeluaran & Laporan Pengeluaran.</li>
        <li><b>Rekening Penerima</b> — daftar rekening untuk portal setoran pelanggan.</li>
      </ul>
    ),
  },
  {
    id: "stock",
    title: "5. Alur Stok & Persetujuan",
    icon: Package,
    content: (
      <ol className="list-decimal pl-5 text-sm space-y-1.5 leading-relaxed">
        <li><b>Barang Masuk</b> — Staf Gudang mencatat kedatangan barang tanpa mengisi harga.</li>
        <li>Sistem mengirim notifikasi ke Owner via Telegram. Owner menentukan harga beli & jual (via aplikasi atau balas pesan Telegram: <code className="rounded bg-muted px-1">harga_beli harga_jual</code>).</li>
        <li>Setelah disetujui, stok bertambah dan barang bisa dijual atau dimutasi.</li>
        <li><b>Mutasi Stok</b> — pindah stok antar gudang.</li>
        <li><b>Stok Gudang</b> — lihat sisa stok real-time per gudang.</li>
      </ol>
    ),
  },
  {
    id: "sales",
    title: "6. Penjualan (Tunai / DP / Kredit)",
    icon: ShoppingCart,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li>Pilih pelanggan & gudang, tambahkan item.</li>
        <li><b>Harga / unit</b> bisa diisi manual; kosongkan untuk memakai harga jual default.</li>
        <li>Isi <b>DP / Tunai</b> jika pelanggan langsung bayar sebagian atau seluruhnya. Sisanya tercatat sebagai piutang.</li>
      </ul>
    ),
  },
  {
    id: "cash",
    title: "7. Kas: Setoran, Bayar Supplier, Pengeluaran",
    icon: Wallet,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li><b>Setoran Pelanggan</b> — cicilan pelanggan mengurangi piutang.</li>
        <li><b>Persetujuan Setoran</b> — setoran dari <b>Portal Pelanggan</b> harus disetujui admin dulu.</li>
        <li><b>Bayar Supplier</b> — mengurangi hutang ke supplier.</li>
        <li><b>Pengeluaran</b> — pilih kategori pengeluaran (dari Master Data).</li>
      </ul>
    ),
  },
  {
    id: "salary",
    title: "8. Penggajian & Kasbon",
    icon: HandCoins,
    content: (
      <ol className="list-decimal pl-5 text-sm space-y-1.5 leading-relaxed">
        <li><b>Tambah Hak Gaji</b> / <b>Hak Gaji Kurir</b> — mencatat gaji yang menjadi hak karyawan.</li>
        <li><b>Kasbon / Uang Jalan</b> — pinjaman/advance mengurangi saldo gaji.</li>
        <li><b>Bayar Cicilan Gaji</b> — pembayaran sisa gaji.</li>
        <li>Sisa gaji tiap karyawan muncul di Dashboard mereka.</li>
      </ol>
    ),
  },
  {
    id: "bonus",
    title: "9. Bonus Barang & Retur Supplier",
    icon: Gift,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li><b>Bonus Barang</b> untuk karyawan (Staf Gudang mengajukan → Owner setujui via aplikasi / Telegram). Setelah disetujui: stok berkurang, nilainya masuk sebagai pengeluaran (harga beli).</li>
        <li><b>Retur ke Supplier</b> — barang ditarik supplier: stok berkurang, hutang ke supplier ikut berkurang otomatis.</li>
      </ul>
    ),
  },
  {
    id: "reports",
    title: "10. Laporan",
    icon: FileBarChart,
    content: (
      <p className="text-sm leading-relaxed">
        Tersedia laporan: <b>Arus Kas</b>, <b>Piutang / Setoran</b>, <b>Hutang Supplier</b>,
        <b> Mutasi Barang</b>, <b>Pengeluaran</b> (filter tanggal & kategori),
        <b> Bonus Barang</b>, dan <b>Retur Supplier</b>. Semua laporan bisa difilter tanggal.
      </p>
    ),
  },
  {
    id: "telegram",
    title: "11. Notifikasi Telegram",
    icon: Bell,
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p><b>Dua bot terpisah:</b></p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><b>Bot Grup</b> — mengirim notifikasi transaksi kas/stok ke grup Telegram.</li>
          <li><b>Bot Owner</b> — mengirim pengajuan barang masuk & bonus ke owner pribadi. Owner yang dicentang <i>"Boleh menentukan harga"</i> dapat membalas untuk approve.</li>
        </ul>
        <p>Kustomisasi format pesan di tab <b>Template Pesan</b>. Cek koneksi di <b>Diagnostik Webhook</b>.</p>
      </div>
    ),
  },
  {
    id: "portal",
    title: "12. Portal Pelanggan",
    icon: LifeBuoy,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li>URL publik: <code className="rounded bg-muted px-1">/portal</code> (link di halaman login).</li>
        <li>Pelanggan cari ID/nama, isi nominal, upload bukti transfer, ketik rekening tujuan.</li>
        <li>Setoran masuk ke <b>Persetujuan Setoran</b> — baru terhitung setelah admin approve.</li>
      </ul>
    ),
  },
  {
    id: "api",
    title: "13. API Eksternal & Integrasi (n8n)",
    icon: KeyRound,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li>Buat API Key di <b>Pengaturan → API Eksternal</b>.</li>
        <li>Endpoint dasar: <code className="rounded bg-muted px-1">/api/public/v1/*</code>.</li>
        <li>Kirim header <code className="rounded bg-muted px-1">Authorization: Bearer &lt;api_key&gt;</code>.</li>
        <li>Cocok untuk otomatisasi via n8n, Zapier, atau webhook Telegram custom.</li>
      </ul>
    ),
  },
  {
    id: "void",
    title: "14. Membatalkan Transaksi (Super Admin)",
    icon: ShieldAlert,
    content: (
      <ul className="list-disc pl-5 text-sm space-y-1.5 leading-relaxed">
        <li>Setiap riwayat transaksi punya tombol <b>Batalkan</b> (hanya Super Admin).</li>
        <li>Wajib mengisi alasan pembatalan. Stok, kas, piutang/hutang, dan saldo gaji otomatis dikembalikan.</li>
        <li>Data tetap tersimpan (diberi tanda) sebagai jejak audit — tidak dihapus permanen.</li>
      </ul>
    ),
  },
  {
    id: "danger",
    title: "15. Danger Zone — Factory Reset",
    icon: ShieldAlert,
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>
          <b>Pengaturan → Danger Zone</b> berisi <b>Factory Reset</b> yang menghapus{" "}
          <u>seluruh</u> data transaksi, master, dan pengguna kecuali akun master
          <code className="rounded bg-muted px-1">admin</code>.
        </p>
        <p className="text-destructive font-medium">
          Aksi ini tidak dapat dibatalkan. Pastikan sudah ada backup sebelum menjalankan.
        </p>
      </div>
    ),
  },
];

export function UserGuide() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base">Panduan Penggunaan Aplikasi</h2>
              <p className="text-sm text-muted-foreground">
                Ringkasan alur kerja setiap modul. Klik setiap bagian untuk melihat detailnya.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Accordion type="multiple" className="w-full">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <AccordionItem key={s.id} value={s.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm font-medium">{s.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-7">{s.content}</AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
