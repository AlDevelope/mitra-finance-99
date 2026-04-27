# 🚀 Persiapan Project Original (Bukan Demo) — Mitra Finance 99

Panduan ini berisi **SEMUA yang perlu kamu ubah/dapatkan** agar project ini siap dipakai produksi setelah di-clone ke VSCode, plus cara mengelola database & import data Excel tanpa input manual.

---

## ✅ CHECKLIST CEPAT (urutkan dari atas ke bawah)

| # | Yang harus diubah | File / Lokasi | Wajib? |
|---|---|---|---|
| 1 | Ganti password admin & owner | `src/lib/auth.ts` (objek `HARDCODED`) | ✅ Wajib |
| 2 | Isi env Lovable Cloud (Supabase) | `.env` | ✅ Wajib |
| 3 | Import data Excel kamu | UI: `/import` | ⚠️ Kalau punya data lama |
| 4 | Hapus 18 nasabah seed demo | Lihat bagian *Database Control* | ⚠️ Opsional |
| 5 | Ubah info brand (logo, nama, footer) | `src/components/Logo.tsx`, `public/manifest.json` | ⚠️ Kosmetik |
| 6 | Aktifkan WhatsApp/notifikasi (opsional) | Belum implement, butuh API | ❌ Opsional |
| 7 | Build & deploy ke hosting | `bun run build` → Vercel/Cloudflare | ✅ Wajib |

---

## 1️⃣ Ganti Password Default (PALING PENTING!)

Default project pakai akun demo:
- `owner` / `mitra99owner` (super admin)
- `admin` / `admin123` (admin)

**Buka `src/lib/auth.ts` baris 16-19** dan ganti:

```ts
const HARDCODED: Record<string, { password: string; role: Role; nama: string }> = {
  owner: { password: "GANTI_DENGAN_PASSWORD_KUAT_KAMU", role: "super_admin", nama: "Nama Owner Asli" },
  admin: { password: "GANTI_PASSWORD_ADMIN", role: "admin", nama: "Nama Admin Asli" },
};
```

> 💡 Pakai password minimal 12 karakter, campur huruf-angka-simbol.

---

## 2️⃣ File `.env` (Sudah Otomatis dari Lovable Cloud)

Project sudah include file `.env` yang berisi credentials Lovable Cloud kamu:

```env
VITE_SUPABASE_URL="https://xxx.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi..."
VITE_SUPABASE_PROJECT_ID="xxx"
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi..."
```

**Setelah download ke VSCode**:
1. Pastikan file `.env` ikut ter-extract (tidak ter-skip oleh `.gitignore`)
2. Kalau hilang, buka di Lovable → menu **Cloud → Connect** → copy URL & anon key
3. Saat deploy ke Vercel/Cloudflare, **paste env vars yang sama** di dashboard hosting

> ⚠️ Jangan commit `.env` ke GitHub publik. Pakai `.gitignore`.

---

## 3️⃣ API Keys yang Mungkin Kamu Butuhkan (Opsional)

Project core **tidak butuh API key tambahan**. Berikut opsional:

| Fitur | API yang dibutuhkan | Cara dapat |
|---|---|---|
| Kirim WhatsApp otomatis | Twilio / Fonnte / WAblas | Daftar di twilio.com atau fonnte.com |
| Kirim email reminder | Resend / SendGrid | resend.com (gratis 3rb email/bln) |
| Backup ke Google Drive | Google Drive API | console.cloud.google.com |
| AI assistant | (sudah ada `LOVABLE_API_KEY` bawaan) | Tidak perlu |

> Kalau mau aktifkan, beri tahu Lovable: "tambah fitur kirim WA pakai Fonnte" dan dia akan minta API key-nya.

---

## 4️⃣ KONTROL DATABASE

Kamu punya **3 cara** mengelola database:

### Cara A — Via UI Aplikasi (paling mudah)
- **Tambah nasabah**: halaman `/nasabah` → tombol **"+ Tambah Nasabah"** → otomatis buat akun login
- **Catat keuangan**: halaman `/dashboard` → tombol **"Catat Keuangan"**
- **Import Excel**: halaman `/nasabah` → tombol **"Import Excel"** (lihat bagian 5)
- **Lihat semua akun**: setelah import, download file hasil yg berisi username + password

### Cara B — Via Lovable Cloud Dashboard
1. Buka project di Lovable
2. Klik tab **Cloud** di kanan atas
3. Pilih **Database → Tables**
4. Klik tabel `nasabah` → bisa lihat/edit/hapus row langsung
5. Tabel yang ada:
   - `nasabah` — data nasabah + kolom `username` & `password` (plain text untuk demo, lihat catatan keamanan)
   - `angsuran` — jadwal angsuran per nasabah
   - `keuangan` — catatan pemasukan/pengeluaran

### Cara C — Via SQL langsung (untuk advanced)
Di Lovable Cloud → **Database → SQL Editor**, contoh query:

