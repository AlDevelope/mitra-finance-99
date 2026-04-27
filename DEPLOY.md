# Mitra Finance 99 — Panduan Deploy ke Production (GitHub + Hosting)

> Setelah Anda download ZIP, ekstrak, lalu ikuti langkah berikut **dari nol** sampai aplikasi live di internet dengan domain sendiri. Ini **bukan demo** — ini production beneran.

---

## 🎯 Apa yang Anda butuhkan (semua GRATIS)

| Layanan | Fungsi | Akun |
|---------|--------|------|
| [GitHub](https://github.com) | Simpan source code | Gratis |
| [Lovable Cloud](https://lovable.dev) | Database (sudah terhubung otomatis) | Sudah ada |
| [Vercel](https://vercel.com) **atau** [Cloudflare Pages](https://pages.cloudflare.com) | Hosting web | Gratis |
| Node.js 20+ & Bun | Build di komputer Anda | Install lokal |

---

## 📁 LANGKAH 1 — Setup Project di Komputer (VSCode)

```bash
# 1. Ekstrak ZIP, masuk ke folder
cd mitra-finance-99

# 2. Install dependencies
bun install
# (atau: npm install)

# 3. Buat file .env (lihat langkah 2 di bawah)

# 4. Test jalan lokal dulu
bun run dev
```

Buka http://localhost:3000 — kalau sudah jalan, lanjut.

---

## 🔑 LANGKAH 2 — Setup Environment Variables (`.env`)

Buat file bernama `.env` di root project (sejajar `package.json`). Isi:

```env
VITE_SUPABASE_URL="https://vqzucvfgiocpluxqklvr.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxenVjdmZnaW9jcGx1eHFrbHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDAwMzEsImV4cCI6MjA5MjgxNjAzMX0.grja1VYkbWQriIWV5SXjSzFnuzZ7cj47EMPb2OFVsik"
VITE_SUPABASE_PROJECT_ID="vqzucvfgiocpluxqklvr"
```

✅ **Aman di-share** — ini publishable key (anon), bukan secret. Database dilindungi RLS.

> **Penting**: `.env` sudah masuk `.gitignore` jadi tidak ikut ke GitHub. Anda harus set ulang di hosting (langkah 5).

---

## 🐙 LANGKAH 3 — Push ke GitHub

```bash
# Di folder project
git init
git add .
git commit -m "Initial commit: Mitra Finance 99"

# Buat repo baru di github.com (kosong, tanpa README)
# Lalu:
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/mitra-finance-99.git
git push -u origin main
```

---

## 🚀 LANGKAH 4 — Deploy ke Hosting (Pilih SATU)

### Opsi A — Vercel (paling mudah, recommended)

1. Buka https://vercel.com → **Sign Up** dengan GitHub.
2. Klik **Add New → Project** → pilih repo `mitra-finance-99` → **Import**.
3. **Framework Preset**: pilih **Vite** (auto-detect).
4. **Build Command**: `bun run build` (atau `npm run build`)
5. **Output Directory**: `dist`
6. **Environment Variables** → tambahkan **3 variabel** dari `.env` di langkah 2:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
7. Klik **Deploy** → tunggu ~2 menit → selesai.
8. URL: `https://mitra-finance-99-xxxx.vercel.app`

**Domain sendiri (opsional)**: Settings → Domains → Add → ikuti instruksi DNS.

### Opsi B — Cloudflare Pages

1. https://dash.cloudflare.com → Workers & Pages → **Create → Pages → Connect to Git**.
2. Pilih repo → **Begin setup**.
3. **Build command**: `bun run build`
4. **Output directory**: `dist`
5. **Environment variables**: tambahkan 3 var sama seperti di atas.
6. **Save and Deploy**.

### Opsi C — Lovable (1 klik)

Kalau project ini juga ada di akun Lovable Anda, cukup klik tombol **Publish** kanan atas. Selesai. URL otomatis `https://nama-project.lovable.app`.

---

## 🔄 LANGKAH 5 — Auto-Deploy

Setelah konek GitHub ↔ hosting, **setiap kali Anda `git push`**, hosting akan auto-build & deploy ulang. Workflow Anda:

```bash
# Edit code di VSCode
git add .
git commit -m "Tambah fitur X"
git push
# → Vercel/Cloudflare auto-deploy dalam ~2 menit
```

---

## 🗄️ LANGKAH 6 — Manage Database

Database Anda **sudah berisi 18 nasabah seed** (Yuli, Sifa, dll.) dan siap pakai production.

### Lihat / edit data
- Login ke akun Lovable → buka project → **Cloud → Database → Tables**.
- Pilih `nasabah` / `angsuran` / `keuangan` → bisa Insert / Edit / Delete row langsung.

### Tambah nasabah baru lewat database
1. Klik tabel `nasabah` → **Insert row**.
2. Isi: `nama`, `item_dibeli`, `uang_muka`, `jumlah_angsuran`, `rp_per_angsuran`, `tgl_mulai`, `whatsapp`, `username`, `password`.
3. Insert juga ke `angsuran` per minggu (`nomor_angsuran` 1..N, `tanggal` +7 hari, `rp` = rp_per_angsuran, `nasabah_id` = id nasabah baru).

### Backup data
- Cloud → Database → Tables → pilih tabel → **Export CSV**.

### Ganti password admin
Edit langsung di file `src/lib/auth.ts`:

```ts
const HARDCODED_USERS = [
  { username: "owner", password: "GANTI_PASSWORD_BARU", ... },
  { username: "admin", password: "GANTI_PASSWORD_BARU", ... },
];
```

Push ulang → auto-deploy.

---

## 🔐 LANGKAH 7 — Security Checklist Production

- [ ] **Ganti password default** `owner` & `admin` di `src/lib/auth.ts`.
- [ ] **Ganti password customer** lewat tabel `nasabah` (kolom `password`) — saat ini plain text, untuk demo. Kalau mau hash, minta Lovable upgrade ke Supabase Auth.
- [ ] **Set domain sendiri** + HTTPS (otomatis di Vercel / Cloudflare).
- [ ] **Backup database mingguan** (export CSV).

---

## 📱 LANGKAH 8 — Install ke HP (PWA)

Setelah live, buka URL di HP:
- **Android Chrome**: menu (⋮) → **Install app**
- **iOS Safari**: Share → **Add to Home Screen**

Aplikasi muncul sebagai icon di home screen, bisa jalan offline (basic).

---

## 🆘 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build error di Vercel | Pastikan 3 env vars sudah di-set, lalu **Redeploy** |
| Halaman blank setelah deploy | Cek browser console (F12) — biasanya env var salah |
| Data tidak muncul | Cek Network tab → request ke `supabase.co` harus 200 OK |
| Login gagal | Username case-sensitive. Default: `admin` / `admin123` |
| Push GitHub ditolak | Set Personal Access Token: github.com → Settings → Developer settings → Tokens |

---

## 📞 Akun Demo Default

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `owner` | `mitra99owner` |
| Admin | `admin` | `admin123` |
| Customer | `yuli` | `yuli123` |
| Customer | `sifa` | `sifa123` |
| Customer | `dimas` | `dimas123` |

**WAJIB GANTI sebelum production!**

---

**Selesai!** Aplikasi Anda sekarang LIVE di internet, auto-deploy dari GitHub, database production di Lovable Cloud. 🎉

_Mitra Finance 99 — Berkembang · Bertumbuh · Berinovasi_
