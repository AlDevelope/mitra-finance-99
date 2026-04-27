import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const KATEGORI = [
  { value: "pemasukan", label: "💰 Pemasukan", tipe: "in" },
  { value: "uang_muka", label: "🪙 Uang Muka", tipe: "in" },
  { value: "bayar_angsuran", label: "✅ Bayar Angsuran", tipe: "in" },
  { value: "modal_keluar", label: "📦 Modal / Beli Barang", tipe: "out" },
  { value: "operasional", label: "🛠 Operasional", tipe: "out" },
  { value: "gaji", label: "👤 Gaji", tipe: "out" },
  { value: "lainnya_keluar", label: "↗ Pengeluaran Lain", tipe: "out" },
];

interface Props { onCreated?: () => void }

export function TambahKeuanganDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: "pemasukan",
    nominal: 0,
    keterangan: "",
  });

  const submit = async () => {
    if (!form.nominal || form.nominal <= 0) return toast.error("Nominal harus > 0");
    setLoading(true);
    const { error } = await supabase.from("keuangan").insert(form);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Transaksi keuangan tercatat");
    setForm({ tanggal: new Date().toISOString().slice(0, 10), kategori: "pemasukan", nominal: 0, keterangan: "" });
    setOpen(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Wallet className="h-4 w-4" /> Catat Keuangan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Catat Transaksi Keuangan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Kategori</Label>
              <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Nominal (Rp)</Label>
            <Input type="number" value={form.nominal} onChange={(e) => setForm({ ...form, nominal: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Keterangan</Label>
            <Textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="cth. Beli printer kasir" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
