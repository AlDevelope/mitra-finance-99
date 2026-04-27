import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { buatNasabahLengkap, type Frekuensi } from "@/lib/nasabah-helpers";
import { formatRp } from "@/lib/format";

interface Props {
  onCreated?: () => void;
}

export function TambahNasabahDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<{ username: string; password: string; nama: string } | null>(null);

  const [form, setForm] = useState({
    nama: "",
    item_dibeli: "",
    uang_muka: 0,
    jumlah_angsuran: 10,
    rp_per_angsuran: 100000,
    tgl_mulai: new Date().toISOString().slice(0, 10),
    whatsapp: "",
    frekuensi: "mingguan" as Frekuensi,
    marginPersen: 25,
    catatModalKePosKeuangan: true,
    hargaPokok: 0,
    usernameCustom: "",
    passwordCustom: "",
  });

  const totalKredit = form.jumlah_angsuran * form.rp_per_angsuran + Number(form.uang_muka || 0);
  const estimasiUntung = form.hargaPokok > 0
    ? totalKredit - form.hargaPokok
    : (form.jumlah_angsuran * form.rp_per_angsuran) * (form.marginPersen / 100);

  const reset = () => {
    setForm({
      nama: "", item_dibeli: "", uang_muka: 0, jumlah_angsuran: 10,
      rp_per_angsuran: 100000, tgl_mulai: new Date().toISOString().slice(0, 10),
      whatsapp: "", frekuensi: "mingguan", marginPersen: 25,
      catatModalKePosKeuangan: true, hargaPokok: 0, usernameCustom: "", passwordCustom: "",
    });
    setHasil(null);
  };

  const submit = async () => {
    if (!form.nama.trim() || !form.item_dibeli.trim()) {
      toast.error("Nama & item harus diisi");
      return;
    }
    if (form.jumlah_angsuran < 1 || form.rp_per_angsuran < 1) {
      toast.error("Jumlah & nominal angsuran harus > 0");
      return;
    }
    setLoading(true);
    try {
      const res = await buatNasabahLengkap({
        nama: form.nama.trim(),
        item_dibeli: form.item_dibeli.trim(),
        uang_muka: Number(form.uang_muka) || 0,
        jumlah_angsuran: Number(form.jumlah_angsuran),
        rp_per_angsuran: Number(form.rp_per_angsuran),
        tgl_mulai: form.tgl_mulai,
        whatsapp: form.whatsapp || null,
        frekuensi: form.frekuensi,
        marginPersen: Number(form.marginPersen) || 0,
        catatModalKePosKeuangan: form.catatModalKePosKeuangan,
        hargaPokok: Number(form.hargaPokok) || 0,
        username: form.usernameCustom || undefined,
        password: form.passwordCustom || undefined,
      });
      setHasil({ username: res.username, password: res.password, nama: res.nasabah.nama });
      toast.success("Nasabah berhasil ditambahkan");
      onCreated?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyAkun = () => {
    if (!hasil) return;
    navigator.clipboard.writeText(`Username: ${hasil.username}\nPassword: ${hasil.password}`);
    toast.success("Akun disalin");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Nasabah</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hasil ? "Nasabah Berhasil Dibuat" : "Tambah Nasabah Baru"}</DialogTitle>
        </DialogHeader>

        {hasil ? (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-brand bg-brand/5 p-5">
              <div className="flex items-center gap-2 text-brand">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">{hasil.nama}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Username:</span><span className="font-mono font-bold">{hasil.username}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Password:</span><span className="font-mono font-bold">{hasil.password}</span></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Berikan akun ini ke nasabah agar bisa login & melihat tagihannya.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyAkun} className="gap-2 flex-1"><Copy className="h-4 w-4" /> Salin Akun</Button>
              <Button onClick={() => { reset(); }} className="flex-1">Tambah Lagi</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Tutup</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Lengkap *">
                <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth. Budi Santoso" />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="628xxx" />
              </Field>
            </div>
            <Field label="Item / Barang Dibeli *">
              <Input value={form.item_dibeli} onChange={(e) => setForm({ ...form, item_dibeli: e.target.value })} placeholder="cth. Motor Honda Beat 2024" />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Uang Muka (DP)">
                <Input type="number" value={form.uang_muka} onChange={(e) => setForm({ ...form, uang_muka: Number(e.target.value) })} />
              </Field>
              <Field label="Jumlah Angsuran *">
                <Input type="number" value={form.jumlah_angsuran} onChange={(e) => setForm({ ...form, jumlah_angsuran: Number(e.target.value) })} />
              </Field>
              <Field label="Rp / Angsuran *">
                <Input type="number" value={form.rp_per_angsuran} onChange={(e) => setForm({ ...form, rp_per_angsuran: Number(e.target.value) })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal Mulai">
                <Input type="date" value={form.tgl_mulai} onChange={(e) => setForm({ ...form, tgl_mulai: e.target.value })} />
              </Field>
              <Field label="Frekuensi Angsuran">
                <Select value={form.frekuensi} onValueChange={(v) => setForm({ ...form, frekuensi: v as Frekuensi })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harian">Harian</SelectItem>
                    <SelectItem value="mingguan">Mingguan (default)</SelectItem>
                    <SelectItem value="bulanan">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keuangan</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Harga Pokok Barang (modal)">
                  <Input type="number" value={form.hargaPokok} onChange={(e) => setForm({ ...form, hargaPokok: Number(e.target.value) })} placeholder="Kosongkan jika pakai % margin" />
                </Field>
                <Field label="Margin Keuntungan (%)">
                  <Input type="number" value={form.marginPersen} onChange={(e) => setForm({ ...form, marginPersen: Number(e.target.value) })} disabled={form.hargaPokok > 0} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.catatModalKePosKeuangan} onCheckedChange={(v) => setForm({ ...form, catatModalKePosKeuangan: !!v })} />
                Catat modal & DP otomatis ke pos keuangan
              </label>
            </div>

            <details className="rounded-xl border border-border p-4">
              <summary className="cursor-pointer text-sm font-semibold">Akun Login (opsional, otomatis jika kosong)</summary>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Username Custom">
                  <Input value={form.usernameCustom} onChange={(e) => setForm({ ...form, usernameCustom: e.target.value })} placeholder="auto" />
                </Field>
                <Field label="Password Custom">
                  <Input value={form.passwordCustom} onChange={(e) => setForm({ ...form, passwordCustom: e.target.value })} placeholder="auto" />
                </Field>
              </div>
            </details>

            <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-muted-foreground text-xs">Total Kredit</div><div className="font-bold text-brand">{formatRp(totalKredit)}</div></div>
              <div><div className="text-muted-foreground text-xs">Estimasi Untung</div><div className="font-bold text-success">{formatRp(estimasiUntung)}</div></div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={submit} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan & Buat Akun
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
