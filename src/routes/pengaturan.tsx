import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Building2,
  KeyRound,
  Users,
  Palette,
  Download,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  Copy,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/pengaturan")({
  beforeLoad: () => {
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role === "customer") throw redirect({ to: "/customer" });
  },
  component: PengaturanPage,
});

const BIZ_KEY = "mf99_biz_info";

interface BizInfo {
  nama: string;
  tagline: string;
  alamat: string;
  whatsapp: string;
  email: string;
  catatan: string;
}

const DEFAULT_BIZ: BizInfo = {
  nama: "Mitra Finance 99",
  tagline: "Berkembang · Bertumbuh · Berinovasi",
  alamat: "",
  whatsapp: "",
  email: "",
  catatan: "Terima kasih telah mempercayakan kredit Anda kepada kami.",
};

function PengaturanPage() {
  const session = getSession() as Session;

  return (
    <AppShell session={session}>
      <p className="text-xs uppercase tracking-[0.3em] text-brand">Pengaturan</p>
      <h1 className="font-serif text-3xl font-bold mt-1">Pengaturan</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Kelola profil bisnis, akun nasabah, tema, backup data, dan keamanan.
      </p>

      <Tabs defaultValue="bisnis" className="mt-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="bisnis"><Building2 className="h-4 w-4 mr-1.5" />Profil Bisnis</TabsTrigger>
          <TabsTrigger value="akun"><Users className="h-4 w-4 mr-1.5" />Akun Nasabah</TabsTrigger>
          <TabsTrigger value="keamanan"><KeyRound className="h-4 w-4 mr-1.5" />Keamanan</TabsTrigger>
          <TabsTrigger value="tema"><Palette className="h-4 w-4 mr-1.5" />Tampilan</TabsTrigger>
          <TabsTrigger value="backup"><Download className="h-4 w-4 mr-1.5" />Backup</TabsTrigger>
          {session.role === "super_admin" && (
            <TabsTrigger value="bahaya"><AlertTriangle className="h-4 w-4 mr-1.5" />Zona Bahaya</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="bisnis" className="mt-4"><ProfilBisnis /></TabsContent>
        <TabsContent value="akun" className="mt-4"><AkunNasabah /></TabsContent>
        <TabsContent value="keamanan" className="mt-4"><Keamanan session={session} /></TabsContent>
        <TabsContent value="tema" className="mt-4"><Tampilan /></TabsContent>
        <TabsContent value="backup" className="mt-4"><BackupExport /></TabsContent>
        {session.role === "super_admin" && (
          <TabsContent value="bahaya" className="mt-4"><ZonaBahaya /></TabsContent>
        )}
      </Tabs>
    </AppShell>
  );
}

/* ---------------------- Profil Bisnis ---------------------- */
function ProfilBisnis() {
  const [biz, setBiz] = useState<BizInfo>(DEFAULT_BIZ);

  useEffect(() => {
    const raw = localStorage.getItem(BIZ_KEY);
    if (raw) {
      try { setBiz({ ...DEFAULT_BIZ, ...JSON.parse(raw) }); } catch { /* noop */ }
    }
  }, []);

  const save = () => {
    localStorage.setItem(BIZ_KEY, JSON.stringify(biz));
    toast.success("Profil bisnis disimpan");
  };

  return (
    <Card title="Informasi Bisnis" desc="Data ini muncul di pesan WhatsApp & header tagihan.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nama Bisnis"><Input value={biz.nama} onChange={(e) => setBiz({ ...biz, nama: e.target.value })} /></Field>
        <Field label="Tagline"><Input value={biz.tagline} onChange={(e) => setBiz({ ...biz, tagline: e.target.value })} /></Field>
        <Field label="WhatsApp Bisnis"><Input placeholder="628xxxxxxxxxx" value={biz.whatsapp} onChange={(e) => setBiz({ ...biz, whatsapp: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} /></Field>
        <Field label="Alamat" full><Input value={biz.alamat} onChange={(e) => setBiz({ ...biz, alamat: e.target.value })} /></Field>
        <Field label="Catatan kaki tagihan" full><Input value={biz.catatan} onChange={(e) => setBiz({ ...biz, catatan: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={save} className="bg-gradient-brand text-primary-foreground"><Save className="h-4 w-4 mr-1" /> Simpan</Button>
      </div>
    </Card>
  );
}

/* ---------------------- Akun Nasabah ---------------------- */
interface AkunRow { id: string; nama: string; username: string | null; password: string | null; whatsapp: string | null; }

function AkunNasabah() {
  const [rows, setRows] = useState<AkunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("nasabah").select("id, nama, username, password, whatsapp").order("nama");
      setRows((data ?? []) as AkunRow[]);
      setLoading(false);
    })();
  }, [reload]);

  const filtered = rows.filter((r) => r.nama.toLowerCase().includes(search.toLowerCase()) || (r.username ?? "").includes(search.toLowerCase()));

  const resetPw = async (row: AkunRow) => {
    const baru = (row.username ?? "user") + Math.floor(1000 + Math.random() * 9000);
    const { error } = await supabase.from("nasabah").update({ password: baru }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(`Password ${row.nama} direset: ${baru}`);
    setReload((k) => k + 1);
  };

  const exportCsv = () => {
    const header = "nama,username,password,whatsapp\n";
    const body = rows.map((r) => `"${r.nama}","${r.username ?? ""}","${r.password ?? ""}","${r.whatsapp ?? ""}"`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `akun-nasabah-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Daftar akun di-download");
  };

  return (
    <Card title="Akun Login Nasabah" desc="Lihat & kelola username/password nasabah. Klik mata untuk lihat password.">
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/username..." className="pl-9" />
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      {loading ? (
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Nama</th>
                  <th className="text-left px-3 py-2">Username</th>
                  <th className="text-left px-3 py-2">Password</th>
                  <th className="text-left px-3 py-2">WhatsApp</th>
                  <th className="text-right px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.nama}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.username ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span>{showPw[r.id] ? r.password : "••••••••"}</span>
                        <button onClick={() => setShowPw({ ...showPw, [r.id]: !showPw[r.id] })} className="text-muted-foreground hover:text-foreground">
                          {showPw[r.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        {r.password && (
                          <button onClick={() => { navigator.clipboard.writeText(r.password!); toast.success("Disalin"); }} className="text-muted-foreground hover:text-foreground">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.whatsapp ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => resetPw(r)}><RefreshCw className="h-3 w-3 mr-1" />Reset PW</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada akun</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------------------- Keamanan ---------------------- */
function Keamanan({ session }: { session: Session }) {
  return (
    <Card title="Akun Login Admin" desc="Username & password admin/owner di-hardcode di file source code.">
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
        <div><span className="text-muted-foreground">Login sebagai:</span> <b>{session.username}</b> ({session.role})</div>
        <div className="text-xs text-muted-foreground mt-3">
          Untuk mengganti password admin/owner, edit file <code className="bg-background px-1.5 py-0.5 rounded">src/lib/auth.ts</code>:
        </div>
        <pre className="bg-background border border-border rounded-lg p-3 text-xs overflow-x-auto">
{`const HARDCODED = {
  owner: { password: "GANTI_DI_SINI", role: "super_admin", nama: "Owner MF99" },
  admin: { password: "GANTI_DI_SINI", role: "admin", nama: "Admin MF99" },
};`}
        </pre>
        <p className="text-xs text-muted-foreground">
          Setelah diganti, push ke GitHub → Netlify auto-deploy ulang dalam ±2 menit.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs text-muted-foreground">
        <b className="text-warning">Tips Keamanan:</b>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Password minimal 12 karakter, kombinasi huruf+angka+simbol</li>
          <li>Jangan share kredensial owner ke admin</li>
          <li>Logout otomatis setelah 8 jam (dapat diubah di <code>SESSION_HOURS</code>)</li>
          <li>Backup database mingguan via tab <b>Backup</b></li>
        </ul>
      </div>
    </Card>
  );
}

/* ---------------------- Tampilan ---------------------- */
function Tampilan() {
  return (
    <Card title="Tema Tampilan" desc="Otomatis mengikuti tema sistem (HP/desktop). Bisa di-override manual.">
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <div className="font-semibold">Mode Gelap / Terang</div>
          <div className="text-xs text-muted-foreground mt-1">Klik untuk toggle. Disimpan di browser ini.</div>
        </div>
        <ThemeToggle />
      </div>
    </Card>
  );
}

/* ---------------------- Backup & Export ---------------------- */
function BackupExport() {
  const [busy, setBusy] = useState(false);

  const downloadJson = async () => {
    setBusy(true);
    const [{ data: nasabah }, { data: angsuran }, { data: keuangan }] = await Promise.all([
      supabase.from("nasabah").select("*"),
      supabase.from("angsuran").select("*"),
      supabase.from("keuangan").select("*"),
    ]);
    const dump = { exported_at: new Date().toISOString(), nasabah, angsuran, keuangan };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `mf99-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
    toast.success("Backup di-download");
  };

  const exportTable = async (table: "nasabah" | "angsuran" | "keuangan") => {
    setBusy(true);
    const { data } = await supabase.from(table).select("*");
    if (!data || data.length === 0) { setBusy(false); return toast.error("Tidak ada data"); }
    const headers = Object.keys(data[0]);
    const csv = headers.join(",") + "\n" + data.map((row) => headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? "")).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${table}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
    toast.success(`${table}.csv di-download`);
  };

  return (
    <Card title="Backup & Export Data" desc="Download semua data sebagai backup. Disarankan minimal 1x per minggu.">
      <div className="grid sm:grid-cols-2 gap-3">
        <Button disabled={busy} onClick={downloadJson} className="bg-gradient-brand text-primary-foreground h-auto py-4 flex-col gap-1">
          <Download className="h-5 w-5" />
          <span className="font-semibold">Backup Lengkap (JSON)</span>
          <span className="text-xs opacity-80">Semua tabel dalam 1 file</span>
        </Button>
        <div className="rounded-xl border border-border p-3 space-y-2">
          <div className="text-sm font-semibold mb-1">Export per Tabel (CSV)</div>
          <Button disabled={busy} variant="outline" size="sm" onClick={() => exportTable("nasabah")} className="w-full justify-start">
            <Download className="h-3.5 w-3.5 mr-2" /> Nasabah.csv
          </Button>
          <Button disabled={busy} variant="outline" size="sm" onClick={() => exportTable("angsuran")} className="w-full justify-start">
            <Download className="h-3.5 w-3.5 mr-2" /> Angsuran.csv
          </Button>
          <Button disabled={busy} variant="outline" size="sm" onClick={() => exportTable("keuangan")} className="w-full justify-start">
            <Download className="h-3.5 w-3.5 mr-2" /> Keuangan.csv
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------- Zona Bahaya ---------------------- */
function ZonaBahaya() {
  const [confirm, setConfirm] = useState("");

  const wipeAll = async () => {
    if (confirm !== "HAPUS SEMUA") return toast.error("Ketik 'HAPUS SEMUA' untuk konfirmasi");
    const { error: e1 } = await supabase.from("angsuran").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: e2 } = await supabase.from("keuangan").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: e3 } = await supabase.from("nasabah").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e1 || e2 || e3) return toast.error("Gagal menghapus sebagian data");
    toast.success("Semua data dihapus");
    setConfirm("");
  };

  return (
    <Card title="Zona Bahaya" desc="Aksi di sini permanen dan tidak bisa dibatalkan." danger>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="font-semibold text-destructive">Hapus Semua Data</div>
        <p className="text-xs text-muted-foreground mt-1">
          Menghapus semua nasabah, angsuran, dan catatan keuangan. Cocok untuk persiapan production setelah selesai testing.
          <b className="block mt-1">Backup dulu sebelum melakukan ini!</b>
        </p>

        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='Ketik: HAPUS SEMUA' />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={confirm !== "HAPUS SEMUA"}>
                <Trash2 className="h-4 w-4 mr-1" /> Hapus Semua
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Yakin hapus SEMUA data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Aksi ini permanen. Pastikan Anda sudah backup file JSON terlebih dahulu.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={wipeAll} className="bg-destructive hover:bg-destructive/90">Ya, hapus semua</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------- UI helpers ---------------------- */
function Card({ title, desc, children, danger }: { title: string; desc?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={"rounded-2xl border bg-card p-5 sm:p-6 " + (danger ? "border-destructive/30" : "border-border")}>
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={"space-y-1.5 " + (full ? "sm:col-span-2" : "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
