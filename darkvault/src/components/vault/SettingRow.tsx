import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string | undefined;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean | undefined;
}) {
  return (
    <label className="panel flex cursor-pointer items-center gap-3 px-4 py-3.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="h-7 w-12 data-[state=checked]:bg-glow [&>span]:h-6 [&>span]:w-6 [&>span]:data-[state=checked]:translate-x-5"
      />
    </label>
  );
}

export function ActionRow({
  label,
  hint,
  onClick,
  right,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  right?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right ?? <ChevronRight className="h-5 w-5 text-glow" />}
    </button>
  );
}

export function NavRow({
  to,
  num,
  tone,
  title,
  hint,
}: {
  to:
    | "/settings/profile"
    | "/settings/security"
    | "/settings/notifications"
    | "/settings/appearance"
    | "/settings/storage"
    | "/settings/about";
  num: string;
  tone: string;
  title: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      style={{ "--tone": `var(--tone-${tone})` } as React.CSSProperties}
      className="panel flex items-center gap-3 px-4 py-3.5 hover:bg-accent"
    >
      <span className="tone-solid flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold shadow-[0_0_14px_-4px_var(--tone)]">
        {num}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-glow" />
    </Link>
  );
}
