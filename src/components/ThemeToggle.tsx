import { useEffect, useState } from "react";
import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";
const KEY = "mf99-theme";

function apply(mode: Mode) {
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Mode | null) ?? "system";
    setMode(saved);
    apply(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(KEY) as Mode | null) === null || localStorage.getItem(KEY) === "system") {
        apply("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const set = (m: Mode) => {
    setMode(m);
    if (m === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, m);
    apply(m);
  };

  const Item = ({ value, icon: Icon, label }: { value: Mode; icon: React.ComponentType<{ className?: string }>; label: string }) => (
    <button
      onClick={() => set(value)}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition",
        mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5", className)}>
      <Item value="light" icon={Sun} label="Tema terang" />
      <Item value="system" icon={MonitorSmartphone} label="Ikuti sistem" />
      <Item value="dark" icon={Moon} label="Tema gelap" />
    </div>
  );
}
