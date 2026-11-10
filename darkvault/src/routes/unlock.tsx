import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Delete, Fingerprint, Loader2, Unlock as UnlockIcon } from "lucide-react";
import { CodeBoxes } from "@/components/vault/CodeInput";
import { Logo, Tagline, Wordmark } from "@/components/vault/Brand";
import { useVault } from "@/lib/vault";
import { attemptsLeft, isLocked, MAX_ATTEMPTS } from "@/lib/lockout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Unlock DarkVault" },
      {
        name: "description",
        content: "Enter your 6-digit security code or use your fingerprint to open your vault.",
      },
      { property: "og:title", content: "Unlock DarkVault" },
      { property: "og:description", content: "Security check for your personal digital vault." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnlockScreen,
});

function UnlockScreen() {
  const { status, user, lockout, unlock, unlockWithFingerprint, settings } = useVault();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === "new") navigate({ to: "/setup", replace: true });
    if (status === "unlocked") navigate({ to: "/home", replace: true });
  }, [status, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const locked = isLocked(lockout, now);
  const secondsLeft = Math.ceil((lockout.lockedUntil - now) / 1000);
  const fingerprintOn = settings.fingerprintEnabled && !!settings.credentialId;

  const submit = async (value: string) => {
    if (value.length !== 6 || busy || locked) return;
    setBusy(true);
    const res = await unlock(value);
    setBusy(false);
    if (res !== "ok") {
      setError(true);
      setTimeout(() => setError(false), 450);
      setCode("");
    }
  };

  const press = (d: string) => {
    if (locked || busy) return;
    const next = (code + d).slice(0, 6);
    setCode(next);
    if (next.length === 6) void submit(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") setCode((c) => c.slice(0, -1));
      if (e.key === "Enter") void submit(code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keyCls =
    "flex h-14 items-center justify-center rounded-xl border border-border bg-surface-strong/60 font-display text-2xl font-semibold text-foreground transition-all active:scale-95 active:bg-accent disabled:opacity-40";

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-10">
      <div className="flex flex-col items-center text-center">
        <Logo className="h-20 w-20" />
        <Wordmark className="mt-4 text-4xl" />
        <p className="mt-2 font-semibold text-glow">Welcome back, {user?.name ?? "agent"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Enter your 6-digit security code</p>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="flex-1">
          <CodeBoxes value={code} error={error} focused />
        </div>
        <button
          type="button"
          aria-label="Delete digit"
          onClick={() => setCode((c) => c.slice(0, -1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            className={keyCls}
            onClick={() => press(d)}
            disabled={locked}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className={cn(keyCls, "flex-col gap-0.5 text-xs font-bold")}
          disabled={!fingerprintOn}
          onClick={() => void unlockWithFingerprint()}
          aria-label="Unlock with fingerprint"
        >
          <Fingerprint className="h-5 w-5 text-glow" />
          Fingerprint
        </button>
        <button type="button" className={keyCls} onClick={() => press("0")} disabled={locked}>
          0
        </button>
        <button
          type="button"
          onClick={() => void submit(code)}
          disabled={code.length !== 6 || locked || busy}
          className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-[var(--shadow-neon)] transition-all active:scale-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UnlockIcon className="h-5 w-5" />}
          Unlock
        </button>
      </div>

      <p
        className={cn(
          "mt-6 text-center text-xs font-semibold",
          locked ? "text-destructive" : "text-warning",
        )}
      >
        {locked
          ? `Too many wrong codes. Try again in ${secondsLeft}s`
          : lockout.failed > 0
            ? `Wrong code: ${attemptsLeft(lockout)} ${attemptsLeft(lockout) === 1 ? "try" : "tries"} left, then a lock`
            : `Wrong code: ${MAX_ATTEMPTS} tries, then 30 sec lock`}
      </p>

      <div className="mt-auto pt-8">
        <Tagline />
      </div>
    </main>
  );
}
