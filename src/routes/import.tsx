import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { buatNasabahLengkap, type Frekuensi } from "@/lib/nasabah-helpers";
import { formatRp } from "@/lib/format";

export const Route = createFileRoute("/import")({
  beforeLoad: () => {
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role === "customer") throw redirect({ to: "/customer" });
  },
  component: ImportPage,
});

interface RawRow { [k: string]: unknown }
interface MappedRow {
  nama: string;
  item_dibeli: string;
  uang_muka: number;
  jumlah_angsuran: number;
  rp_per_angsuran: number;
  tgl_mulai: string;
  whatsapp: string;
  hargaPokok: number;
}

const COLS: { key: keyof MappedRow; label: string; required?: boolean }[] = [
  { key: "nama", label: "Nama", required: true },
  { key: "item_dibeli", label: "Item / Barang", required: true },
  { key: "uang_muka", label: "Uang Muka" },
  { key: "jumlah_angsuran", label: "Jumlah Angsuran", required: true },
  { key: "rp_per_angsuran", label: "Rp / Angsuran", required: true },
  { key: "tgl_mulai", label: "Tanggal Mulai" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "hargaPokok", label: "Harga Pokok / Modal" },
];

function ImportPage() {
  const session = getSession() as Session;
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [frekuensi, setFrekuensi] = useState<Frekuensi>("mingguan");
  const [marginPersen, setMarginPersen] = useState(25);
  const [importing, setImporting] = useState(false);
  const [hasil, setHasil] = useState<{ nama: string; username: string; password: string; ok: boolean; error?: string }[]>([]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });
    if (!json.length) return toast.error("File kosong");
    const hdr = Object.keys(json[0]);
    setHeaders(hdr);
    setRawRows(json);
    // auto-mapping berdasarkan nama kolom
    const auto: Record<string, string> = {};
    for (const c of COLS) {
      const found = hdr.find((h) => h.toLowerCase().replace(/[^a-z]/g, "").includes(c.key.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5)));
      if (found) auto[c.key] = found;
    }
    setMapping(auto);
    toast.success(`${json.length} baris terbaca`);
  };

  const parseRow = (row: RawRow): MappedRow => {
    const get = (k: keyof MappedRow) => row[mapping[k]];
    const num = (v: unknown) => Number(String(v ?? "0").replace(/[^\d.-]/g, "")) || 0;
    let tgl = String(get("tgl_mulai") || "");
    if (tgl && !isNaN(Number(tgl))) {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(Number(tgl));
      if (d) tgl = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    if (!tgl) tgl = new Date().toISOString().slice(0, 10);
    return {
      nama: String(get("nama") || "").trim(),
      item_dibeli: String(get("item_dibeli") || "-").trim(),
      uang_muka: num(get("uang_muka")),
      jumlah_angsuran: num(get("jumlah_angsuran")),
      rp_per_angsuran: num(get("rp_per_angsuran")),
      tgl_mulai: tgl,
      whatsapp: String(get("whatsapp") || "").trim(),
      hargaPokok: num(get("hargaPokok")),
    };
  };

  const startImport = async () => {
    const required = COLS.filter((c) => c.required);
    for (const r of required) if (!mapping[r.key]) return toast.error(`Mapping kolom "${r.label}" wajib diisi`);

    setImporting(true);
    const results: typeof hasil = [];
    for (const raw of rawRows) {
      const row = parseRow(raw);
      if (!row.nama || row.jumlah_angsuran < 1 || row.rp_per_angsuran < 1) {
        results.push({ nama: row.nama || "(tanpa nama)", username: "-", password: "-", ok: false, error: "Data wajib kosong/invalid" });
        continue;
      }
      try {
        const res = await buatNasabahLengkap({
          ...row,
          frekuensi,
          marginPersen,
          catatModalKePosKeuangan: row.hargaPokok > 0,
        });
        results.push({ nama: row.nama, username: res.username, password: res.password, ok: true });
      } catch (e) {
        results.push({ nama: row.nama, username: "-", password: "-", ok: false, error: (e as Error).message });
      }
    }
    setHasil(results);
    setImporting(false);
    toast.success(`Selesai: ${results.filter((r) => r.ok).length}/${results.length} berhasil`);
  };

  const downloadTemplate = () => {
    const data = [{
      Nama: "Contoh Budi", Item: "Motor Beat", "Uang Muka": 0,
      "Jumlah Angsuran": 20, "Rp Per Angsuran": 250000,
      "Tanggal Mulai": "2025-01-15", WhatsApp: "628123456789", "Harga Pokok": 4000000,
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nasabah");
    XLSX.writeFile(wb, "template-nasabah.xlsx");
  };

  const downloadHasil = () => {
    const ws = XLSX.utils.json_to_sheet(hasil);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Akun Nasabah");
    XLSX.writeFile(wb, "akun-nasabah-hasil-import.xlsx");
  };

  return (
    <AppShell session={session}>
      <Link to="/nasabah" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
      <h1 className="font-serif text-3xl font-bold mt-2">Import Excel → Database</h1>
      <p className="text-sm text-muted-foreground mt-1">Upload file Excel berisi data nasabah. Sistem akan otomatis membuat akun login & jadwal angsuran.</p>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="h-4 w-4" /> Download Template</Button>
      </div>

      <div className="mt-6 rounded-2xl border-2 border-dashed border-border p-8 text-center">
        <FileSpreadsheet className="h-12 w-12 mx-auto text-brand" />
        <p className="mt-3 font-semibold">Pilih file Excel (.xlsx atau .xls)</p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="mt-4 mx-auto block text-sm" />
      </div>

      {headers.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-3">Mapping Kolom ({rawRows.length} baris)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {COLS.map((c) => (
              <div key={c.key} className="space-y-1">
                <Label className="text-xs">{c.label} {c.required && <span className="text-destructive">*</span>}</Label>
                <Select value={mapping[c.key] || ""} onValueChange={(v) => setMapping({ ...mapping, [c.key]: v })}>
                  <SelectTrigger><SelectValue placeholder="-- pilih kolom --" /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Frekuensi Angsuran</Label>
              <Select value={frekuensi} onValueChange={(v) => setFrekuensi(v as Frekuensi)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="harian">Harian</SelectItem>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Margin Default (%) — bila harga pokok kosong</Label>
              <Input type="number" value={marginPersen} onChange={(e) => setMarginPersen(Number(e.target.value))} />
            </div>
          </div>

          <Button onClick={startImport} disabled={importing} className="mt-5 gap-2 w-full">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Mengimport..." : `Import ${rawRows.length} Nasabah`}
          </Button>
        </div>
      )}

      {hasil.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Hasil Import ({hasil.filter(h => h.ok).length}/{hasil.length} sukses)</h2>
            <Button size="sm" variant="outline" onClick={downloadHasil} className="gap-2"><Download className="h-4 w-4" /> Download Akun</Button>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-left">
                <th className="py-2">Status</th><th>Nama</th><th>Username</th><th>Password</th><th>Catatan</th>
              </tr></thead>
              <tbody>
                {hasil.map((h, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2">{h.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}</td>
                    <td>{h.nama}</td>
                    <td className="font-mono">{h.username}</td>
                    <td className="font-mono">{h.password}</td>
                    <td className="text-xs text-muted-foreground">{h.error || "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
