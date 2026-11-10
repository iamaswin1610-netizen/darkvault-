import { cn } from "@/lib/utils";

export function CodeBoxes({
  value,
  length = 6,
  error,
  focused,
}: {
  value: string;
  length?: number;
  error?: boolean | undefined;
  focused?: boolean | undefined;
}) {
  return (
    <div className={cn("flex justify-between gap-2", error && "animate-shake")}>
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const active = focused && i === value.length;
        return (
          <div
            key={i}
            className={cn(
              "flex aspect-square w-full max-w-12 items-center justify-center rounded-lg border bg-surface-strong/60 transition-all",
              filled ? "border-primary/80" : "border-border",
              active && "border-glow shadow-[var(--shadow-glow)]",
              error && "border-destructive",
            )}
          >
            {filled && <span className="h-3 w-3 rounded-full bg-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

/** Six-digit code field: an invisible numeric input over the code boxes. */
export function CodeInput({
  value,
  onChange,
  label,
  id,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  id: string;
  error?: boolean | undefined;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label-caps block">
        {label}
      </label>
      <div className="relative">
        <CodeBoxes value={value} error={error} />
        <input
          id={id}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          aria-label={label}
        />
      </div>
    </div>
  );
}
