export interface NasabahRow {
  id: string;
  nama: string;
  item_dibeli: string;
  uang_muka: number;
  jumlah_angsuran: number;
  rp_per_angsuran: number;
  tgl_mulai: string;
  status: string;
  whatsapp: string | null;
  username: string | null;
}

export interface AngsuranRow {
  id: string;
  nasabah_id: string;
  nomor_angsuran: number;
  tanggal: string;
  rp: number;
  keterangan: string | null;
  status_bayar: string;
}

export interface Stats {
  totalKredit: number;
  terbayar: number;
  sisaNominal: number;
  sisaCount: number;
  progress: number;
  lunas: boolean;
  angsuranBerikutnya: AngsuranRow | null;
  terlambat: boolean;
}

export function hitungStats(n: NasabahRow, angs: AngsuranRow[]): Stats {
  const totalKredit = n.jumlah_angsuran * n.rp_per_angsuran + Number(n.uang_muka || 0);
  const dibayar = angs.filter((a) => a.status_bayar === "dibayar");
  const terbayar = dibayar.reduce((s, a) => s + Number(a.rp), 0) + Number(n.uang_muka || 0);
  const sisaCount = n.jumlah_angsuran - dibayar.length;
  const sisaNominal = sisaCount * n.rp_per_angsuran;
  const progress = n.jumlah_angsuran > 0 ? Math.min(100, (dibayar.length / n.jumlah_angsuran) * 100) : 0;
  const lunas = dibayar.length >= n.jumlah_angsuran;
  const next = angs.filter((a) => a.status_bayar !== "dibayar").sort((a, b) => a.nomor_angsuran - b.nomor_angsuran)[0] ?? null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const terlambat = !!next && new Date(next.tanggal) < today;
  return { totalKredit, terbayar, sisaNominal, sisaCount, progress, lunas, angsuranBerikutnya: next, terlambat };
}

export function statusBadge(s: Stats): { label: string; tone: "success" | "warning" | "danger" | "info" } {
  if (s.lunas) return { label: "LUNAS", tone: "success" };
  if (s.terlambat) return { label: "TERLAMBAT", tone: "danger" };
  if (s.angsuranBerikutnya) {
    const d = Math.round((new Date(s.angsuranBerikutnya.tanggal).getTime() - Date.now()) / 86400000);
    if (d <= 3) return { label: "JATUH TEMPO", tone: "warning" };
  }
  return { label: "AKTIF", tone: "info" };
}
