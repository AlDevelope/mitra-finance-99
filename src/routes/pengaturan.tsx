import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getSession, type Session } from "@/lib/auth";
import { Settings, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pengaturan")({
  beforeLoad: () => {
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (s.role !== "super_admin") throw redirect({ to: "/dashboard" });
  },
  component: () => {
    const s = getSession() as Session;
    return (
      <AppShell session={s}>
        <p className="text-xs uppercase tracking-[0.3em] text-brand">Pengaturan</p>
        <h1 className="font-serif text-3xl font-bold mt-1">Pengaturan</h1>
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <Settings className="h-12 w-12 mx-auto text-brand" />
          <h2 className="font-serif text-xl mt-4">Segera Hadir</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Manajemen akun, edit info bisnis, ganti logo, export data, dan backup akan tersedia di iterasi berikutnya.
            <Sparkles className="h-4 w-4 inline ml-1 text-brand" />
          </p>
        </div>
      </AppShell>
    );
  },
});
