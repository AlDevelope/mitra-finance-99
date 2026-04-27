import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/ThemeToggle";
import { login, getSession } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — Mitra Finance 99" },
      { name: "description", content: "Masuk ke akun Mitra Finance 99 Anda." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) navigate({ to: s.role === "customer" ? "/customer" : "/dashboard" });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const s = await login(username, password);
      toast.success(`Selamat datang, ${s.nama}`);
      navigate({ to: s.role === "customer" ? "/customer" : "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-soft flex items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Soft decorative blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size={84} />
          <h1 className="mt-5 font-serif text-4xl font-bold text-gradient-brand">Mitra Finance 99</h1>
          <p className="mt-2 text-xs tracking-[0.4em] text-muted-foreground uppercase">
            Berkembang · Bertumbuh · Berinovasi
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-border bg-card/95 backdrop-blur p-7 shadow-elegant space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="contoh: admin"
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
            <Label htmlFor="remember" className="text-sm text-muted-foreground font-normal cursor-pointer">
              Ingat saya selama 8 jam
            </Label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-brand text-primary-foreground font-semibold text-base hover:opacity-95 hover:shadow-elegant transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
          </Button>

          <div className="rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground/80 mb-1">Akun demo:</div>
            <div>Owner: <span className="text-brand font-medium">owner / mitra99owner</span></div>
            <div>Admin: <span className="text-brand font-medium">admin / admin123</span></div>
            <div>Customer: <span className="text-brand font-medium">yuli / yuli123</span> · sifa / sifa123 · dimas / dimas123</div>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Mitra Finance 99
        </p>
      </div>
    </div>
  );
}
