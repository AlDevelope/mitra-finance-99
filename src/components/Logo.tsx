import { cn } from "@/lib/utils";

export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-elegant",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label="Mitra Finance 99"
    >
      <span
        className="font-serif font-extrabold leading-none tracking-tight"
        style={{ fontSize: size * 0.34, letterSpacing: "-0.04em" }}
      >
        MF99
      </span>
    </div>
  );
}
