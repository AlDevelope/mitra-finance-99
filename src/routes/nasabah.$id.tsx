import { createFileRoute, redirect, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, canEdit, type Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hitungStats, statusBadge, type AngsuranRow, type NasabahRow } from "@/lib/calc";
import { formatRp, formatTanggal, initials, daysUntil } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, MessageCircle, Phone, X, Share2, Copy, Wallet, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nasabah/$id")({
  beforeLoad: ({ params }) => {
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role === "customer" && s.nasabah_id !== params.id) throw redirect({ to: "/customer" });
  },
  component: NasabahDetail,
});

function NasabahDetail() {
  const session = getSession() as Session;
  const { id } = useParams({ from: "/nasabah/$id" });
  const [n, setN] = useState<NasabahRow | null>(null);
  const [angs, setAngs] = useState<AngsuranRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: nd }, { data: ad }] = await Promise.all([
      supabase.from("nasabah").select("*").eq("id", id).maybeSingle(),
      supabase.from("angsuran").select("*").eq("nasabah_id", id).order("nomor_angsuran"),
    ]);
    setN((nd ?? null) as NasabahRow | null);
    setAngs((ad ?? []) as AngsuranRow[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppShell session={session}>
        <div className="h-32 rounded-2xl bg-card animate-pulse" />
      </AppShell>
    );
  }
  if (!n) {
    return (
      <AppShell session={session}>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Nasabah tidak ditemukan.</p>
          <Link to="/nasabah" className="text-brand underline mt-4 inline-block">Kembali</Link>
        </div>
      </AppShell>
    );
  }

  const stats = hitungStats(n, angs);
  const badge = statusBadge(stats);
  const editable = canEdit(session);

  return (
    <AppShell session={session}>
      {session.role !== "customer" && (
        <Link to="/nasabah" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar
        </Link>
      )}

      {/* Header card */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-accent p-6 shadow-card">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground text-2xl font-bold shadow-elegant">
            {initials(n.nama)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-3xl font-bold">{n.nama}</h1>
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            </div>
            <p className="text-muted-foreground mt-1">📦 {n.item_dibeli}</p>
            {n.whatsapp && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {n.whatsapp}
              </p>
            )}
          </div>
          {editable && (
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex gap-2">
                <BayarManualDialog nasabah={n} angsuran={angs} onDone={load} />
                <ShareButton nasabah={n} stats={stats} />
              </div>
            </div>
          )}
        </div>

        {/* Info Kredit */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <Info label="Uang Muka" value={formatRp(n.uang_muka)} />
          <Info label="Total Kredit" value={formatRp(stats.totalKredit)} highlight />
          <Info label="Per Angsuran" value={`${formatRp(n.rp_per_angsuran)}/mgg`} />
          <Info label="Jumlah Angsuran" value={`${n.jumlah_angsuran}x`} />
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progress pembayaran</span>
            <span className="font-semibold text-foreground">{Math.round(stats.progress)}%</span>
          </div>
          <Progress value={stats.progress} className="h-3" />
          <div className="flex justify-between text-xs mt-2">
            <span className="text-success">✓ Terbayar: {formatRp(stats.terbayar)}</span>
            <span className="text-brand font-semibold">Sisa: {formatRp(stats.sisaNominal)} ({stats.sisaCount}x)</span>
          </div>
        </div>
      </div>

      {/* Tabel Angsuran */}
      <h2 className="font-serif text-xl font-bold mt-8 mb-4">Riwayat Angsuran</h2>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">No.</th>
                <th className="text-left px-4 py-3 font-semibold">Tanggal</th>
                <th className="text-right px-4 py-3 font-semibold">Nominal</th>
                <th className="text-right px-4 py-3 font-semibold">Sisa</th>
                <th className="text-right px-4 py-3 font-semibold">Sisa Nominal</th>
                <th className="text-left px-4 py-3 font-semibold">Keterangan</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                {editable && <th className="text-right px-4 py-3 font-semibold">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {angs.map((a, i) => {
                const sudah = a.status_bayar === "dibayar";
                const dibayarSampaiSini = angs.slice(0, i + 1).filter((x) => x.status_bayar === "dibayar").length;
                const sisaSetelahnya = n.jumlah_angsuran - dibayarSampaiSini;
                const sisaNominalRow = sisaSetelahnya * Number(n.rp_per_angsuran);
                const dueIn = daysUntil(a.tanggal);
                const terlambat = !sudah && dueIn < 0;
                const segera = !sudah && dueIn >= 0 && dueIn <= 3;

                return (
                  <tr
                    key={a.id}
                    className={cn(
                      "border-t border-border transition-colors",
                      sudah && "bg-success/5",
                      terlambat && "bg-destructive/5",
                      segera && "bg-warning/5",
                    )}
                  >
                    <td className="px-4 py-3 font-semibold">{a.nomor_angsuran}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTanggal(a.tanggal)}</td>
                    <td className="px-4 py-3 text-right">{formatRp(a.rp)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{sudah ? sisaSetelahnya : n.jumlah_angsuran - angs.slice(0, i).filter((x) => x.status_bayar === "dibayar").length}x</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatRp(sudah ? sisaNominalRow : (n.jumlah_angsuran - angs.slice(0, i).filter((x) => x.status_bayar === "dibayar").length) * Number(n.rp_per_angsuran))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.keterangan ?? "-"}</td>
                    <td className="px-4 py-3 text-center">
                      {sudah ? (
                        <StatusBadge tone="success">Lunas</StatusBadge>
                      ) : terlambat ? (
                        <StatusBadge tone="danger">Telat {Math.abs(dueIn)}h</StatusBadge>
                      ) : segera ? (
                        <StatusBadge tone="warning">{dueIn === 0 ? "Hari ini" : `${dueIn}h lagi`}</StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">Mendatang</StatusBadge>
                      )}
                    </td>
                    {editable && (
                      <td className="px-4 py-3 text-right">
                        {sudah ? (
                          <BatalkanButton angsuran={a} onDone={load} />
                        ) : (
                          <BayarButton angsuran={a} onDone={load} />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-background/50 border border-border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-bold mt-0.5", highlight && "text-brand")}>{value}</div>
    </div>
  );
}

function BayarButton({ angsuran, onDone }: { angsuran: AngsuranRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("angsuran")
      .update({ status_bayar: "dibayar", keterangan: keterangan || "Dibayar" })
      .eq("id", angsuran.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`Angsuran ke-${angsuran.nomor_angsuran} dicatat sebagai LUNAS`);
    setOpen(false);
    setKeterangan("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90">
          <Check className="h-4 w-4 mr-1" /> Bayar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Angsuran ke-{angsuran.nomor_angsuran}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal:</span><span>{formatTanggal(angsuran.tanggal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Nominal:</span><span className="font-bold text-brand">{formatRp(angsuran.rp)}</span></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ket">Keterangan (opsional)</Label>
            <Textarea id="ket" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="contoh: Dibayar tunai" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-brand text-primary-foreground">
            {loading ? "Menyimpan..." : "Konfirmasi Lunas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatalkanButton({ angsuran, onDone }: { angsuran: AngsuranRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const submit = async () => {
    const { error } = await supabase
      .from("angsuran")
      .update({ status_bayar: "belum", keterangan: null })
      .eq("id", angsuran.id);
    if (error) return toast.error(error.message);
    toast.success("Pembayaran dibatalkan");
    setOpen(false);
    onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <X className="h-4 w-4 mr-1" /> Batal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Batalkan pembayaran ke-{angsuran.nomor_angsuran}?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Status akan dikembalikan menjadi "belum bayar". Yakin?</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Tidak</Button>
          <Button variant="destructive" onClick={submit}>Ya, batalkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareButton({ nasabah, stats }: { nasabah: NasabahRow; stats: ReturnType<typeof hitungStats> }) {
  const [open, setOpen] = useState(false);
  const next = stats.angsuranBerikutnya;
  const dibayarCount = nasabah.jumlah_angsuran - stats.sisaCount;

  const message = `Halo *${nasabah.nama}*! 👋

Berikut info angsuran Anda di *Mitra Finance 99*:

📦 Item: ${nasabah.item_dibeli}
💰 Per Angsuran: ${formatRp(nasabah.rp_per_angsuran)}/minggu
📊 Progress: Angsuran ke-${dibayarCount} dari ${nasabah.jumlah_angsuran}
💵 Sisa Tagihan: ${formatRp(stats.sisaNominal)}
${next ? `\n📅 Angsuran berikutnya (ke-${next.nomor_angsuran}): ${formatTanggal(next.tanggal)}\n💳 Nominal: ${formatRp(next.rp)}` : "\n✅ *LUNAS* — Terima kasih!"}

_Mitra Finance 99 — Berkembang, Bertumbuh, Berinovasi_ 🌟`;

  const wa = nasabah.whatsapp ? `https://wa.me/${nasabah.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-brand/50 text-brand hover:bg-brand/10">
          <Share2 className="h-4 w-4 mr-1" /> Bagikan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Bagikan Tagihan {nasabah.nama}</DialogTitle></DialogHeader>
        <pre className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs max-h-64 overflow-auto">{message}</pre>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(message);
              toast.success("Pesan disalin");
            }}
          >
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
          {wa && (
            <Button asChild className="bg-gradient-brand text-primary-foreground">
              <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" /> Kirim WhatsApp</a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BayarManualDialog({
  nasabah,
  angsuran,
  onDone,
}: {
  nasabah: NasabahRow;
  angsuran: AngsuranRow[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState("");
  const [catatKeKeuangan, setCatatKeKeuangan] = useState(true);
  const [loading, setLoading] = useState(false);

  const belum = angsuran.filter((a) => a.status_bayar !== "dibayar").sort((a, b) => a.nomor_angsuran - b.nomor_angsuran);
  const perAngsuran = Number(nasabah.rp_per_angsuran);
  const nominalNum = Number(nominal.replace(/\D/g, "")) || 0;
  const akanLunas = Math.min(belum.length, Math.floor(nominalNum / perAngsuran));
  const sisa = nominalNum - akanLunas * perAngsuran;

  const submit = async () => {
    if (nominalNum <= 0) return toast.error("Nominal harus lebih dari 0");
    if (belum.length === 0) return toast.error("Semua angsuran sudah lunas");
    setLoading(true);

    const target = belum.slice(0, akanLunas);
    const ket = keterangan.trim() || `Bayar ${formatRp(nominalNum)} pada ${formatTanggal(tanggal)}`;

    if (target.length > 0) {
      const { error } = await supabase
        .from("angsuran")
        .update({ status_bayar: "dibayar", keterangan: ket })
        .in("id", target.map((a) => a.id));
      if (error) {
        setLoading(false);
        return toast.error(error.message);
      }
    }

    // Sisa partial — simpan ke angsuran berikutnya sebagai keterangan saja (tidak ditandai lunas)
    if (sisa > 0 && belum[akanLunas]) {
      await supabase
        .from("angsuran")
        .update({ keterangan: `Cicilan parsial: ${formatRp(sisa)} (${formatTanggal(tanggal)})` })
        .eq("id", belum[akanLunas].id);
    }

    if (catatKeKeuangan) {
      await supabase.from("keuangan").insert({
        tanggal,
        kategori: "angsuran_masuk",
        nominal: nominalNum,
        keterangan: `${nasabah.nama} — ${akanLunas}x angsuran${sisa > 0 ? ` + cicilan ${formatRp(sisa)}` : ""}`,
      });
    }

    setLoading(false);
    toast.success(
      akanLunas > 0
        ? `${akanLunas} angsuran ditandai LUNAS${sisa > 0 ? `, sisa ${formatRp(sisa)} dicatat` : ""}`
        : `Cicilan parsial ${formatRp(sisa)} dicatat`
    );
    setOpen(false);
    setNominal("");
    setKeterangan("");
    onDone();
  };

  const formatInput = (v: string) => {
    const n = v.replace(/\D/g, "");
    return n ? Number(n).toLocaleString("id-ID") : "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90">
          <Wallet className="h-4 w-4 mr-1" /> Bayar Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran — {nasabah.nama}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Per angsuran:</span><span className="font-semibold">{formatRp(perAngsuran)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sisa angsuran:</span><span className="font-semibold">{belum.length}x</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total sisa:</span><span className="font-semibold text-brand">{formatRp(belum.length * perAngsuran)}</span></div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nominal">Nominal yang dibayarkan *</Label>
            <Input
              id="nominal"
              inputMode="numeric"
              placeholder="contoh: 200.000"
              value={nominal}
              onChange={(e) => setNominal(formatInput(e.target.value))}
              className="text-lg font-bold"
            />
            {nominalNum > 0 && (
              <div className="text-xs rounded-lg bg-success/10 border border-success/30 p-2 space-y-0.5">
                <div>✓ Akan menutup <b>{akanLunas}x</b> angsuran ({formatRp(akanLunas * perAngsuran)})</div>
                {sisa > 0 && <div className="text-warning">• Sisa {formatRp(sisa)} dicatat sebagai cicilan parsial di angsuran berikutnya</div>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tgl">Tanggal Bayar</Label>
              <Input id="tgl" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ket-m">Keterangan</Label>
              <Input id="ket-m" placeholder="opsional" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={catatKeKeuangan}
              onChange={(e) => setCatatKeKeuangan(e.target.checked)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span>Catat juga ke pos keuangan (pemasukan)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={loading || nominalNum <= 0} className="bg-gradient-brand text-primary-foreground">
            {loading ? "Menyimpan..." : "Simpan Pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
