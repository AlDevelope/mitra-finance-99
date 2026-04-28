import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Upload, CheckCircle, XCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/import")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role === "customer") throw redirect({ to: "/customer" });
  },
  component: ImportPage,
});

interface NasabahImport {
  nama: string;
  item_dibeli: string;
  uang_muka: number;
  jumlah_angsuran: number;
  rp_per_angsuran: number;
  tgl_mulai: string;
  username: string;
  password: string;
  whatsapp?: string;
}

interface ImportResult {
  nama: string;
  status: "success" | "error" | "skip";
  message: string;
}

function generateUsername(nama: string): string {
  return nama.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
}

function generatePassword(username: string): string {
  return username + "123";
}

function parseExcel(file: File): Promise<NasabahImport[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        // Coba sheet "Pembayaran" dulu, fallback ke sheet pertama
        const sheetName = wb.SheetNames.includes("Pembayaran")
          ? "Pembayaran"
          : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        const nasabahList: NasabahImport[] = [];

        // Parse format Excel MF99: data dalam 2 kolom, setiap blok 24 baris
        // Kiri: col B(1)-F(5), Kanan: col H(7)-L(11)
        // Row pattern per nasabah: Nama, Item, Uang Muka, Jumlah Angsuran, Rp, ...tanggal angsuran
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i] as unknown[];

          // Deteksi baris "Nama" untuk blok kiri (kolom B = index 1)
          if (row[1] === "Nama" && i + 4 < rows.length) {
            const nama = rows[i][2] as string;
            const item = rows[i + 1]?.[2] as string;
            const um = (rows[i + 2]?.[2] as number) || 0;
            const jml = rows[i + 3]?.[2] as number;
            const rp = rows[i + 4]?.[2] as number;

            if (nama && typeof nama === "string" && jml && rp) {
              const uname = generateUsername(nama);
              nasabahList.push({
                nama: nama.trim(),
                item_dibeli: item?.toString().trim() || "-",
                uang_muka: um || 0,
                jumlah_angsuran: jml,
                rp_per_angsuran: rp,
                tgl_mulai: new Date().toISOString().slice(0, 10),
                username: uname,
                password: generatePassword(uname),
              });
            }
          }

          // Deteksi baris "Nama" untuk blok kanan (kolom H = index 7)
          if (row[7] === "Nama" && i + 4 < rows.length) {
            const nama = rows[i][8] as string;
            const item = rows[i + 1]?.[8] as string;
            const um = (rows[i + 2]?.[8] as number) || 0;
            const jml = rows[i + 3]?.[8] as number;
            const rp = rows[i + 4]?.[8] as number;

            if (nama && typeof nama === "string" && jml && rp) {
              const uname = generateUsername(nama);
              nasabahList.push({
                nama: nama.trim(),
                item_dibeli: item?.toString().trim() || "-",
                uang_muka: um || 0,
                jumlah_angsuran: jml,
                rp_per_angsuran: rp,
                tgl_mulai: new Date().toISOString().slice(0, 10),
                username: uname,
                password: generatePassword(uname),
              });
            }
          }
        }

        // Jika format berbeda (sheet dengan header kolom), coba parse sebagai tabel biasa
        if (nasabahList.length === 0) {
          const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
          for (const row of json) {
            const nama =
              (row["nama"] || row["Nama"] || row["NAMA"]) as string;
            const item =
              (row["item_dibeli"] || row["Item"] || row["ITEM"] || row["Barang"]) as string;
            const jml = Number(
              row["jumlah_angsuran"] || row["Jumlah Angsuran"] || row["tenor"] || 0
            );
            const rp = Number(
              row["rp_per_angsuran"] || row["Rp/Angsuran"] || row["cicilan"] || 0
            );
            const um = Number(row["uang_muka"] || row["Uang Muka"] || row["DP"] || 0);

            if (nama && jml && rp) {
              const uname = generateUsername(nama);
              nasabahList.push({
                nama: nama.trim(),
                item_dibeli: item?.toString().trim() || "-",
                uang_muka: um,
                jumlah_angsuran: jml,
                rp_per_angsuran: rp,
                tgl_mulai: new Date().toISOString().slice(0, 10),
                username: uname,
                password: generatePassword(uname),
              });
            }
          }
        }

        resolve(nasabahList);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const data = [
    ["nama", "item_dibeli", "uang_muka", "jumlah_angsuran", "rp_per_angsuran", "tgl_mulai", "whatsapp"],
    ["Budi Santoso", "Motor Honda Beat", 500000, 12, 300000, "2026-01-01", "628123456789"],
    ["Siti Rahayu", "Kulkas 2 Pintu", 0, 10, 150000, "2026-01-15", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Nasabah");
  XLSX.writeFile(wb, "template-import-nasabah.xlsx");
}

function ImportPage() {
  const session = getSession() as Session;
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<NasabahImport[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("File harus berformat .xlsx atau .xls");
      return;
    }
    try {
      setLoading(true);
      const data = await parseExcel(file);
      if (data.length === 0) {
        toast.error("Tidak ada data nasabah yang bisa dibaca dari file ini");
        return;
      }
      setPreview(data);
      setStep("preview");
      toast.success(`${data.length} nasabah berhasil dibaca dari Excel`);
    } catch (err) {
      toast.error("Gagal membaca file Excel");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const doImport = async () => {
    setLoading(true);
    const res: ImportResult[] = [];

    for (const n of preview) {
      try {
        // Cek apakah username sudah ada
        const { data: existing } = await supabase
          .from("nasabah")
          .select("id")
          .eq("username", n.username)
          .maybeSingle();

        // Jika username sudah ada, tambahkan suffix
        let username = n.username;
        if (existing) {
          username = n.username + Math.floor(10 + Math.random() * 90);
        }

        const { error } = await supabase.from("nasabah").insert({
          nama: n.nama,
          item_dibeli: n.item_dibeli,
          uang_muka: n.uang_muka,
          jumlah_angsuran: n.jumlah_angsuran,
          rp_per_angsuran: n.rp_per_angsuran,
          tgl_mulai: n.tgl_mulai,
          status: "aktif",
          username,
          password: generatePassword(username),
          whatsapp: n.whatsapp || null,
        });

        if (error) throw error;
        res.push({ nama: n.nama, status: "success", message: `Berhasil — login: ${username} / ${generatePassword(username)}` });
      } catch (err) {
        res.push({ nama: n.nama, status: "error", message: err instanceof Error ? err.message : "Gagal" });
      }
    }

    setResults(res);
    setStep("done");
    setLoading(false);

    const sukses = res.filter((r) => r.status === "success").length;
    toast.success(`${sukses} dari ${res.length} nasabah berhasil diimport`);
  };

  return (
    <AppShell session={session}>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/nasabah">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
        <div>
          <h1 className="font-serif text-3xl font-bold">Import Excel → Database</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload file Excel berisi data nasabah. Sistem otomatis membuat akun login & username/password.
          </p>
        </div>
      </div>

      {step === "upload" && (
        <div className="space-y-4">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> Download Template
          </Button>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={
              "relative rounded-2xl border-2 border-dashed p-16 text-center transition-colors cursor-pointer " +
              (dragging ? "border-brand bg-brand/5" : "border-border hover:border-brand/50")
            }
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onFileChange}
            />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-brand" />
                <p className="text-muted-foreground">Membaca file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <p className="font-semibold">Drag & drop file Excel di sini</p>
                <p className="text-sm text-muted-foreground">atau klik untuk memilih file (.xlsx atau .xls)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{preview.length} nasabah siap diimport</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Batal</Button>
              <Button onClick={doImport} disabled={loading} className="bg-gradient-brand text-primary-foreground gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import Sekarang
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Nama</th>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-right px-3 py-2">DP</th>
                    <th className="text-right px-3 py-2">Angsuran</th>
                    <th className="text-right px-3 py-2">Rp/Angsuran</th>
                    <th className="text-left px-3 py-2">Username</th>
                    <th className="text-left px-3 py-2">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((n, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{n.nama}</td>
                      <td className="px-3 py-2 text-muted-foreground">{n.item_dibeli}</td>
                      <td className="px-3 py-2 text-right">{n.uang_muka.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2 text-right">{n.jumlah_angsuran}x</td>
                      <td className="px-3 py-2 text-right font-medium">Rp {n.rp_per_angsuran.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2 font-mono text-xs text-brand">{n.username}</td>
                      <td className="px-3 py-2 font-mono text-xs">{n.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Hasil Import</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("upload"); setPreview([]); setResults([]); }}>
                Import Lagi
              </Button>
              <Button onClick={() => navigate({ to: "/nasabah" })} className="bg-gradient-brand text-primary-foreground">
                Lihat Nasabah
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
              <div className="text-2xl font-bold text-success">{results.filter(r => r.status === "success").length}</div>
              <div className="text-xs text-muted-foreground mt-1">Berhasil</div>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{results.filter(r => r.status === "error").length}</div>
              <div className="text-xs text-muted-foreground mt-1">Gagal</div>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Nama</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{r.nama}</td>
                      <td className="px-3 py-2">
                        {r.status === "success" ? (
                          <span className="flex items-center gap-1 text-success"><CheckCircle className="h-4 w-4" /> Berhasil</span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" /> Gagal</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}