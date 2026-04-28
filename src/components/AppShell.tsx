import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { logout, type Session } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<Session["role"]>;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin"] },
  { to: "/nasabah", label: "Nasabah", icon: Users, roles: ["super_admin", "admin"] },
  { to: "/customer", label: "Tagihan Saya", icon: UserIcon, roles: ["customer"] },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["super_admin", "admin"] },
];

export function AppShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = mounted && session?.role
    ? NAV.filter((i) => i.roles.includes(session.role))
    : [];

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  // Saat SSR / belum mounted, render skeleton minimal tanpa nav
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <main className="lg:pl-64 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar px-4 py-6 z-30">
        <div className="flex items-center gap-3 px-2">
          <Logo size={44} />
          <div>
            <div className="font-serif font-bold text-lg leading-tight text-gradient-brand">Mitra Finance</div>
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground">— 99 —</div>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-brand text-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border pt-4 space-y-3">
          <div className="px-2">
            <div className="text-xs text-muted-foreground">Login sebagai</div>
            <div className="text-sm font-semibold truncate">{session?.nama ?? ""}</div>
            <div className="text-[10px] uppercase tracking-wider text-brand font-semibold">
              {session?.role?.replace("_", " ") ?? ""}
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <div className="font-serif font-bold text-gradient-brand">Mitra Finance 99</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground" aria-label="Keluar">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="lg:pl-64 pb-24 lg:pb-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}
        >
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-medium",
                  active ? "text-brand" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}