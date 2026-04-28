import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hitungStats, statusBadge, type AngsuranRow, type NasabahRow } from "@/lib/calc";
import { formatRp, initials } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { TambahNasabahDialog } from "@/components/TambahNasabahDialog";
import { Button } from "@/components/ui/button";
import { canEdit } from "@/lib/auth";

export const Route = createFileRoute("/nasabah")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role === "customer") throw redirect({ to: "/customer" });
  },
  component: NasabahListPage,
});

function NasabahListPage() {
  const session = getSession() as Session;
  const [nasabah, setNasabah] = useState<NasabahRow[]>([]);
  const [angsuran, setAngsuran] = useState<AngsuranRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"semua" | "lunas" | "aktif" | "terlambat">("semua");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: n }, { data: a }] = await Promise.all([
        supabase.from("nasabah").select("*").order("nama"),
        supabase.from("angsuran").select("*"),
      ]);
      setNasabah((n ?? []) as NasabahRow[]);
      setAngsuran((a ?? []) as AngsuranRow[]);
      setLoading(false);
    })();
  }, [reloadKey]);

  const enriched = useMemo(() => {
    return nasabah.map((n) => {
      const angs = angsuran.filter((a) => a.nasabah_id === n.id);
      const stats = hitungStats(n, angs);
      return { n, stats, badge: statusBadge(stats), terbayarCount: angs.filter((x) => x.status_bayar === "dibayar").length };
    });
  }, [nasabah, angsuran]);

  const filtered = useMemo(() => {
    return enriched.filter(({ n, stats, badge }) => {
      if (search && !n.nama.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "lunas" && !stats.lunas) return false;
      if (filter === "aktif" && (stats.lunas || badge.tone === "danger")) return false;
      if (filter === "terlambat" && badge.tone !== "danger") return false;
      return true;
    });
  }, [enriched, search, filter]);

  return (
    <AppShell session={session}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand">Nasabah</p>
          <h1 className="font-serif text-3xl font-bold mt-1">Daftar Nasabah</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} dari {nasabah.length} nasabah</p>
        </div>
        {canEdit(session) && (
          <div className="flex gap-2">
            <Link to="/import"><Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Import Excel</Button></Link>
            <TambahNasabahDialog onCreated={() => setReloadKey((k) => k + 1)} />
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama nasabah..."
            className="pl-9 h-11"
          />
        </div>
        <div className="flex gap-2">
          {(["semua", "aktif", "terlambat", "lunas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-xl px-4 py-2 text-sm font-medium border transition-colors capitalize " +
                (filter === f
                  ? "bg-gradient-brand text-primary-foreground border-transparent shadow-elegant"
                  : "border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ n, stats, badge, terbayarCount }) => (
            <Link
              key={n.id}
              to="/nasabah/$id"
              params={{ id: n.id }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card hover:border-brand/50 hover:shadow-elegant transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground font-bold">
                  {initials(n.nama)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold truncate">{n.nama}</div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition" />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{n.item_dibeli}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Angsuran ke-{terbayarCount} dari {n.jumlah_angsuran}</span>
                <span className="font-semibold text-foreground">{Math.round(stats.progress)}%</span>
              </div>
              <Progress value={stats.progress} className="h-2 mt-2" />

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sisa</div>
                  <div className="font-bold text-brand">{formatRp(stats.sisaNominal)}</div>
                </div>
                <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
