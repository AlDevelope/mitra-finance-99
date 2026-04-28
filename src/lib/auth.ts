import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "admin" | "customer";

export type Session = {
  id: string;
  username: string;
  nama: string;
  role: Role;
  nasabah_id?: string;
};

// Hardcoded admin accounts (tidak perlu tabel users)
const HARDCODED: Record<string, { password: string; role: Role; nama: string }> = {
  owner: { password: "owner123", role: "super_admin", nama: "Owner MF99" },
  admin: { password: "admin123", role: "admin", nama: "Admin MF99" },
};

export async function login(username: string, password: string): Promise<Session | null> {
  const u = username.trim().toLowerCase();

  // Cek hardcoded admin/owner
  const hc = HARDCODED[u];
  if (hc) {
    if (hc.password !== password) return null;
    const session: Session = {
      id: u,
      username: u,
      nama: hc.nama,
      role: hc.role,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("mf99_session", JSON.stringify(session));
    }
    return session;
  }

  // Cek tabel nasabah (customer)
  const { data } = await supabase
    .from("nasabah")
    .select("id, nama, username, password")
    .eq("username", u)
    .maybeSingle();

  if (!data) return null;
  if (data.password !== password) return null;

  const session: Session = {
    id: data.id,
    username: data.username ?? u,
    nama: data.nama,
    role: "customer",
    nasabah_id: data.id,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem("mf99_session", JSON.stringify(session));
  }
  return session;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("mf99_session");
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export const getCurrentUser = getSession;

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("mf99_session");
    window.location.href = "/login";
  }
}

export const canEdit = (s: Session | null) =>
  s?.role === "admin" || s?.role === "super_admin";