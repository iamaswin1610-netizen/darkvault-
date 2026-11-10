import logoUrl from "@/assets/darkvault_logo.svg";
import { cn } from "@/lib/utils";

export const LOGO_URL = logoUrl;

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="DarkVault logo"
      width={512}
      height={512}
      className={cn("rounded-full drop-shadow-[0_0_24px_var(--glow)]", className)}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-extrabold tracking-tight", className)}>
      <span className="text-foreground">Dark</span>
      <span className="text-gradient-neon">Vault</span>
    </span>
  );
}

export function Tagline() {
  return <p className="text-center text-sm font-semibold text-glow">Secure. Private. Yours.</p>;
}
