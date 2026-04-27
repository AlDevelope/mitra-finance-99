# Mitra Finance 99 — Panduan Setup Lokal (VSCode)

> **Catatan penting**: Aplikasi ini **tidak menggunakan Google Sheets / Google Apps Script**.
> Backend memakai **Lovable Cloud** (PostgreSQL terkelola via Supabase).
> Database, tabel, RLS, dan **18 nasabah seed** sudah dibuat otomatis di Lovable Cloud project Anda.
>
> Untuk menjalankan di VSCode (lokal), Anda hanya perlu menyambungkan kode ke Cloud project yang sama.

---

## 0. Prasyarat

| Tool | Versi minimum | Catatan |
|------|---------------|---------|
| **Node.js** | 20.x | Disarankan via [nvm](https://github.com/nvm-sh/nvm) |
| **Bun** | 1.1+ | Package manager (lebih cepat dari npm). Install: `curl -fsSL https://bun.sh/install \| bash` |
| **VSCode** | latest | + extension: ESLint, Prettier, Tailwind CSS IntelliSense |
| **Git** | latest | |

> Boleh pakai `npm`/`pnpm` jika tidak ingin pakai Bun — tinggal ganti `bun` dengan `npm` di semua perintah.

---

## 1. Clone / Download Project ke VSCode

1. Di Lovable, klik tombol **GitHub** → **Connect to GitHub** → push project ke repo Anda.
2. Di komputer lokal:
   ```bash
   git clone https://github.com/<username>/<repo>.git mitra-finance-99
   cd mitra-finance-99
   code .
   ```
3. Install dependencies:
   ```bash
   bun install
   ```

---

## 2. Setup Environment Variables (`.env`)

File `.env` **sudah otomatis dibuat** oleh Lovable Cloud dan berisi:

```env
VITE_SUPABASE_URL="https://vqzucvfgiocpluxqklvr.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
VITE_SUPABASE_PROJECT_ID="vqzucvfgiocpluxqklvr"
```

Saat Anda push ke GitHub, **file `.env` tidak ikut** (karena ada di `.gitignore`).
Untuk pakai di lokal:

1. Buka project Anda di Lovable → klik tab **Cloud** (sidebar) → **Overview** → **API Keys**.
2. Salin nilai **Project URL** dan **anon (publishable) key**.
3. Buat file `.env` di root project:
   ```env
   VITE_SUPABASE_URL="https://vqzucvfgiocpluxqklvr.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi...your-anon-key..."
   VITE_SUPABASE_PROJECT_ID="vqzucvfgiocpluxqklvr"
   ```
4. Simpan file. **Jangan commit `.env` ke Git.**

> File `src/integrations/supabase/client.ts` & `types.ts` dibuat otomatis — **jangan diedit manual.**

---

## 3. Jalankan Development Server

```bash
bun run dev
```

Buka di browser: **http://localhost:3000**

Login dengan akun demo:

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `owner` | `mitra99owner` |
| Admin | `admin` | `admin123` |
| Customer | `yuli` | `yuli123` |
| Customer | `sifa` | `sifa123` |
| Customer | `dimas` | `dimas123` |

---

## 4. Database — Sudah Terisi Otomatis

Database Lovable Cloud sudah punya 3 tabel yang terisi data Excel asli:

| Tabel | Isi |
|-------|-----|
| `nasabah` | 18 nasabah (Yuli, Sifa, Sulistiawan, dll.) |
| `angsuran` | Jadwal cicilan per nasabah (otomatis +7 hari/minggu) |
| `keuangan` | Posisi keuangan global (cash, tanah, stokbit, dll.) |

### Lihat / kelola data secara visual

1. Di Lovable, buka tab **Cloud** → **Database** → **Tables**.
2. Klik nama tabel untuk melihat / edit / export data ke CSV.
3. Tombol **Run SQL** untuk query manual.

### Reset / re-seed data manual (jika perlu)

File migrasi seed ada di `supabase/migrations/` — sudah dijalankan otomatis. Untuk re-run, buka SQL editor Cloud dan jalankan ulang isinya.

---

## 5. Memasukkan Data Baru (CRUD)

### Lewat aplikasi (cara biasa)

| Aksi | Lokasi |
|------|--------|
| Tambah pembayaran angsuran | `/nasabah/<id>` → tombol **Bayar** per baris |
| Bagikan tagihan via WA | `/nasabah/<id>` → tombol **Bagikan** |
| Lihat ringkasan & grafik | `/dashboard` |

> **Form tambah nasabah baru** & **import Excel** belum ada di iterasi pertama (sesuai scope “Core dulu”). Bisa diminta ke Lovable untuk ditambahkan kapan saja — tinggal bilang “tambahkan form tambah nasabah dan import Excel”.

### Lewat Database UI (manual)

1. Cloud → Database → Tables → `nasabah` → **Insert row**.
2. Isi: `nama`, `item_dibeli`, `uang_muka`, `jumlah_angsuran`, `rp_per_angsuran`, `tgl_mulai`, `whatsapp`, dst.
3. Untuk customer login, isi `username` & `password` (plain text untuk demo).
4. Lalu insert `angsuran` baris-per-baris (`nomor_angsuran`, `tanggal`, `rp`, `nasabah_id` = id nasabah baru).

---

## 6. Tema Terang / Gelap

- Default: **mengikuti tema sistem** (OS / browser).
- Tombol toggle ☀️ / 🖥️ / 🌙 di pojok kanan atas (mobile) atau di sidebar (desktop).
- Pilihan tersimpan di `localStorage` per perangkat.

---

## 7. Build untuk Production

```bash
bun run build
```

Output ada di folder `dist/`. Bisa di-preview lokal:

```bash
bun run start
```

---

## 8. Deploy ke Production

### Opsi A — Deploy via Lovable (paling mudah)

1. Buka project di Lovable → klik **Publish** (kanan atas).
2. Selesai. URL otomatis: `https://<nama-project>.lovable.app`.

### Opsi B — Deploy ke Cloudflare/Vercel sendiri

Project ini menggunakan TanStack Start dengan target **Cloudflare Workers** (lihat `wrangler.jsonc`). Setup standar Cloudflare:

```bash
bunx wrangler deploy
```

---

## 9. PWA (Install ke HP)

Aplikasi sudah bisa di-install ke HP:

- **Android (Chrome)**: buka URL → menu (⋮) → **Install app** / **Tambah ke layar utama**.
- **iOS (Safari)**: buka URL → tombol **Share** → **Tambah ke Layar Utama**.

Manifest ada di `public/manifest.json`, ikon di `public/icon.svg`.

---

## 10. Struktur Folder

```
mitra-finance-99/
├── src/
│   ├── routes/              ← halaman (TanStack Router file-based)
│   │   ├── __root.tsx       ← layout + meta global + auto theme
│   │   ├── index.tsx        ← redirect ke /login atau /dashboard
│   │   ├── login.tsx
│   │   ├── dashboard.tsx    ← KPI cards + 4 grafik (recharts)
│   │   ├── nasabah.tsx      ← daftar nasabah + filter
│   │   ├── nasabah.$id.tsx  ← detail + tabel angsuran + bayar/bagikan
│   │   ├── customer.tsx     ← portal nasabah (read-only)
│   │   └── pengaturan.tsx
│   ├── components/
│   │   ├── AppShell.tsx     ← sidebar + bottom nav + theme toggle
│   │   ├── ThemeToggle.tsx  ← light / system / dark
│   │   ├── Logo.tsx, StatusBadge.tsx
│   │   └── ui/              ← shadcn components (jangan edit)
│   ├── lib/
│   │   ├── auth.ts          ← session hardcode + customer lookup
│   │   ├── calc.ts          ← rumus angsuran / sisa / progress
│   │   ├── format.ts        ← format Rupiah & tanggal Indonesia
│   │   └── utils.ts
│   ├── integrations/supabase/  ← AUTO-GENERATED, JANGAN EDIT
│   └── styles.css           ← design tokens (light/dark, OKLCH)
├── public/
│   ├── manifest.json        ← PWA manifest
│   └── icon.svg             ← logo MF99
├── supabase/
│   ├── config.toml
│   └── migrations/          ← schema + 18 nasabah seed
├── .env                     ← TIDAK DI-COMMIT, isi sendiri (lihat §2)
├── package.json
└── README.md
```

---

## 11. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Failed to fetch` / data kosong | Pastikan `.env` benar (URL + anon key dari Cloud → API Keys). Restart `bun run dev`. |
| Login gagal terus | Akun demo case-sensitive. Coba `admin` (huruf kecil) / `admin123`. |
| Halaman blank, error di console | Hard reload (`Ctrl+Shift+R`). Hapus `localStorage` browser. |
| Grafik tidak muncul | Pastikan `recharts` terinstall: `bun add recharts`. |
| Port 3000 sudah dipakai | `bun run dev --port 3001` atau matikan proses lama. |
| Tema tidak ganti | Klik toggle ☀️/🖥️/🌙 di sidebar, bukan auto sistem. |

---

## 12. Roadmap (di luar scope iterasi pertama)

Bisa diminta ke Lovable untuk menambahkan:

- [ ] Form tambah / edit nasabah (dengan auto-generate jadwal angsuran)
- [ ] Import data dari file `.xlsx`
- [ ] Halaman manajemen akun customer (super admin)
- [ ] Upload bukti transfer per pembayaran
- [ ] Notifikasi WA otomatis H-1 jatuh tempo
- [ ] Export laporan keuangan ke PDF / Excel

---

**Selesai.** Selamat menggunakan Mitra Finance 99 🚀

_Berkembang · Bertumbuh · Berinovasi_