```sql
-- Lihat semua akun nasabah
SELECT nama, username, password, whatsapp FROM nasabah ORDER BY nama;

-- Hapus nasabah seed demo
DELETE FROM nasabah WHERE nama IN ('Yuli','Budi', /* dst */);

-- Reset semua data (HATI-HATI!)
TRUNCATE angsuran, keuangan, nasabah CASCADE;

-- Ganti password seorang nasabah
UPDATE nasabah SET password='passbaru123' WHERE username='budi';
```

---

## 5️⃣ IMPORT DATA EXCEL → DATABASE (Tanpa Input Manual!)

Project sudah include **importer Excel** otomatis.

### Langkah:
1. Login sebagai admin/owner
2. Buka menu **Nasabah** → klik **"Import Excel"** (kanan atas)
3. Klik **"Download Template"** → dapat file `template-nasabah.xlsx`
4. Isi data nasabah kamu di template tsb (kolom: Nama, Item, Uang Muka, Jumlah Angsuran, Rp Per Angsuran, Tanggal Mulai, WhatsApp, Harga Pokok)
5. Upload file Excel kamu
6. Map kolom (otomatis terdeteksi, tinggal cek)
7. Pilih **frekuensi** (mingguan/harian/bulanan) & **margin keuntungan default**
8. Klik **"Import N Nasabah"**

### Yang otomatis terjadi:
- ✅ Insert semua nasabah ke tabel `nasabah`
- ✅ **Generate username + password unik untuk setiap nasabah** (mereka bisa langsung login)
- ✅ Generate jadwal angsuran lengkap (sesuai frekuensi)
- ✅ Catat modal & DP ke pos keuangan otomatis
- ✅ Download file Excel berisi semua akun yang dibuat (username + password) untuk dibagikan ke nasabah

> 💡 Format Excel kamu beda? Tinggal pilih kolom mana = field apa di mapping. Tidak perlu rename header.

---

## 6️⃣ Lihat Username & Password Nasabah

Karena project ini menyimpan password **plain text** di kolom `nasabah.password` (sesuai brief demo), kamu bisa lihat dengan:

**Cara cepat — UI**: Setelah import, langsung download file hasil import.

**Cara DB**: Lovable Cloud → SQL Editor:
```sql
SELECT nama, username, password FROM nasabah WHERE username IS NOT NULL ORDER BY created_at DESC;
```

> ⚠️ **Catatan keamanan**: Untuk produksi serius, password sebaiknya di-hash (bcrypt). Project sekarang plain text agar admin bisa lihat & bantu nasabah yang lupa password. Kalau mau di-hash, bilang ke Lovable: "ubah password nasabah jadi di-hash".

---

## 7️⃣ Ganti Branding (Opsional)

| Yang diganti | File |
|---|---|
| Nama "Mitra Finance 99" | `src/components/Logo.tsx`, `src/components/AppShell.tsx`, `public/manifest.json`, `index.html` |
| Logo SVG | `public/icon.svg` |
| Warna brand | `src/styles.css` (variabel `--brand`, `--brand-glow`) |
| Tagline & meta SEO | `src/routes/__root.tsx` |

---

## 8️⃣ STEP-BY-STEP: Dari ZIP → Production

```bash
# 1. Extract ZIP, masuk folder
cd mitra-finance-99

# 2. Install dependencies (butuh Bun: https://bun.sh)
bun install

# 3. Cek file .env sudah ada (kalau tidak, copy dari Lovable Cloud)
cat .env

# 4. Edit password admin di src/lib/auth.ts
# (pakai VSCode atau editor lain)

# 5. Run dev untuk test lokal
bun run dev
# Buka http://localhost:3000

# 6. Build production
bun run build

# 7. Deploy — pilih SALAH SATU:

# Opsi A: Deploy via Lovable (paling mudah)
# Klik tombol "Publish" di kanan atas Lovable

# Opsi B: Deploy ke Vercel
bunx vercel
# Set env vars VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY di dashboard Vercel

# Opsi C: Deploy ke Cloudflare Pages
bunx wrangler deploy
```

### Push ke GitHub:
```bash
git init
git add .
git commit -m "Initial commit Mitra Finance 99"
gh repo create mitra-finance-99 --private --source=. --push
```

Lalu di GitHub → Settings → Secrets → tambahkan env vars yang sama untuk CI/CD.

---

## 🆘 Troubleshooting

| Masalah | Solusi |
|---|---|
| `Failed to fetch` saat login | Cek `.env` — `VITE_SUPABASE_URL` & key benar? |
| Import Excel gagal | Pastikan kolom Nama, Jumlah Angsuran, Rp Per Angsuran terisi |
| Username sudah ada | Importer otomatis tambah angka (yuli, yuli2, yuli3) |
| Password lupa | Lihat di Lovable Cloud → tabel `nasabah` |
| Data demo masih ada | Jalankan `TRUNCATE` query di bagian 4 cara C |

---

**Selamat menggunakan Mitra Finance 99! 🎉**
