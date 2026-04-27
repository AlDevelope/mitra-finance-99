# 📦 Patch Mitra Finance 99 — File yang Sudah Disempurnakan

ZIP ini berisi **HANYA file yang diubah/baru**. Cukup **timpa** file dengan struktur folder yang sama di project Anda.

---

## ✅ Daftar file di ZIP ini

```
src/
  lib/
    auth.ts                          ← akun owner & admin (GANTI PASSWORD!)
    nasabah-helpers.ts               ← logika auto-buat nasabah + jadwal angsuran
  routes/
    login.tsx                        ← demo box dihapus
    nasabah.tsx                      ← tombol Tambah & Import Excel
    nasabah.$id.tsx                  ← detail nasabah lengkap (riwayat, bayar manual, share WA)
    dashboard.tsx                    ← tombol Catat Keuangan
    pengaturan.tsx                   ← profil bisnis, akun nasabah, backup, zona bahaya
    import.tsx                       ← (BARU) import Excel ke database
  components/
    AppShell.tsx                     ← admin & super_admin bisa akses Pengaturan
    Logo.tsx                         ← font lebih elegan
    TambahNasabahDialog.tsx          ← (BARU)
    TambahKeuanganDialog.tsx         ← (BARU)
public/
  _redirects                         ← (BARU) fix routing Netlify SPA
netlify.toml                         ← (BARU) konfigurasi build Netlify
package.json                         ← + dependency xlsx
NETLIFY.md                           ← (BARU) panduan deploy step-by-step
PRODUCTION.md                        ← panduan persiapan produksi
DEPLOY.md                            ← panduan deploy umum
SETUP.md                             ← panduan setup VSCode lokal
CARA-PAKAI-PATCH.md                  ← file ini
```

---

## 🚀 Langkah Setelah Timpa File

### 1️⃣ Edit akun owner & admin (WAJIB!)
Buka **`src/lib/auth.ts`** baris ~16-34. Ganti dua password ini:

```ts
owner: {
  password: "GANTI_PASSWORD_OWNER_ANDA",   // ← ganti
  ...
},
admin: {
  password: "GANTI_PASSWORD_ADMIN_ANDA",   // ← ganti
  ...
},
```

> 💡 Anda juga boleh ganti `username` (`owner` / `admin`) dan `nama` sesuai bisnis Anda.

### 2️⃣ Install dependency baru (jika belum)
```bash
bun install
# atau
npm install
```

### 3️⃣ Hapus data demo (sekali saja)
Login sebagai **owner**, masuk **Pengaturan → Zona Bahaya → HAPUS SEMUA DATA**.
Setelah itu database bersih dan siap diisi nasabah real.

### 4️⃣ Isi data nasabah real
Tiga cara:
- **Manual**: halaman Nasabah → tombol **+ Tambah Nasabah**
- **Import Excel**: halaman Nasabah → **Import Excel** (download template dulu)
- **Langsung database**: dashboard Lovable Cloud → tabel `nasabah`

Setiap nasabah otomatis dapat **username + password** untuk login customer.

### 5️⃣ Push ke GitHub & deploy ke Netlify
Lihat **`NETLIFY.md`** untuk langkah lengkap:
1. Buat repo baru di GitHub → push code
2. Netlify → New site from Git → pilih repo
3. Build command: `bun run build` · Publish directory: `dist`
4. Environment variables (di Netlify → Site settings → Environment):
   ```
   VITE_SUPABASE_URL=https://vqzucvfgiocpluxqklvr.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<sudah ada di .env Anda>
   VITE_SUPABASE_PROJECT_ID=vqzucvfgiocpluxqklvr
   ```
5. Deploy 🚀

### 6️⃣ (Opsional) Custom domain
Netlify → Domain management → Add custom domain.

---

## 🆕 Fitur Detail Nasabah (saat nama diklik)

Admin & owner saat klik nama nasabah akan melihat:
- 👤 Nama, item dibeli, foto inisial, nomor WA (klik = WhatsApp langsung)
- 💰 Uang muka, total kredit, per angsuran, jumlah angsuran
- 📊 Progress bar pembayaran + sisa tagihan
- 📋 **Tabel riwayat angsuran** (no, tanggal, nominal, sisa, status: Lunas/Telat/Hari ini/Mendatang)
- ✅ Tombol **Bayar** per angsuran (catat lunas + keterangan)
- 💵 Tombol **Bayar Manual** (input nominal bebas, otomatis settle beberapa angsuran sekaligus + sisa parsial)
- ❌ Tombol **Batalkan** (untuk koreksi)
- 📤 Tombol **Bagikan** (kirim tagihan ke WhatsApp nasabah)

---

## 🛟 Bantuan

Jika error setelah timpa:
1. Hapus `node_modules` & `bun.lockb` → `bun install` ulang
2. Pastikan `.env` masih ada (jangan ditimpa)
3. Restart dev server: `bun run dev`
