import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onCreated: () => void;
}

function formatRpInput(val: string): string {
  const num = val.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("id-ID");
}

function parseRp(val: string): number {
  return parseInt(val.replace(/\D/g, "") || "0", 10);
}

function generateUsername(nama: string): string {
  return nama.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
}

export function TambahNasabahDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [showKeuangan, setShowKeuangan] = useState(false);
  const [showAkun, setShowAkun] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [nama, setNama] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [item, setItem] = useState("");
  const [uangMukaStr, setUangMukaStr] = useState("");
  const [jumlahAngsuran, setJumlahAngsuran] = useState("10");
  const [rpAngsuranStr, setRpAngsuranStr] = useState("");
  const [tglMulai, setTglMulai] = useState(new Date().toISOString().slice(0, 10));
  const [frekuensi, setFrekuensi] = useState("Mingguan");
  const [modalStr, setModalStr] = useState("");
  const [margin, setMargin] = useState("25");
  const [catatKeuangan, setCatatKeuangan] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const uangMuka = parseRp(uangMukaStr);
  const rpAngsuran = parseRp(rpAngsuranStr);
  const jml = parseInt(jumlahAngsuran || "0", 10);
  const totalKredit = rpAngsuran * jml;
  const modal = parseRp(modalStr);
  const estimasiUntung = modal > 0 ? totalKredit - modal - uangMuka : 0;

  const reset = () => {
    setNama(""); setWhatsapp(""); setItem("");
    setUangMukaStr(""); setJumlahAngsuran("10"); setRpAngsuranStr("");
    setTglMulai(new Date().toISOString().slice(0, 10)); setFrekuensi("Mingguan");
    setModalStr(""); setMargin("25"); setCatatKeuangan(true);
    setUsername(""); setPassword("");
    setShowKeuangan(false); setShowAkun(false);
  };

  const handleNamaChange = (v: string) => {
    setNama(v);
    if (!username) setUsername(generateUsername(v));
    if (!password) setPassword(generateUsername(v) + "123");
  };

  const handleSubmit = async () => {
    if (!nama.trim()) return toast.error("Nama wajib diisi");
    if (!item.trim()) return toast.error("Item wajib diisi");
    if (!jml || jml < 1) return toast.error("Jumlah angsuran wajib diisi");
    if (!rpAngsuran || rpAngsuran < 1) return toast.error("Rp/Angsuran wajib diisi");

    setLoading(true);
    try {
      const finalUsername = username.trim() || generateUsername(nama);
      const finalPassword = password.trim() || finalUsername + "123";

      const { error } = await supabase.from("nasabah").insert({
        nama: nama.trim(),
        item_dibeli: item.trim(),
        uang_muka: uangMuka,
        jumlah_angsuran: jml,
        rp_per_angsuran: rpAngsuran,
        tgl_mulai: tglMulai,
        status: "aktif",
        whatsapp: whatsapp.trim() || null,
        username: finalUsername,
        password: finalPassword,
      });

      if (error) throw error;

      // Catat ke keuangan jika diaktifkan
      if (catatKeuangan && modal > 0) {
        await supabase.from("keuangan").insert([
          { kategori: "uang_dipinjamkan", nominal: modal, keterangan: `Modal ${nama}`, tanggal: tglMulai },
          ...(uangMuka > 0 ? [{ kategori: "uang_cash", nominal: uangMuka, keterangan: `DP ${nama}`, tanggal: tglMulai }] : []),
        ]);
      }

      toast.success(`Nasabah ${nama} berhasil ditambahkan — login: ${finalUsername} / ${finalPassword}`);
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Tambah Nasabah
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Nasabah Baru</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Info dasar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input placeholder="cth. Budi Santoso" value={nama} onChange={(e) => handleNamaChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input placeholder="628xxxxxxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Item / Barang Dibeli *</Label>
            <Input placeholder="cth. Motor Honda Beat 2024" value={item} onChange={(e) => setItem(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Uang Muka (DP)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <Input
                  className="pl-8"
                  placeholder="0"
                  value={uangMukaStr}
                  onChange={(e) => setUangMukaStr(formatRpInput(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah Angsuran *</Label>
              <Input type="number" min={1} placeholder="10" value={jumlahAngsuran} onChange={(e) => setJumlahAngsuran(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rp / Angsuran *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <Input
                  className="pl-8"
                  placeholder="0"
                  value={rpAngsuranStr}
                  onChange={(e) => setRpAngsuranStr(formatRpInput(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Frekuensi Angsuran</Label>
              <select
                value={frekuensi}
                onChange={(e) => setFrekuensi(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Mingguan</option>
                <option>Bulanan</option>
              </select>
            </div>
          </div>

          {/* Keuangan section */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => setShowKeuangan(!showKeuangan)}
            >
              <span className="uppercase tracking-wider text-xs text-muted-foreground">Keuangan</span>
              {showKeuangan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showKeuangan && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Harga Pokok Barang (modal)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                      <Input className="pl-8" placeholder="0" value={modalStr} onChange={(e) => setModalStr(formatRpInput(e.target.value))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Margin Keuntungan (%)</Label>
                    <Input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={catatKeuangan} onChange={(e) => setCatatKeuangan(e.target.checked)} className="rounded" />
                  Catat modal & DP otomatis ke pos keuangan
                </label>
              </div>
            )}
          </div>

          {/* Akun login */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => setShowAkun(!showAkun)}
            >
              <span className="text-sm">► Akun Login (opsional, otomatis jika kosong)</span>
              {showAkun ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAkun && (
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input placeholder="otomatis dari nama" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input placeholder="otomatis dari username" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {rpAngsuran > 0 && jml > 0 && (
            <div className="rounded-xl bg-muted/30 border border-border p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Total Kredit</div>
                <div className="font-bold text-brand text-base">Rp {totalKredit.toLocaleString("id-ID")}</div>
              </div>
              {modal > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Estimasi Untung</div>
                  <div className="font-bold text-success text-base">Rp {estimasiUntung.toLocaleString("id-ID")}</div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-brand text-primary-foreground"
            >
              {loading ? "Menyimpan..." : "Simpan & Buat Akun"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}