import { cn } from "@/lib/utils";
import { initials } from "@/lib/rules";

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | undefined;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-display font-bold text-primary-foreground shadow-[var(--shadow-glow)]",
        className,
      )}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}
