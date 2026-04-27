# Mitra Finance 99 — Deploy ke Netlify (via GitHub)

Panduan dari nol sampai aplikasi LIVE di internet pakai **Netlify** + **GitHub**, bukan demo lagi.

---

## ✅ Yang Anda butuhkan

| Layanan | Fungsi | Akun |
|---------|--------|------|
| [GitHub](https://github.com) | Simpan source code | Gratis |
| [Netlify](https://netlify.com) | Hosting + CI/CD | Gratis |
| Lovable Cloud | Database (sudah aktif otomatis) | Sudah ada |
| Node.js 20+ & Bun | Build di komputer | Install lokal |

---

## 📦 LANGKAH 1 — Setup di Komputer (VSCode)

```bash
# Ekstrak ZIP & masuk folder
cd mitra-finance-99

# Install dependencies
bun install        # atau: npm install

# Test jalan lokal
bun run dev
# Buka http://localhost:3000
```

---

## 🔑 LANGKAH 2 — File `.env`

Buat file `.env` di **root project** (sejajar `package.json`). Isi persis:

```env
VITE_SUPABASE_URL="https://vqzucvfgiocpluxqklvr.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxenVjdmZnaW9jcGx1eHFrbHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDAwMzEsImV4cCI6MjA5MjgxNjAzMX0.grja1VYkbWQriIWV5SXjSzFnuzZ7cj47EMPb2OFVsik"
VITE_SUPABASE_PROJECT_ID="vqzucvfgiocpluxqklvr"
```

> Aman di-share (publishable key, dilindungi RLS). File `.env` **tidak ikut ke GitHub** (sudah di `.gitignore`) — Anda harus set ulang di Netlify (Langkah 5).

---

## 🔐 LANGKAH 3 — Ganti Password Default (WAJIB!)

Buka `src/lib/auth.ts`, ganti baris ini:

```ts
const HARDCODED = {
  owner: { password: "GANTI_PASSWORD_BARU_YANG_KUAT", role: "super_admin", nama: "Owner MF99" },
  admin: { password: "GANTI_PASSWORD_BARU_YANG_KUAT", role: "admin", nama: "Admin MF99" },
};
```

Password customer (nasabah) bisa di-reset lewat menu **Pengaturan → Akun Nasabah** setelah login.

---

## 🐙 LANGKAH 4 — Push ke GitHub

```bash
git init
git add .
git commit -m "Initial: Mitra Finance 99"

# Buat repo KOSONG di github.com (tanpa README/gitignore)
git branch -M main
git remote add origin https://github.com/USERNAME/mitra-finance-99.git
git push -u origin main
```

Kalau push ditolak, buat **Personal Access Token**: GitHub → Settings → Developer Settings → Tokens → Generate new (scope: `repo`).

---

## 🚀 LANGKAH 5 — Deploy ke Netlify

### A. Connect repo
1. Login [netlify.com](https://netlify.com) (sign up dengan GitHub).
2. **Add new site → Import an existing project → GitHub**.
3. Pilih repo `mitra-finance-99`.

### B. Build settings (auto-detect, tapi pastikan):
| Field | Value |
|-------|-------|
| **Base directory** | _(kosong)_ |
| **Build command** | `bun run build` |
| **Publish directory** | `dist` |
| **Functions directory** | _(kosong)_ |

> Kalau Netlify tidak deteksi Bun, ganti build command jadi `npm install && npm run build`.

### C. Environment variables
Klik **Show advanced → Add environment variable**, tambahkan **3 variabel**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://vqzucvfgiocpluxqklvr.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | _(paste dari .env)_ |
| `VITE_SUPABASE_PROJECT_ID` | `vqzucvfgiocpluxqklvr` |

### D. Deploy!
Klik **Deploy site** → tunggu ±2 menit.

URL otomatis: `https://random-name-12345.netlify.app`

### E. Ubah nama URL (opsional)
**Site settings → Site information → Change site name** → misal `mitra-finance-99` → URL jadi `https://mitra-finance-99.netlify.app`.

### F. SPA Routing — WAJIB!
Buat file `public/_redirects` (kalau belum ada) dengan isi:
```
/*  /index.html  200
```
Ini supaya refresh halaman `/nasabah/abc` tidak 404. Commit & push → auto-deploy.

---

## 🌐 LANGKAH 6 — Custom Domain (Opsional)

1. Beli domain (Niagahoster, Cloudflare Registrar, dll).
2. Netlify → **Domain settings → Add custom domain** → masukkan domain Anda.
3. Ikuti instruksi DNS (tambahkan record `CNAME` ke `xxx.netlify.app`, atau gunakan Netlify DNS).
4. HTTPS otomatis aktif via Let's Encrypt (±10 menit).

---

## 🔄 LANGKAH 7 — Auto-Deploy

Setelah connect, **setiap `git push`** ke branch `main` → Netlify auto-build & deploy. Workflow harian:

```bash
# Edit code di VSCode
git add .
git commit -m "Update fitur X"
git push
# → live di ±2 menit
```

Cek status: Netlify dashboard → **Deploys**.

---

## 🗄️ LANGKAH 8 — Manage Database

Database sudah jalan di Lovable Cloud. Ada 2 cara kelola:

### A. Lewat aplikasi (recommended)
- **Tambah nasabah**: menu Nasabah → tombol **+ Tambah Nasabah** (auto generate username/password).
- **Import Excel**: menu Nasabah → **Import Excel** → upload `.xlsx` (template tersedia).
- **Bayar manual**: klik nama nasabah → tombol **Bayar Manual** (input nominal sembarang, otomatis split ke beberapa angsuran + sisa parsial).
- **Catat keuangan**: Dashboard → **Catat Keuangan** (modal keluar, gaji, operasional, dll).
- **Lihat akun nasabah**: Pengaturan → **Akun Nasabah** (lihat username, password, reset PW, export CSV).
- **Backup data**: Pengaturan → **Backup** (download JSON lengkap atau CSV per tabel).

### B. Lewat Lovable Cloud Dashboard
Login Lovable → buka project → **Cloud → Database → Tables**. Bisa Insert/Edit/Delete row langsung.

---

## 🧹 LANGKAH 9 — Bersihkan Data Demo (Sebelum Production)

1. Login sebagai **owner**.
2. Backup dulu: **Pengaturan → Backup → Backup Lengkap (JSON)**.
3. Buka **Pengaturan → Zona Bahaya**.
4. Ketik `HAPUS SEMUA` → klik tombol → konfirmasi.
5. Database bersih. Mulai isi nasabah real lewat menu **Nasabah → + Tambah Nasabah**.

---

## 📱 LANGKAH 10 — Install ke HP (PWA)

Buka URL Netlify di HP:
- **Android Chrome**: ⋮ → **Install app**
- **iOS Safari**: Share → **Add to Home Screen**

Aplikasi muncul sebagai icon, jalan offline (basic).

---

## 🔧 Checklist Production Final

- [ ] Password `owner` & `admin` di `src/lib/auth.ts` sudah diganti
- [ ] File `public/_redirects` sudah ada (SPA routing)
- [ ] 3 env vars sudah di-set di Netlify
- [ ] Data demo (Yuli, Sifa, dll) sudah dihapus via **Zona Bahaya**
- [ ] Profil bisnis sudah di-isi di **Pengaturan → Profil Bisnis**
- [ ] Custom domain + HTTPS aktif (kalau pakai)
- [ ] Backup pertama sudah di-download

---

## 🆘 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build error "Cannot find Bun" | Ganti build command jadi `npm install && npm run build` |
| Halaman blank setelah deploy | Cek browser console (F12). 99% env vars salah/missing |
| Refresh halaman → 404 | Pastikan `public/_redirects` ada isinya `/*  /index.html  200` |
| Login gagal | Username case-sensitive. Default admin: `admin` / `admin123` |
| Data tidak muncul | Network tab → request ke `supabase.co` harus 200. Cek RLS di Lovable Cloud |
| Push GitHub ditolak | Buat Personal Access Token, gunakan sebagai password |
| Netlify build hang | Site settings → Build & deploy → Stop deploy → Retry |

---

## 📞 Akun Default (WAJIB GANTI sebelum live!)

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `owner` | `mitra99owner` |
| Admin | `admin` | `admin123` |

Customer login pakai username/password yang di-generate otomatis saat tambah nasabah (cek **Pengaturan → Akun Nasabah**).

---

**Selesai!** App Anda sekarang live di internet, auto-deploy dari GitHub, database production di Lovable Cloud. 🎉

_Mitra Finance 99 — Berkembang · Bertumbuh · Berinovasi_
