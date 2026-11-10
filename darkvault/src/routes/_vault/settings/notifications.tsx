import { createFileRoute } from "@tanstack/react-router";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScreenHeader, SectionLabel } from "@/components/vault/ScreenHeader";
import { ToggleRow } from "@/components/vault/SettingRow";
import { Chip } from "@/components/vault/Chip";
import { useVault } from "@/lib/vault";
import type { Settings } from "@/lib/db";
import { playAlertSound, requestNotificationPermission, sendAlert, vibrate } from "@/lib/device";

export const Route = createFileRoute("/_vault/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Settings — DarkVault" },
      {
        name: "description",
        content: "Reminder alerts, alert sound, volume and vibration pattern.",
      },
      { property: "og:title", content: "Notification Settings — DarkVault" },
      { property: "og:description", content: "Choose how DarkVault alerts you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

const SOUNDS: { id: Settings["sound"]; label: string }[] = [
  { id: "cyber-ping", label: "Cyber Ping" },
  { id: "pulse", label: "Pulse" },
  { id: "beacon", label: "Beacon" },
  { id: "silent", label: "Silent" },
];

function Notifications() {
  const { settings, updateSettings } = useVault();

  return (
    <div>
      <ScreenHeader back title="Notification Settings" />
      <ToggleRow
        label="Reminder alerts"
        checked={settings.reminderAlerts}
        onChange={async (v) => {
          await updateSettings({ reminderAlerts: v });
          if (v) {
            const p = await requestNotificationPermission();
            if (p === "denied")
              toast.error("Notifications are blocked — allow them in your phone settings");
          }
        }}
      />

      <SectionLabel>Sound</SectionLabel>
      <div className="panel space-y-4 p-4">
        <div>
          <p className="mb-2 text-sm font-bold">Alert sound</p>
          <div className="flex flex-wrap gap-2">
            {SOUNDS.map((s) => (
              <Chip
                key={s.id}
                selected={settings.sound === s.id}
                onClick={() => {
                  updateSettings({ sound: s.id });
                  playAlertSound(s.id, settings.volume);
                }}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Volume</p>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5" /> {settings.volume}%
            </span>
          </div>
          <Slider
            value={[settings.volume]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => updateSettings({ volume: v ?? 0 })}
            onValueCommit={([v]) => playAlertSound(settings.sound, v ?? 0)}
            aria-label="Volume"
          />
        </div>
      </div>

      <SectionLabel>Vibration</SectionLabel>
      <ToggleRow
        label="Vibration"
        checked={settings.vibration}
        onChange={(v) => updateSettings({ vibration: v })}
      />
      <p className="mb-2 mt-4 text-xs font-semibold text-muted-foreground">Pattern</p>
      <div className="flex gap-2">
        {(["short", "double", "long"] as const).map((p) => (
          <Chip
            key={p}
            selected={settings.pattern === p}
            onClick={() => {
              updateSettings({ pattern: p });
              vibrate(p);
            }}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Chip>
        ))}
      </div>

      <Button
        variant="neonOutline"
        size="xl"
        className="mt-8 w-full"
        onClick={async () => {
          await requestNotificationPermission();
          sendAlert("DarkVault test alert", "Your reminder alerts are working.", settings);
        }}
      >
        Send Test Notification
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Alerts follow each reminder's own schedule while DarkVault is open on your phone
      </p>
    </div>
  );
}
