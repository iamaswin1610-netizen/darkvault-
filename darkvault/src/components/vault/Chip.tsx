import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneVar, type ToneKey } from "@/lib/rules";

/** Pill used for categories, alert schedules, auto-lock options, patterns. */
export function Chip({
  selected,
  onClick,
  children,
  tone,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: ToneKey;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={toneVar(tone ?? "cyan")}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
        selected
          ? "tone-solid border-transparent shadow-[0_0_16px_-4px_var(--tone)]"
          : "border-[color-mix(in_oklab,var(--tone)_60%,transparent)] bg-surface text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
