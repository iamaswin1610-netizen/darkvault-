import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScreenHeader, SectionLabel } from "@/components/vault/ScreenHeader";
import { ActionRow, ToggleRow } from "@/components/vault/SettingRow";
import { Chip } from "@/components/vault/Chip";
import { CodeInput } from "@/components/vault/CodeInput";
import { useVault } from "@/lib/vault";
import { biometricsAvailable, registerFingerprint } from "@/lib/device";
import { isValidCode } from "@/lib/rules";

export const Route = createFileRoute("/_vault/settings/security")({
  head: () => ({
    meta: [
      { title: "Security & Privacy — DarkVault" },
      {
        name: "description",
        content: "Change your security code, fingerprint unlock, auto-lock and privacyoptions.",
      },
      { property: "og:title", content: "Security & Privacy — DarkVault" },
      { property: "og:description", content: "Control how your vault stays locked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Security,
});

const AUTO_LOCK = [
  { s: 0, label: "Immediately" },
  { s: 30, label: "30 sec" },
  { s: 60, label: "1 min" },
  { s: 300, label: "5 min" },
];

function Security() {
  const { settings, updateSettings, user } = useVault();
  const [changeOpen, setChangeOpen] = useState(false);
  const [bioAvailable, setBioAvailable] = useState<boolean | null>(null);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    biometricsAvailable().then(setBioAvailable);
  }, []);

  const toggleFingerprint = async (on: boolean) => {
    if (!on) {
      await updateSettings({ fingerprintEnabled: false, credentialId: undefined });
      toast.success("Fingerprint unlock turned off");
      return;
    }
    setBioBusy(true);
    try {
      const credentialId = await registerFingerprint(user?.name ?? "");
      await updateSettings({ fingerprintEnabled: true, credentialId });
      toast.success("Fingerprint unlock is on");
    } catch {
      toast.error("Fingerprint setup didn't finish", {
        description: "Try again in the installed app, not inside the editor preview.",
      });
    } finally {
      setBioBusy(false);
    }
  };

  return (
    <div>
      <ScreenHeader back title="Security & Privacy" />
      <SectionLabel>Access</SectionLabel>
      <div className="space-y-2">
        <ActionRow
          label="Change Security Code"
          hint="Asks for your current code first"
          onClick={() => setChangeOpen(true)}
        />
        <ToggleRow
          label="Fingerprint unlock"
          hint={
            bioBusy
              ? "Waiting for fingerprint…"
              : bioAvailable === false
                ? "No fingerprint sensor available on this device/browser"
                : "Code stays as the fallback"
          }
          checked={settings.fingerprintEnabled}
          onChange={toggleFingerprint}
          disabled={bioBusy || (bioAvailable === false && !settings.fingerprintEnabled)}
        />
      </div>

      <SectionLabel>Auto-lock</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {AUTO_LOCK.map((o) => (
          <Chip
            key={o.s}
            selected={settings.autoLockSeconds === o.s}
            onClick={() => updateSettings({ autoLockSeconds: o.s })}
          >
            {o.label}
          </Chip>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Locks the vault after it has been in the backgroundthis long.
      </p>

      <SectionLabel>Privacy</SectionLabel>
      <div className="space-y-2">
        <ToggleRow
          label="Block screenshots"
          hint="Only possible in the native Android build"
          checked={false}
          onChange={() => {}}
          disabled
        />
        <ToggleRow
          label="Hide details on lock screen"
          hint="Alerts say “DarkVault reminder” instead of the event name"
          checked={settings.hideOnLockScreen}
          onChange={(v) => updateSettings({ hideOnLockScreen: v })}
        />
        <ToggleRow
          label="Blur app in recent apps"
          hint="Blurs the screen when you switch away"
          checked={settings.blurRecents}
          onChange={(v) => updateSettings({ blurRecents: v })}
        />
      </div>

      <div className="mt-6 rounded-xl border border-warning/70 bg-warning/10 p-4 text-center">
        <p className="text-sm font-bold text-warning">5 wrong codes lock the app for 30 seconds</p>
        <p className="mt-1 text-xs text-muted-foreground">Longer locks after repeated failures</p>
      </div>

      <ChangeCodeDialog open={changeOpen} onOpenChange={setChangeOpen} />
    </div>
  );
}

function ChangeCodeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { changeCode } = useVault();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  const mismatch = confirm.length === 6 && next !== confirm;
  const ready = isValidCode(current) && isValidCode(next) && next === confirm;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await changeCode(current, next);
    setBusy(false);
    if (!ok) {
      setError("Current code is wrong");
      setCurrent("");
      return;
    }
    toast.success("Security code changed");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel-glow max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Change Security Code</DialogTitle>
          <DialogDescription className="text-center">
            Enter your current code, then a new one.
          </DialogDescription>
        </DialogHeader>
        <CodeInput
          id="cur"
          label="Current code"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            setError(null);
          }}
          error={!!error}
        />
        <CodeInput id="new" label="New 6-digit code" value={next} onChange={setNext} />
        <CodeInput
          id="conf"
          label="Confirm new code"
          value={confirm}
          onChange={setConfirm}
          error={mismatch}
        />
        <p className="min-h-4 text-center text-xs font-semibold text-destructive">
          {error ?? (mismatch ? "New codes don't match" : "")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="neonOutline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="neon" size="lg" disabled={!ready || busy} onClick={submit}>
            {busy && <Loader2 className="animate-spin" />} Change
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
