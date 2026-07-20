# Aplikasi Semeton — Rencana Implementasi

Sistem manajemen stok & keuangan internal (POS sederhana + cashflow) multi-role, responsif, tema gelap pada sidebar.

## 1. Stack & Fondasi
- TanStack Start + React 19 + Tailwind v4 (sudah tersedia).
- **Lovable Cloud** (Supabase) untuk DB, auth, RLS, server functions.
- shadcn/ui + sidebar gelap (`Sidebar` shadcn) + layout responsif.
- State: TanStack Query untuk data server; Zustand kecil untuk `appName` cache.
- Charts: Recharts (grafik pergerakan kas).

## 2. Struktur Database (Supabase)
Enum `app_role`: `super_admin`, `staf_gudang`.

Tabel:
- `profiles` (id→auth.users, full_name, warehouse_id nullable)
- `user_roles` (user_id, role) — role terpisah, pakai `has_role()` security definer
- `app_settings` (singleton: app_name, telegram_enabled, telegram_bot_token, telegram_chat_id)
- **Master:** `warehouses`, `customers`, `suppliers`, `employees` (kategori: gudang|kurir, warehouse_id, commission_rate), `products` (nama, harga_jual, harga_beli, commission_per_unit)
- **Saldo agregat:** `cash_balance` (singleton), `stock_levels` (product_id, warehouse_id, qty), `customer_balances` (piutang), `supplier_balances` (hutang), `employee_salary_balances` (hak gaji)
- **Transaksi:**
  - `stock_in` + items → tambah stok, tambah hutang supplier
  - `stock_mutations` → pindah stok antar gudang
  - `sales` + items → kurangi stok, tambah piutang
  - `customer_payments` (setoran) → +kas, −piutang
  - `supplier_payments` → −kas, −hutang
  - `expenses` → −kas
  - `salary_accruals` (gudang/kurir) → +hak gaji
  - `salary_advances` (kasbon) → −kas, −hak gaji
  - `salary_payments` → −kas, −hak gaji
  - `employee_bonuses` (barang) → hanya −stok
- **Cashflow ledger:** `cash_movements` (type, ref_id, amount, sign, created_at, user_id) untuk laporan arus kas & grafik

RLS:
- Master data & settings: SELECT/WRITE hanya `super_admin`.
- `stock_levels`: `super_admin` full; `staf_gudang` SELECT hanya `warehouse_id = profile.warehouse_id`.
- `sales`: `staf_gudang` SELECT hanya sales di gudangnya.
- Semua transaksi: WRITE via server functions dengan `requireSupabaseAuth`.

Fungsi DB (RPC atomik) — dipakai server functions:
- `record_stock_in`, `record_mutation`, `record_sale`, `record_customer_payment`, `record_supplier_payment`, `record_expense`, `record_salary_accrual`, `record_salary_advance`, `record_salary_payment`, `record_employee_bonus`, `reset_transactions`, `setup_initial_balances`.

## 3. Routing
```
/auth                              → login
/_authenticated/                   → gate (managed)
  ├── dashboard                    → dashboard adaptif per role
  ├── master/{customers,suppliers,employees,warehouses,products}
  ├── stock/{levels,in,mutations}
  ├── sales
  ├── payments/{customer,supplier}
  ├── expenses
  ├── salary/{accrual,advance,payment,bonus}
  ├── reports/{cashflow,receivables,payables,mutations}
  └── settings                     → hanya super_admin (tab: app,telegram,initial,danger)
```

## 4. UI/Layout
- `AppShell`: Sidebar gelap (bg neutral-900) + main area terang.
- Menu sidebar difilter berdasarkan role (staf gudang hanya lihat: Dashboard, Stock Gudang, Penjualan gudangnya).
- Header menampilkan nama aplikasi dinamis dari `app_settings`.
- Responsif: sidebar collapse ke offcanvas di mobile via `SidebarProvider`.

## 5. Dashboard
- **Super Admin:** 4 kartu metrik + tabel piutang per pelanggan + line chart kas 30 hari.
- **Staf Gudang:** kartu stok per produk di gudangnya + tabel 3 penjualan terakhir gudangnya.

## 6. Telegram Notifikasi
Server function `notifyTelegram(message)` dipanggil dari `record_customer_payment`, `record_supplier_payment`, `record_expense`. Baca token/chat_id dari `app_settings` (server-side). Jika disabled → skip. Tidak butuh koneksi eksternal — pakai `fetch` langsung ke `api.telegram.org` dari server function.

## 7. Setup Data Awal
Form set: saldo kas awal, stok per (produk×gudang), piutang awal per pelanggan, hutang awal per supplier, hak gaji awal per karyawan. Satu RPC `setup_initial_balances` (upsert saldo, buat entry cash_movement kategori "SALDO_AWAL").

## 8. Danger Zone
Tombol reset → dialog konfirmasi ketik "RESET" → RPC `reset_transactions`: TRUNCATE semua tabel transaksi + reset saldo agregat ke 0. Master data & users tetap.

## 9. Seed Awal
Migrasi juga membuat 1 baris `app_settings` default (name="Aplikasi Semeton") dan menyiapkan trigger auto-create profile pada signup. Super admin pertama: user perlu daftar lalu di-promote via SQL (dijelaskan setelah build), atau kita sediakan "first user = super_admin" trigger.

## 10. Urutan Build (fase)
1. Enable Lovable Cloud + migrasi schema + RLS + RPC + seed settings.
2. Auth (email/password) + layout + sidebar + gate role.
3. Master data CRUD.
4. Settings (app name, telegram, initial balances, danger zone).
5. Stock (levels, in, mutations).
6. Penjualan + Setoran + Bayar Supplier + Pengeluaran.
7. Penggajian (accrual, kasbon, cicilan, bonus barang).
8. Dashboard adaptif + Laporan + grafik + Telegram hook.

## Catatan Teknis
- Semua mutasi state melalui RPC Postgres (transaksi atomik) untuk konsistensi saldo.
- `cash_movements` menjadi single source of truth untuk saldo kas & laporan.
- Auth method: **email/password** (bisa tambah Google jika kamu mau).

---

**Yang perlu dikonfirmasi sebelum eksekusi:**
1. Setuju metode login **email + password saja** (tanpa Google)?
2. Setuju user pertama yang mendaftar otomatis jadi **Super Admin**, selanjutnya Super Admin yang membuat akun Staf Gudang dari menu Master → Karyawan?
3. Komisi karyawan: apakah nilai komisi per unit disimpan di **master Produk** (kolom `commission_per_unit`) atau di master **Karyawan** (rate per unit yang dikirim)? Saya rekomendasikan di **Produk** agar konsisten.
4. OK jika saya lanjutkan dalam satu build besar (fase 1–8 sekaligus)?
