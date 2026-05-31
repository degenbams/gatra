# Gatra

Gatra adalah aplikasi rekap keuangan pribadi berbasis Next.js dan Supabase.
Fokusnya sederhana: bantu pengguna mencatat pemasukan, pengeluaran, target
tabungan, jatah aman harian, dan rekap bulanan dalam satu dashboard yang rapi.

Tagline: **Rekap keuanganmu, tersusun jelas.**

Production: [https://gatra.cash](https://gatra.cash)

## Preview

![Gatra login desktop](./gatra-login-desktop.png)

![Gatra monthly setup mobile](./gatra-monthly-setup-mobile.png)

## Fitur Utama

- Auth email/password dengan Supabase Auth.
- Dashboard bulanan dengan pemasukan utama, pemasukan tambahan, total pemasukan,
  total pengeluaran, sisa uang saat ini, sisa budget aman, dan status keuangan.
- Jatah aman hari ini untuk membantu kontrol belanja harian.
- Budget bulanan dengan target tabungan dan preview realistis.
- Limit kategori untuk memantau pos pengeluaran yang mulai bocor.
- Transaksi pengeluaran: tambah, edit, hapus, filter bulan/tahun.
- Pemasukan tambahan: tambah, edit, hapus, filter bulan/tahun.
- Rekap bulanan dengan insight, breakdown kategori, daily tracking, weekly
  tracking, daftar transaksi, dan daftar pemasukan tambahan.
- Export PDF rekap bulanan langsung dari browser.
- UI Bahasa Indonesia, mobile responsive, dan format rupiah dengan pemisah
  ribuan.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + RLS
- Recharts
- jsPDF + autoTable

## Environment Variables

Gatra hanya butuh public Supabase keys di `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Jangan menambahkan `service_role` key ke frontend.

## Setup Lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Supabase Database Updates

Jalankan SQL berikut di Supabase SQL Editor:

- `supabase-income-entries.sql`
  Membuat tabel `income_entries`, RLS, policy per user, dan trigger
  `updated_at`.

- `supabase-category-limits.sql`
  Membuat tabel `category_limits`, RLS, policy per user, dan trigger
  `updated_at`.

Data keuangan user dipisah lewat RLS dan `auth.uid()`.

## Supabase Auth Setup

### Development

Untuk testing lokal, email verification Supabase bisa terkena rate limit.

- Buka Supabase Dashboard > Authentication > Providers > Email.
- Matikan `Confirm email` saat testing lokal.
- Tetap gunakan flow register/login email dan password di Gatra.

### Production

- Aktifkan kembali email confirmation jika dibutuhkan.
- Gunakan custom SMTP seperti Resend, SendGrid, Mailgun, atau SMTP provider lain.
- Set `Site URL` ke domain production.
- Tambahkan redirect URL production dan localhost di Supabase Auth.

Contoh:

```text
https://gatra.cash/**
https://www.gatra.cash/**
http://localhost:3000/**
```

## Quality Check

Jalankan sebelum push:

```bash
npm run lint
npm run build
```

## Multi Device Workflow

Kalau mengedit dari PC/laptop berbeda, selalu sync dulu:

```bash
git pull --ff-only origin main
```

Setelah selesai:

```bash
npm run lint
npm run build
git status
git add .
git commit -m "Describe the change"
git push origin main
```

Vercel akan deploy otomatis dari branch `main`.
