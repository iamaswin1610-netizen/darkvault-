import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/vault/ScreenHeader";
import { NavRow } from "@/components/vault/SettingRow";
import { UserAvatar } from "@/components/vault/UserAvatar";
import { Tagline } from "@/components/vault/Brand";
import { useVault } from "@/lib/vault";

export const Route = createFileRoute("/_vault/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — DarkVault" },
      {
        name: "description",
        content: "Profile, security, notifications, appearance, storage and about.",
      },
      { property: "og:title", content: "Settings — DarkVault" },
      { property: "og:description", content: "Manage your DarkVault." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsHome,
});

function SettingsHome() {
  const { user, lock } = useVault();
  return (
    <div className="space-y-3">
      <ScreenHeader title="Settings" />
      <Link to="/settings/profile" className="panel-glow flex items-center gap-3 p-4">
        <UserAvatar name={user?.name ?? ""} src={user?.avatar} className="h-12 w-12 text-lg" />
        <div>
          <p className="font-display text-lg font-bold">{user?.name}</p>
          <p className="text-xs font-semibold text-success">Vault secured</p>
        </div>
      </Link>
      <NavRow
        to="/settings/profile"
        num="01"
        tone="blue"
        title="Profile Settings"
        hint="Name, picture, account info"
      />
      <NavRow
        to="/settings/security"
        num="02"
        tone="green"
        title="Security & Privacy"
        hint="Code, fingerprint, auto-lock"
      />
      <NavRow
        to="/settings/notifications"
        num="03"
        tone="orange"
        title="Notification Settings"
        hint="Alerts, sounds, vibration"
      />
      <NavRow
        to="/settings/appearance"
        num="04"
        tone="purple"
        title="App Appearance"
        hint="Dark, light, neon-blue theme"
      />
      <NavRow
        to="/settings/storage"
        num="05"
        tone="cyan"
        title="Storage & Backup"
        hint="Usage, backup, restore"
      />
      <NavRow
        to="/settings/about"
        num="06"
        tone="red"
        title="About DarkVault"
        hint="App info, policy, version"
      />
      <Button variant="danger" size="xl" className="mt-4 w-full" onClick={lock}>
        <Lock /> Lock vault now
      </Button>
      <div className="pt-4">
        <Tagline />
      </div>
    </div>
  );
}
