import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session, canEdit } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hitungStats, statusBadge } from "@/lib/calc";
import { formatRp } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Phone, Package, Calendar, Wallet,
  CheckCircle2, Circle, Loader2, Edit2, Save, X,
  Copy, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type NasabahRow = Tables<"nasabah">;
type AngsuranRow = Tables<"angsuran">;

export const Route = createFileRoute("/nasabah/$id")({
  beforeLoad: ({ params }) => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role === "customer") throw redirect({ to: "/customer" });
  },
  component: NasabahDetailPage,
});

function NasabahDetailPage() {
  const { id } = Route.useParams();
  const session = getSession() as Session;
  const [nasabah, setNasabah] = useState<NasabahRow | null>(null);
  const [angsuran, setAngsuran] = useState<AngsuranRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<NasabahRow>>({});

  const loadData = async () => {
    setLoading(true);
    const [{ data: n }, { data: a }] = await Promise.all([
      supabase.from("nasabah").select("*").eq("id", id).maybeSingle(),
      supabase.from("angsuran").select("*").eq("nasabah_id", id).order("nomor_angsuran"),
    ]);
    if (n) {
      setNasabah(n);
      setEditData(n);
    }
    setAngsuran((a ?? []) as AngsuranRow[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  // Generate jadwal angsuran (semua slot, dibayar atau belum)
  const jadwal = nasabah
    ? Array.from({ length: nasabah.jumlah_angsuran }, (_, i) => {
        const no = i + 1;
        const existing = angsuran.find((a) => a.nomor_angsuran === no);
        return { no, angsuran: existing ?? null };
      })
    : [];

  const toggleBayar = async (no: number, existing: AngsuranRow | null) => {
    if (!nasabah || !canEdit(session)) return;
    setSaving(`${no}`);
    try {
      if (existing) {
        // Toggle status
        const newStatus = existing.status_bayar === "dibayar" ? "belum" : "dibayar";
        const { error } = await supabase
          .from("angsuran")
          .update({ status_bayar: newStatus, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success(newStatus === "dibayar" ? `Angsuran ke-${no} ditandai lunas` : `Angsuran ke-${no} dibatalkan`);
      } else {
        // Buat baru sebagai dibayar
        const { error } = await supabase.from("angsuran").insert({
          nasabah_id: nasabah.id,
          nomor_angsuran: no,
          rp: nasabah.rp_per_angsuran,
          tanggal: new Date().toISOString().slice(0, 10),
          status_bayar: "dibayar",
        });
        if (error) throw error;
        toast.success(`Angsuran ke-${no} ditandai lunas`);
      }
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(null);
    }
  };

  const saveEdit = async () => {
    if (!nasabah) return;
    setSaving("edit");
    try {
      const { error } = await supabase
        .from("nasabah")
        .update({
          nama: editData.nama,
          item_dibeli: editData.item_dibeli,
          whatsapp: editData.whatsapp,
          status: editData.status,
          username: editData.username,
          password: editData.password,
        })
        .eq("id", nasabah.id);
      if (error) throw error;
      toast.success("Data nasabah diperbarui");
      setEditMode(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <AppShell session={session}>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </AppShell>
    );
  }

  if (!nasabah) {
    return (
      <AppShell session={session}>
        <div className="text-center py-20 text-muted-foreground">Nasabah tidak ditemukan</div>
      </AppShell>
    );
  }

  const stats = hitungStats(nasabah, angsuran);
  const badge = statusBadge(stats);
  const terbayar = angsuran.filter((a) => a.status_bayar === "dibayar").length;

  return (
    <AppShell session={session}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link to="/nasabah">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Kartu info nasabah */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground font-bold text-xl">
                {nasabah.nama.slice(0, 2).toUpperCase()}
              </div>
              {canEdit(session) && !editMode && (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {editMode && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={saving === "edit"} className="bg-gradient-brand text-primary-foreground">
                    {saving === "edit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="space-y-2">
                <Input value={editData.nama ?? ""} onChange={(e) => setEditData({ ...editData, nama: e.target.value })} placeholder="Nama" />
                <Input value={editData.item_dibeli ?? ""} onChange={(e) => setEditData({ ...editData, item_dibeli: e.target.value })} placeholder="Item" />
                <Input value={editData.whatsapp ?? ""} onChange={(e) => setEditData({ ...editData, whatsapp: e.target.value })} placeholder="WhatsApp" />
                <select
                  value={editData.status ?? "aktif"}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="aktif">Aktif</option>
                  <option value="lunas">Lunas</option>
                  <option value="macet">Macet</option>
                </select>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-xl font-bold">{nasabah.nama}</h2>
                <div className="mt-1 mb-3"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4 shrink-0" />
                    <span>{nasabah.item_dibeli}</span>
                  </div>
                  {nasabah.whatsapp && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`https://wa.me/${nasabah.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-brand">
                        {nasabah.whatsapp}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Mulai {nasabah.tgl_mulai}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span>{formatRp(nasabah.rp_per_angsuran)}/angsuran</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Progress */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-bold">{terbayar}/{nasabah.jumlah_angsuran}</span>
            </div>
            <Progress value={stats.progress} className="h-3" />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Sudah Bayar</div>
                <div className="font-bold text-success">{formatRp(terbayar * nasabah.rp_per_angsuran)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Sisa</div>
                <div className="font-bold text-brand">{formatRp(stats.sisaNominal)}</div>
              </div>
              {nasabah.uang_muka > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Uang Muka</div>
                  <div className="font-bold">{formatRp(nasabah.uang_muka)}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Total Kredit</div>
                <div className="font-bold">{formatRp(nasabah.rp_per_angsuran * nasabah.jumlah_angsuran)}</div>
              </div>
            </div>
          </div>

          {/* Akun login */}
          {canEdit(session) && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Akun Login Nasabah</h3>
              {editMode ? (
                <div className="space-y-2">
                  <Input value={editData.username ?? ""} onChange={(e) => setEditData({ ...editData, username: e.target.value })} placeholder="Username" />
                  <Input value={editData.password ?? ""} onChange={(e) => setEditData({ ...editData, password: e.target.value })} placeholder="Password" />
                </div>
              ) : (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Username</span>
                    <div className="flex items-center gap-2">
                      <span>{nasabah.username ?? "—"}</span>
                      {nasabah.username && (
                        <button onClick={() => { navigator.clipboard.writeText(nasabah.username!); toast.success("Disalin"); }}>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Password</span>
                    <div className="flex items-center gap-2">
                      <span>{showPw ? nasabah.password : "••••••••"}</span>
                      <button onClick={() => setShowPw(!showPw)}>
                        {showPw ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      {nasabah.password && (
                        <button onClick={() => { navigator.clipboard.writeText(nasabah.password!); toast.success("Disalin"); }}>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Jadwal angsuran */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">
              Jadwal Angsuran
              {canEdit(session) && (
                <span className="text-xs text-muted-foreground font-normal ml-2">— klik untuk tandai lunas/batal</span>
              )}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {jadwal.map(({ no, angsuran: a }) => {
                const dibayar = a?.status_bayar === "dibayar";
                const isSaving = saving === `${no}`;
                return (
                  <button
                    key={no}
                    onClick={() => toggleBayar(no, a)}
                    disabled={!canEdit(session) || isSaving}
                    className={
                      "relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all " +
                      (dibayar
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-brand/40 hover:bg-brand/5") +
                      (!canEdit(session) ? " cursor-default" : " cursor-pointer")
                    }
                  >
                    {isSaving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : dibayar ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                    <span className="text-xs font-medium mt-1">ke-{no}</span>
                    {dibayar && a?.tanggal && (
                      <span className="text-[10px] opacity-70 mt-0.5">{a.tanggal}</span>
                    )}
                    {dibayar && (
                      <span className="text-[10px] font-bold mt-0.5">
                        {formatRp(a?.rp ?? nasabah.rp_per_angsuran)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ringkasan */}
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">{terbayar} lunas</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{nasabah.jumlah_angsuran - terbayar} belum</span>
              </div>
              {stats.terlambat > 0 && (
                <div className="text-destructive font-medium">
                  {stats.terlambat} angsuran terlambat
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}