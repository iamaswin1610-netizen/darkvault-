import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CloudUpload, Loader2, RotateCcw } from "lucide-react";
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
import { CodeInput } from "@/components/vault/CodeInput";
import { useVault } from "@/lib/vault";
import { documentsQuery, foldersQuery } from "@/lib/vault-data";
import { createBackup, restoreBackup } from "@/lib/backup";
import { formatBytes, isValidCode, toneVar } from "@/lib/rules";

export const Route = createFileRoute("/_vault/settings/storage")({
  head: () => ({
    meta: [
      { title: "Storage & Backup — DarkVault" },
      { name: "description", content: "Storage used by DarkVault, encrypted backup and restore." },
      { property: "og:title", content: "Storage & Backup — DarkVault" },
      { property: "og:description", content: "Back up and restore your vault." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Storage,
});

type Mode = { kind: "backup" } | { kind: "restore"; file: File } | null;

function Storage() {
  const { settings, updateSettings, checkCode } = useVault();
  const qc = useQueryClient();
  const { data: folders = [] } = useQuery(foldersQuery);
  const { data: docs = [] } = useQuery(documentsQuery);
  const [mode, setMode] = useState<Mode>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCode("");
    setError(null);
  }, [mode]);

  const total = docs.reduce((s, d) => s + d.sizeBytes, 0);
  const perFolder = folders
    .map((f) => ({
      f,
      size: docs.filter((d) => d.folderId === f.id).reduce((s, d) => s + d.sizeBytes, 0),
    }))
    .filter((x) => x.size > 0 || x.f.isDefault);

  const run = async () => {
    if (!mode || !isValidCode(code)) return;
    setBusy(true);
    setError(null);
    try {
      if (mode.kind === "backup") {
        if (!(await checkCode(code))) throw new Error("Wrong security code");
        const at = await createBackup(code);
        await updateSettings({ lastBackup: at });
        toast.success("Encrypted backup saved", { description: "Keep the file somewhere safe." });
      } else {
        const res = await restoreBackup(mode.file, code);
        await qc.invalidateQueries();
        toast.success("Vault restored", {
          description: `${res.files} files, ${res.reminders} reminders`,
        });
      }
      setMode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ScreenHeader back title="Storage & Backup" />
      <SectionLabel>Storage usage</SectionLabel>
      <div className="panel p-4">
        <p className="font-display text-3xl font-bold text-glow">{formatBytes(total)}</p>
        <p className="text-xs text-muted-foreground">used by DarkVault</p>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-strong">
          {perFolder.map(({ f, size }) =>
            size > 0 ? (
              <span
                key={f.id}
                style={{ ...toneVar(f.color), width: `${(size / total) * 100}%` }}
                className="tone-bar h-full"
              />
            ) : null,
          )}
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {perFolder.map(({ f, size }) => (
            <li key={f.id} style={toneVar(f.color)} className="flex items-center gap-2">
              <span className="tone-dot h-2.5 w-2.5 rounded-full" />
              <span className="flex-1">{f.name}</span>
              <span className="font-semibold">{formatBytes(size)}</span>
            </li>
          ))}
        </ul>
      </div>

      <SectionLabel>Backup</SectionLabel>
      <div className="panel divide-y divide-border px-4 text-sm">
        <div className="flex justify-between py-3">
          <span className="text-muted-foreground">Last backup</span>
          <span className="font-bold">
            {settings.lastBackup ? format(settings.lastBackup, "MMM d, h:mm a") : "Never"}
          </span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-muted-foreground">Encrypted backup</span>
          <span className="font-bold text-success">On</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Button
          variant="neon"
          size="xl"
          className="w-full"
          onClick={() => setMode({ kind: "backup" })}
        >
          <CloudUpload /> Back Up Now
        </Button>
        <Button
          variant="neonOutline"
          size="xl"
          className="w-full"
          onClick={() => fileRef.current?.click()}
        >
          <RotateCcw /> Restore from Backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".dvault,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setMode({ kind: "restore", file: f });
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Backups are a file you keep. Restore asks for your security code first and replaces what's
        in the vault now.
      </p>

      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="panel-glow max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {mode?.kind === "restore" ? "Restore from Backup" : "Back Up Now"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {mode?.kind === "restore"
                ? "Enter the security code that was used when this backup was made."
                : "Enter your security code to encrypt the backup."}
            </DialogDescription>
          </DialogHeader>
          <CodeInput
            id="bk-code"
            label="Security code"
            value={code}
            onChange={setCode}
            error={!!error}
          />
          <p className="min-h-4 text-center text-xs font-semibold text-destructive">{error}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="neonOutline" size="lg" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button variant="neon" size="lg" disabled={!isValidCode(code) || busy} onClick={run}>
              {busy && <Loader2 className="animate-spin" />}{" "}
              {mode?.kind === "restore" ? "Restore" : "Back Up"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
