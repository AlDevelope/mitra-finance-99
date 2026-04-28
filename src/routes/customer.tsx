import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hitungStats, statusBadge, type AngsuranRow, type NasabahRow } from "@/lib/calc";
import { formatRp, formatTanggal, initials } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, MessageCircle, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role !== "customer") throw redirect({ to: "/dashboard" });
  },
  component: CustomerPage,
});

function CustomerPage() {
  const session = getSession() as Session;
  const [n, setN] = useState<NasabahRow | null>(null);
  const [angs, setAngs] = useState<AngsuranRow[]>([]);
  const [showMonthly, setShowMonthly] = useState(false);

  useEffect(() => {
    if (!session.nasabah_id) return;
    (async () => {
      const [{ data: nd }, { data: ad }] = await Promise.all([
        supabase.from("nasabah").select("*").eq("id", session.nasabah_id!).maybeSingle(),
        supabase.from("angsuran").select("*").eq("nasabah_id", session.nasabah_id!).order("nomor_angsuran"),
      ]);
      setN((nd ?? null) as NasabahRow | null);
      setAngs((ad ?? []) as AngsuranRow[]);
    })();
  }, [session.nasabah_id]);

  // Reminder bulanan: tampil 1x per bulan kalender per nasabah
  useEffect(() => {
    if (!n || typeof window === "undefined") return;
    const today = new Date();
    const key = `mf99-monthly-${n.id}-${today.getFullYear()}-${today.getMonth()}`;
    if (!localStorage.getItem(key)) {
      setShowMonthly(true);
      localStorage.setItem(key, "1");
    }
  }, [n]);

  if (!n) {
    return (
      <AppShell session={session}>
        <div className="h-32 rounded-2xl bg-card animate-pulse" />
      </AppShell>
    );
  }

  const stats = hitungStats(n, angs);
  const badge = statusBadge(stats);
  const next = stats.angsuranBerikutnya;

  const waMsg = next
    ? `Halo Admin Mitra Finance 99, saya ${n.nama} ingin konfirmasi pembayaran:\nAngsuran ke-${next.nomor_angsuran}, ${formatRp(next.rp)}, untuk ${n.item_dibeli}`
    : `Halo Admin Mitra Finance 99, saya ${n.nama}, kredit saya untuk ${n.item_dibeli} sudah lunas. Terima kasih!`;
  const adminWa = "6281234567890"; // default; admin bisa ganti di pengaturan
  const waLink = `https://wa.me/${adminWa}?text=${encodeURIComponent(waMsg)}`;

  // Hitung hari telat / hari menuju jatuh tempo untuk notifikasi
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysToNext = next ? Math.round((new Date(next.tanggal).getTime() - today.getTime()) / 86400000) : null;
  const hariTelat = daysToNext !== null && daysToNext < 0 ? Math.abs(daysToNext) : 0;
  const showLateAlert = hariTelat >= 2;
  const showDueSoon = !showLateAlert && daysToNext !== null && daysToNext >= 0 && daysToNext <= 7;

  return (
    <AppShell session={session}>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-brand flex items-center gap-2">
          <Sparkles className="h-3 w-3" /> Tagihan Saya
        </p>
        <h1 className="font-serif text-3xl font-bold mt-1 tracking-tight">Halo, {n.nama} 👋</h1>
      </div>

      {/* Notifikasi terlambat */}
      {showLateAlert && next && (
        <div className="mb-5 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 flex items-start gap-3 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-destructive">Segera bayar, sudah telat {hariTelat} hari nih!</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Angsuran ke-{next.nomor_angsuran} ({formatRp(next.rp)}) jatuh tempo {formatTanggal(next.tanggal)}.
            </div>
            <Button asChild size="sm" className="mt-3 bg-destructive text-destructive-foreground hover:opacity-90">
              <a href={waLink} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 mr-1.5" /> Bayar Sekarang
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Notifikasi jatuh tempo dekat */}
      {showDueSoon && next && (
        <div className="mb-5 rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
          <Bell className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-warning-foreground">
              {daysToNext === 0 ? "Jatuh tempo hari ini!" : `Jatuh tempo ${daysToNext} hari lagi`}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Angsuran ke-{next.nomor_angsuran} · {formatRp(next.rp)} · {formatTanggal(next.tanggal)}
            </div>
          </div>
        </div>
      )}

      {/* Notifikasi bulanan */}
      {showMonthly && !showLateAlert && !showDueSoon && next && (
        <div className="mb-5 rounded-2xl border border-brand/30 bg-brand-soft p-4 flex items-start gap-3">
          <Bell className="h-5 w-5 text-brand shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">Pengingat bulanan</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Sisa {stats.sisaCount}× angsuran ({formatRp(stats.sisaNominal)}). Angsuran berikutnya {formatTanggal(next.tanggal)}.
            </div>
          </div>
        </div>
      )}

      {/* Hero card */}
      <div className="rounded-3xl border border-brand/30 bg-gradient-to-br from-card via-card to-accent p-6 shadow-elegant relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground text-xl font-bold shadow-elegant">
            {initials(n.nama)}
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3 w-3" /> Item
            </div>
            <div className="font-bold text-lg">{n.item_dibeli}</div>
          </div>
          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <Stat label="Total Tagihan" value={formatRp(stats.totalKredit)} />
          <Stat label="Sudah Dibayar" value={formatRp(stats.terbayar)} tone="success" />
          <Stat label="Sisa Tagihan" value={formatRp(stats.sisaNominal)} tone="brand" />
          <Stat label="Sisa Angsuran" value={`${stats.sisaCount}x`} />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span className="font-semibold text-foreground">{Math.round(stats.progress)}%</span>
          </div>
          <Progress value={stats.progress} className="h-3" />
        </div>

        {next && (
          <div className="mt-6 rounded-2xl bg-background/60 border border-border p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Pembayaran berikutnya</div>
              <div className="font-bold mt-0.5">Angsuran ke-{next.nomor_angsuran} · {formatRp(next.rp)}</div>
              <div className="text-xs text-muted-foreground">{formatTanggal(next.tanggal)}</div>
            </div>
            <Button asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90">
              <a href={waLink} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 mr-1.5" /> Konfirmasi Bayar via WA
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <h2 className="font-serif text-xl font-bold mt-8 mb-4">Riwayat Angsuran</h2>
      <div className="relative pl-6 sm:pl-8">
        <div className="absolute left-2 sm:left-3 top-2 bottom-2 w-0.5 bg-border" />
        {angs.map((a) => {
          const sudah = a.status_bayar === "dibayar";
          const isNext = next?.id === a.id;
          return (
            <div key={a.id} className="relative pb-4">
              <div
                className={cn(
                  "absolute -left-[18px] sm:-left-[22px] top-3 h-4 w-4 rounded-full border-2",
                  sudah ? "bg-success border-success" : isNext ? "bg-brand border-brand animate-pulse" : "bg-card border-border",
                )}
              />
              <div
                className={cn(
                  "rounded-xl border p-3 flex items-center justify-between gap-2",
                  sudah ? "border-success/30 bg-success/5" : isNext ? "border-brand/40 bg-brand/5" : "border-border bg-card",
                )}
              >
                <div>
                  <div className="text-xs text-muted-foreground">Angsuran ke-{a.nomor_angsuran}</div>
                  <div className="text-sm font-medium">{formatTanggal(a.tanggal)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatRp(a.rp)}</div>
                  {sudah ? (
                    <StatusBadge tone="success">Lunas</StatusBadge>
                  ) : isNext ? (
                    <StatusBadge tone="warning">Berikutnya</StatusBadge>
                  ) : (
                    <StatusBadge tone="muted">Mendatang</StatusBadge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "brand" }) {
  return (
    <div className="rounded-xl bg-background/50 border border-border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-bold text-base mt-0.5", tone === "success" && "text-success", tone === "brand" && "text-brand")}>{value}</div>
    </div>
  );
}
