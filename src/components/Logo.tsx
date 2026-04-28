import { cn } from "@/lib/utils";

export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl overflow-hidden shadow-elegant",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label="Mitra Finance 99"
    >
      <img src="images/logo.jpeg" alt="Logo Mitra Finance 99" className="w-full h-full object-cover" />
    </div>
  );
}
