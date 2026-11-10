import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeInput } from "@/components/vault/CodeInput";
import { Logo, Tagline, Wordmark } from "@/components/vault/Brand";
import { useVault } from "@/lib/vault";
import { isValidCode } from "@/lib/rules";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Set up DarkVault" },
      {
        name: "description",
        content: "First-time setup: enter your name and create a 6-digit security code.",
      },
      { property: "og:title", content: "Set up DarkVault" },
      {
        property: "og:description",
        content: "Create your private 6-digit code to secure your vault.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const { status, setup } = useVault();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "locked") navigate({ to: "/unlock", replace: true });
    if (status === "unlocked" && !saving) navigate({ to: "/home", replace: true });
  }, [status, navigate, saving]);

  const nameOk = name.trim().length > 0 && name.trim().length <= 40;
  const codesFilled = isValidCode(code) && isValidCode(confirm);
  const match = codesFilled && code === confirm;
  const mismatch = confirm.length === 6 && code !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOk || !match) return;
    setSaving(true);
    await setup(name, code);
    navigate({ to: "/home", replace: true });
  };

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-12">
      <div className="flex flex-col items-center text-center animate-rise-in">
        <Logo className="h-20 w-20" />
        <h1 className="mt-4 text-2xl font-bold">
          Welcome to <Wordmark />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">First-time setup | one time only</p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col gap-6">
        <div className="space-y-2">
          <label htmlFor="name" className="label-caps block">
            Your name
          </label>
          <Input
            id="name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aswin S R"
            className="h-12 rounded-xl border-border bg-surface-strong/60 text-base"
            autoComplete="name"
          />
        </div>

        <CodeInput id="code" label="Create 6-digit security code" value={code} onChange={setCode} />
        <CodeInput
          id="confirm"
          label="Confirm security code"
          value={confirm}
          onChange={setConfirm}
          error={mismatch}
        />

        <div className="flex min-h-5 items-center justify-center gap-2 text-xs font-semibold">
          {mismatch && <span className="text-destructive">Codes don't match — try again</span>}
          {match && (
            <span className="flex items-center gap-1 text-success">
              <Check className="h-3.5 w-3.5" /> Codes match
            </span>
          )}
          {match && nameOk && <span className="text-muted-foreground">|</span>}
          {nameOk && match && <span className="text-success">Name ready</span>}
        </div>

        <Button
          type="submit"
          variant="neon"
          size="xl"
          disabled={!nameOk || !match || saving}
          className="w-full"
        >
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save & Open DarkVault
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Your code is stored only on this phone
          <br />
          (encrypted, never as plain text)
        </p>
        <div className="mt-auto">
          <Tagline />
        </div>
      </form>
    </main>
  );
}
