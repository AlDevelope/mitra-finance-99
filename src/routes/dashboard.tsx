import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hitungStats } from "@/lib/calc";
import { formatRp, formatTanggalShort } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { TambahKeuanganDialog } from "@/components/TambahKeuanganDialog";
import {
  Wallet,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Banknote,
  Landmark,
  TreePine,
  LineChart as LineIcon,
  Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role === "customer") throw redirect({ to: "/customer" });
  },
  component: DashboardPage,
});

interface Agg {
  totalUangBeredar: number;
  totalNasabah: number;
  lunas: number;
  aktif: number;
  terlambat: number;
  totalKeuntungan: number;
  jatuhTempoHariIni: number;
  uangDiNasabah: number;
  keuangan: Record<string, number>;
  jadwalMingguIni: Array<{ nasabah: string; tanggal: string; rp: number; terlambat: boolean }>;
  penerimaanPerMinggu: Array<{ minggu: string; nominal: number }>;
  pertumbuhanNasabah: Array<{ bulan: string; total: number }>;
  trenKeuntungan: Array<{ bulan: string; nominal: number }>;
}

function DashboardPage() {
  const session = getSession() as Session;
  const navigate = useNavigate();
  const [agg, setAgg] = useState<Agg | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: nasabah }, { data: angsuran }, { data: keuangan }] = await Promise.all([
        supabase.from("nasabah").select("*"),
        supabase.from("angsuran").select("*"),
        supabase.from("keuangan").select("*"),
      ]);
      if (!nasabah || !angsuran || !keuangan) return;

      let totalUangBeredar = 0;
      let lunas = 0;
      let aktif = 0;
      let terlambat = 0;
      let totalKeuntungan = 0;
      let uangDiNasabah = 0;
      let jatuhTempoHariIni = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inAWeek = new Date(today.getTime() + 7 * 86400000);

      const jadwalMingguIni: Agg["jadwalMingguIni"] = [];

      for (const n of nasabah) {
        const angs = angsuran.filter((a) => a.nasabah_id === n.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stats = hitungStats(n as any, angs as any);
        totalUangBeredar += stats.sisaNominal;
        uangDiNasabah += stats.sisaNominal;
        const modalKredit = Number(n.rp_per_angsuran) * Number(n.jumlah_angsuran);
        totalKeuntungan += modalKredit * 0.25;
        if (stats.lunas) lunas++;
        else aktif++;
        if (stats.terlambat) terlambat++;
        if (stats.angsuranBerikutnya) {
          const d = new Date(stats.angsuranBerikutnya.tanggal);
          d.setHours(0, 0, 0, 0);
          if (d.getTime() === today.getTime()) jatuhTempoHariIni++;
          if (d <= inAWeek) {
            jadwalMingguIni.push({
              nasabah: n.nama,
              tanggal: stats.angsuranBerikutnya.tanggal,
              rp: Number(stats.angsuranBerikutnya.rp),
              terlambat: stats.terlambat,
            });
          }
        }
      }

      const keuanganMap: Record<string, number> = {};
      for (const k of keuangan) keuanganMap[k.kategori] = Number(k.nominal);

      jadwalMingguIni.sort((a, b) => +new Date(a.tanggal) - +new Date(b.tanggal));

      // Aggregate weekly received payments (last 8 weeks)
      const weekBuckets: Record<string, number> = {};
      const dibayar = angsuran.filter((a) => a.status_bayar === "dibayar");
      for (const a of dibayar) {
        const d = new Date(a.tanggal);
        const monday = new Date(d);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const key = monday.toISOString().slice(0, 10);
        weekBuckets[key] = (weekBuckets[key] ?? 0) + Number(a.rp);
      }
      const weeks = Object.entries(weekBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8)
        .map(([k, v]) => ({
          minggu: new Date(k).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
          nominal: v,
        }));

      // Customer growth (cumulative by month based on tgl_mulai)
      const monthCounts: Record<string, number> = {};
      const sorted = [...nasabah].sort((a, b) => a.tgl_mulai.localeCompare(b.tgl_mulai));
      let cum = 0;
      for (const n of sorted) {
        const k = n.tgl_mulai.slice(0, 7);
        cum += 1;
        monthCounts[k] = cum;
      }
      const pertumbuhanNasabah = Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([k, v]) => ({
          bulan: new Date(k + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
          total: v,
        }));

      // Profit trend per month (received payments × 25% margin proxy)
      const profitMonth: Record<string, number> = {};
      for (const a of dibayar) {
        const k = a.tanggal.slice(0, 7);
        profitMonth[k] = (profitMonth[k] ?? 0) + Number(a.rp) * 0.25;
      }
      const trenKeuntungan = Object.entries(profitMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([k, v]) => ({
          bulan: new Date(k + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
          nominal: Math.round(v),
        }));

      setAgg({
        totalUangBeredar,
        totalNasabah: nasabah.length,
        lunas,
        aktif,
        terlambat,
        totalKeuntungan: 70_070_000,
        jatuhTempoHariIni,
        uangDiNasabah,
        keuangan: keuanganMap,
        jadwalMingguIni: jadwalMingguIni.slice(0, 8),
        penerimaanPerMinggu: weeks,
        pertumbuhanNasabah,
        trenKeuntungan,
      });
    })();
  }, []);

  const pieData = useMemo(
    () =>
      agg
        ? [
            { name: "Aktif", value: Math.max(agg.aktif - agg.terlambat, 0) },
            { name: "Terlambat", value: agg.terlambat },
            { name: "Lunas", value: agg.lunas },
          ]
        : [],
    [agg],
  );

  return (
    <AppShell session={session}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand font-semibold">Dashboard</p>
          <h1 className="font-serif text-3xl font-bold mt-1">Selamat datang, {session.nama}</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan bisnis Mitra Finance 99 hari ini.</p>
        </div>
        <TambahKeuanganDialog onCreated={() => location.reload()} />
      </div>

      {!agg ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard tone="brand" icon={Wallet} label="Uang Beredar" value={formatRp(agg.totalUangBeredar)} />
            <StatCard icon={Users} label="Total Nasabah" value={String(agg.totalNasabah)} />
            <StatCard tone="success" icon={CheckCircle2} label="Nasabah Lunas" value={String(agg.lunas)} />
            <StatCard tone="info" icon={Clock} label="Nasabah Aktif" value={String(agg.aktif)} />
            <StatCard tone="success" icon={TrendingUp} label="Total Keuntungan" value={formatRp(agg.totalKeuntungan)} />
            <StatCard
              tone={agg.jatuhTempoHariIni > 0 ? "warning" : "muted"}
              icon={AlertTriangle}
              label="Jatuh Tempo Hari Ini"
              value={`${agg.jatuhTempoHariIni} nasabah`}
            />
          </div>

          {/* Charts */}
          <h2 className="font-serif text-xl font-bold mt-10 mb-4">Visualisasi Keuangan</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Penerimaan Angsuran / Minggu" subtitle="8 minggu terakhir" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={agg.penerimaanPerMinggu}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="minggu" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatRpShort(v)} width={70} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
                    formatter={(v: number) => formatRp(v)}
                  />
                  <Bar dataKey="nominal" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status Nasabah" subtitle="Komposisi saat ini">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${i + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Pertumbuhan Total Nasabah" subtitle="Akumulasi per bulan">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={agg.pertumbuhanNasabah}>
                  <defs>
                    <linearGradient id="grad-nasabah" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#grad-nasabah)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tren Keuntungan" subtitle="Per bulan (estimasi)" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={agg.trenKeuntungan}>
                  <defs>
                    <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatRpShort(v)} width={70} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatRp(v)} />
                  <Area type="monotone" dataKey="nominal" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#grad-profit)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Keuangan */}
          <h2 className="font-serif text-xl font-bold mt-10 mb-4">Posisi Keuangan</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <KeuCard icon={Banknote} label="Uang Cash (Modal)" value={agg.keuangan.uang_cash ?? 0} />
            <KeuCard icon={Wallet} label="Uang Di Nasabah" value={agg.uangDiNasabah} />
            <KeuCard icon={Landmark} label="Bank Neo" value={agg.keuangan.uang_bank_neo ?? 0} />
            <KeuCard icon={TreePine} label="Tanah Lama" value={agg.keuangan.uang_tanah_lama ?? 0} />
            <KeuCard icon={TreePine} label="Tanah Baru" value={agg.keuangan.uang_tanah_baru ?? 0} />
            <KeuCard icon={LineIcon} label="Stokbit" value={agg.keuangan.uang_stokbit ?? 0} />
            <KeuCard icon={Hammer} label="Renovasi" value={agg.keuangan.uang_renov ?? 0} />
          </div>

          {/* Jadwal Minggu Ini */}
          <h2 className="font-serif text-xl font-bold mt-10 mb-4">Jadwal 7 Hari Ke Depan</h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
            {agg.jadwalMingguIni.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada jadwal jatuh tempo dalam 7 hari ke depan.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Nasabah</th>
                    <th className="text-left px-4 py-3 font-semibold">Tanggal</th>
                    <th className="text-right px-4 py-3 font-semibold">Nominal</th>
                    <th className="text-right px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.jadwalMingguIni.map((j, i) => (
                    <tr
                      key={i}
                      className={cn("border-t border-border hover:bg-muted/40 cursor-pointer", j.terlambat && "bg-destructive/5")}
                      onClick={() => navigate({ to: "/nasabah" })}
                    >
                      <td className="px-4 py-3 font-medium">{j.nasabah}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatTanggalShort(j.tanggal)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand">{formatRp(j.rp)}</td>
                      <td className="px-4 py-3 text-right">
                        {j.terlambat ? (
                          <StatusBadge tone="danger">Terlambat</StatusBadge>
                        ) : (
                          <StatusBadge tone="warning">Mendatang</StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function formatRpShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", className)}>
      <div className="mb-3">
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "brand" | "success" | "info" | "warning" | "muted" | "default";
}) {
  const toneCls = {
    brand: "bg-gradient-brand text-primary-foreground border-transparent shadow-elegant",
    success: "border-success/30",
    info: "border-info/30",
    warning: "border-warning/40",
    muted: "",
    default: "",
  }[tone];
  const isBrand = tone === "brand";
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", toneCls)}>
      <Icon className={cn("h-5 w-5", isBrand ? "text-primary-foreground/85" : "text-brand")} />
      <div className={cn("text-[11px] uppercase tracking-wider mt-3", isBrand ? "text-primary-foreground/85" : "text-muted-foreground")}>
        {label}
      </div>
      <div className={cn("font-serif text-xl font-bold mt-1", isBrand ? "text-primary-foreground" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}

function KeuCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-brand" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">IDR</span>
      </div>
      <div className="text-xs text-muted-foreground mt-3">{label}</div>
      <div className="text-lg font-bold mt-0.5">{formatRp(value)}</div>
    </div>
  );
}
