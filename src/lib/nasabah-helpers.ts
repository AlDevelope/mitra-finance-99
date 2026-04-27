import { supabase } from "@/integrations/supabase/client";

export type Frekuensi = "mingguan" | "harian" | "bulanan";

export interface BuatNasabahInput {
  nama: string;
  item_dibeli: string;
  uang_muka: number;
  jumlah_angsuran: number;
  rp_per_angsuran: number;
  tgl_mulai: string; // YYYY-MM-DD
  whatsapp?: string | null;
  frekuensi: Frekuensi;
  marginPersen: number; // contoh 25 = 25% (untuk catatan keuntungan)
  catatModalKePosKeuangan: boolean; // jika true, masukkan "modal_keluar" sebesar harga pokok
  hargaPokok?: number; // dipakai jika catatModalKePosKeuangan = true
  username?: string; // opsional, default auto-generate
  password?: string; // opsional, default auto-generate
}

/** Bersihkan nama jadi slug huruf kecil tanpa spasi/simbol */
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

/** Cari username unik dari nama, mis: yuli, yuli2, yuli3 */
export async function generateUsername(nama: string) {
  const base = slugify(nama) || "nasabah";
  let candidate = base;
  let i = 1;
  while (true) {
    const { data } = await supabase.from("nasabah").select("id").eq("username", candidate).maybeSingle();
    if (!data) return candidate;
    i++;
    candidate = `${base}${i}`;
  }
}

/** Password sederhana yang mudah diingat: nama+4digit */
export function generatePassword(nama: string) {
  const base = slugify(nama) || "user";
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `${base}${rnd}`;
}

function addInterval(date: Date, frek: Frekuensi, n: number) {
  const d = new Date(date);
  if (frek === "harian") d.setDate(d.getDate() + n);
  else if (frek === "bulanan") d.setMonth(d.getMonth() + n);
  else d.setDate(d.getDate() + n * 7);
  return d;
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Buat nasabah baru + jadwal angsuran + akun login + (opsional) catat ke keuangan */
export async function buatNasabahLengkap(input: BuatNasabahInput) {
  const username = input.username?.trim() || (await generateUsername(input.nama));
  const password = input.password?.trim() || generatePassword(input.nama);

  // 1. Insert nasabah
  const { data: created, error: errNas } = await supabase
    .from("nasabah")
    .insert({
      nama: input.nama,
      item_dibeli: input.item_dibeli,
      uang_muka: input.uang_muka,
      jumlah_angsuran: input.jumlah_angsuran,
      rp_per_angsuran: input.rp_per_angsuran,
      tgl_mulai: input.tgl_mulai,
      whatsapp: input.whatsapp || null,
      username,
      password,
      status: "aktif",
    })
    .select()
    .single();

  if (errNas || !created) throw new Error(errNas?.message || "Gagal membuat nasabah");

  // 2. Generate jadwal angsuran
  const start = new Date(input.tgl_mulai);
  const rows = Array.from({ length: input.jumlah_angsuran }, (_, i) => ({
    nasabah_id: created.id,
    nomor_angsuran: i + 1,
    tanggal: fmt(addInterval(start, input.frekuensi, i + 1)),
    rp: input.rp_per_angsuran,
    status_bayar: "belum",
  }));
  const { error: errAng } = await supabase.from("angsuran").insert(rows);
  if (errAng) throw new Error(errAng.message);

  // 3. Catat ke keuangan (opsional)
  if (input.catatModalKePosKeuangan && input.hargaPokok && input.hargaPokok > 0) {
    await supabase.from("keuangan").insert({
      tanggal: input.tgl_mulai,
      kategori: "modal_keluar",
      nominal: input.hargaPokok,
      keterangan: `Modal pembelian ${input.item_dibeli} untuk ${input.nama}`,
    });
  }
  // catat uang muka sebagai pemasukan
  if (input.uang_muka && input.uang_muka > 0) {
    await supabase.from("keuangan").insert({
      tanggal: input.tgl_mulai,
      kategori: "uang_muka",
      nominal: input.uang_muka,
      keterangan: `DP dari ${input.nama} (${input.item_dibeli})`,
    });
  }

  return { nasabah: created, username, password };
}
