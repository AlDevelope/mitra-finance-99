import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "admin" | "customer";

export interface Session {
  username: string;
  nama: string;
  role: Role;
  nasabah_id?: string;
  exp: number;
}

const STORAGE_KEY = "mf99_session";
const SESSION_HOURS = 8;

// ============================================================
// 🔐 GANTI USERNAME & PASSWORD DI BAWAH INI SEBELUM DEPLOY!
// Ini adalah satu-satunya tempat akun owner & admin disimpan.
// Gunakan password yang KUAT (min. 12 karakter, kombinasi huruf+angka+simbol).
// ============================================================
const HARDCODED: Record<string, { password: string; role: Role; nama: string }> = {
  // 👑 OWNER / SUPER ADMIN — akses penuh termasuk hapus data
  owner: {
    password: "GANTI_PASSWORD_OWNER_ANDA",
    role: "super_admin",
    nama: "Owner Mitra Finance 99",
  },
  // 🛡️ ADMIN — bisa kelola nasabah, angsuran, keuangan
  admin: {
    password: "GANTI_PASSWORD_ADMIN_ANDA",
    role: "admin",
    nama: "Admin Mitra Finance 99",
  },
};

export async function login(username: string, password: string): Promise<Session> {
  const u = username.trim().toLowerCase();

  // Hardcoded admin / super admin
  const hc = HARDCODED[u];
  if (hc) {
    if (hc.password !== password) throw new Error("Password salah");
    return persist({ username: u, nama: hc.nama, role: hc.role, exp: Date.now() + SESSION_HOURS * 3600_000 });
  }

  // Customer = lookup di tabel nasabah
  const { data, error } = await supabase
    .from("nasabah")
    .select("id, nama, username, password")
    .eq("username", u)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Akun tidak ditemukan");
  if (data.password !== password) throw new Error("Password salah");

  return persist({
    username: u,
    nama: data.nama,
    role: "customer",
    nasabah_id: data.id,
    exp: Date.now() + SESSION_HOURS * 3600_000,
  });
}

function persist(s: Session): Session {
  const token = btoa(unescape(encodeURIComponent(JSON.stringify(s))));
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, token);
  return s;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem(STORAGE_KEY);
  if (!t) return null;
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(t)))) as Session;
    if (s.exp < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

export const canEdit = (s: Session | null) => s?.role === "admin" || s?.role === "super_admin";
