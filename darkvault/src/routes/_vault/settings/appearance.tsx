import { createFileRoute } from "@tanstack/react-router";
import { Check, Moon, Sun } from "lucide-react";
import { ScreenHeader, SectionLabel } from "@/components/vault/ScreenHeader";
import { ToggleRow } from "@/components/vault/SettingRow";
import { useVault } from "@/lib/vault";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_vault/settings/appearance")({
  head: () => ({
    meta: [
      { title: "App Appearance — DarkVault" },
      {
        name: "description",
        content: "Dark mode, light mode, neon-blue theme and splash effects.",
      },
      { property: "og:title", content: "App Appearance — DarkVault" },
      { property: "og:description", content: "Pick how DarkVault looks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Appearance,
});

function Appearance() {
  const { settings, updateSettings } = useVault();
  const modes = [
    { id: "dark" as const, label: "Dark Mode", icon: Moon },
    { id: "light" as const, label: "Light Mode", icon: Sun },
  ];
  return (
    <div>
      <ScreenHeader back title="App Appearance" />
      <SectionLabel>Theme mode</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => updateSettings({ theme: id })}
            className={cn(
              "relative flex flex-col items-center gap-2 py-6",
              settings.theme === id ? "panel-glow" : "panel",
            )}
          >
            <Icon className="h-8 w-8 text-glow" />
            <span className="text-sm font-bold">{label}</span>
            {settings.theme === id && (
              <Check className="absolute right-3 top-3 h-4 w-4 text-glow" />
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Light mode keeps the neon-blue accents.</p>

      <SectionLabel>Accent theme</SectionLabel>
      <div className="panel-glow flex items-center gap-3 p-4">
        <span className="h-10 w-10 rounded-full bg-[image:var(--gradient-neon)] shadow-[var(--shadow-glow)]" />
        <div>
          <p className="text-sm font-bold">Neon-blue theme</p>
          <p className="text-xs text-muted-foreground">Glowing blue highlights</p>
        </div>
      </div>

      <SectionLabel>Effects</SectionLabel>
      <ToggleRow
        label="Binary-rain splash"
        hint="Animated hacker splash screen"
        checked={settings.binaryRain}
        onChange={(v) => updateSettings({ binaryRain: v })}
      />
    </div>
  );
}
