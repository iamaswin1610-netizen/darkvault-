import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScreenHeader } from "@/components/vault/ScreenHeader";
import { ActionRow } from "@/components/vault/SettingRow";
import { Logo, Tagline, Wordmark } from "@/components/vault/Brand";

export const Route = createFileRoute("/_vault/settings/about")({
  head: () => ({
    meta: [
      { title: "About DarkVault" },
      { name: "description", content: "App information, privacy policy and version." },
      { property: "og:title", content: "About DarkVault" },
      { property: "og:description", content: "Built for private personal use." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  const [open, setOpen] = useState<"info" | "policy" | null>(null);
  return (
    <div>
      <ScreenHeader back title="About DarkVault" />
      <div className="flex flex-col items-center py-6">
        <Logo className="h-24 w-24" />
        <Wordmark className="mt-3 text-3xl" />
        <p className="font-mono text-xs text-muted-foreground">v1.0.0 · Build 1</p>
      </div>
      <div className="space-y-2">
        <ActionRow
          label="App Information"
          hint="Built for private personal use"
          onClick={() => setOpen("info")}
        />
        <ActionRow
          label="Privacy Policy"
          hint="How your data is handled"
          onClick={() => setOpen("policy")}
        />
        <ActionRow
          label="Version"
          hint="Build 1"
          onClick={() => {}}
          right={<span className="font-mono text-sm text-glow">1.0.0</span>}
        />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Your files and reminders stay on this phone.
      </p>
      <div className="mt-6">
        <Tagline />
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="panel-glow max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{open === "policy" ? "Privacy Policy" : "App Information"}</DialogTitle>
            <DialogDescription className="sr-only">Details</DialogDescription>
          </DialogHeader>
          {open === "policy" ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>DarkVault has no account and no server. Everything you add stays on this phone.</p>
              <p>
                Your 6-digit code is never stored — only a salted PBKDF2 hash of it. Documents are
                encrypted with AES-256 before they are saved.
              </p>
              <p>
                Reminders are stored locally and are never sent anywhere. Backups are files you
                create andkeep yourself; they are encrypted with your security code.
              </p>
              <p>
                Clearing the app's data or uninstalling it permanently erases your vault, so keep a
                backup.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                DarkVault is a personal digital vault for your documents and reminders, built for
                private personal use.
              </p>
              <p>
                Modules: Splash & Security Login, Document Management, Smart Reminders and Settings.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
