import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScreenHeader, SectionLabel } from "@/components/vault/ScreenHeader";
import { UserAvatar } from "@/components/vault/UserAvatar";
import { useVault } from "@/lib/vault";
import { documentsQuery, remindersQuery } from "@/lib/vault-data";

export const Route = createFileRoute("/_vault/settings/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings — DarkVault" },
      {
        name: "description",
        content: "Change your name, profile picture and view account information.",
      },
      { property: "og:title", content: "Profile Settings — DarkVault" },
      { property: "og:description", content: "Your DarkVault profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

async function resizeImage(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Profile() {
  const { user, updateUser } = useVault();
  const { data: docs = [] } = useQuery(documentsQuery);
  const { data: reminders = [] } = useQuery(remindersQuery);
  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const fileRef = useRef<HTMLInputElement>(null);
  const upcoming = reminders.filter((r) => r.status === "UPCOMING").length;
  const valid = name.trim().length > 0 && name.trim().length <= 40;
  const dirty = name.trim() !== user?.name || avatar !== user?.avatar;

  const rows: [string, string][] = [
    ["Account type", "Local (this phone only)"],
    ["Vault created", user ? format(user.createdAt, "MMM d, yyyy") : "—"],
    ["Documents stored", `${docs.length} ${docs.length === 1 ? "file" : "files"}`],
    ["Reminders", `${upcoming} upcoming`],
  ];

  return (
    <div>
      <ScreenHeader back title="Profile Settings" />
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative rounded-full ring-2 ring-glow ring-offset-4 ring-offset-background"
          aria-label="Change profile picture"
        >
          <UserAvatar name={name || user?.name || ""} src={avatar} className="h-28 w-28 text-4xl" />
          <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-glow text-background">
            <Camera className="h-4 w-4" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setAvatar(await resizeImage(f));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-4 text-sm font-bold text-glow"
        >
          Change Profile Picture
        </button>
        {avatar && (
          <button
            type="button"
            onClick={() => setAvatar(undefined)}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" /> Remove picture
          </button>
        )}
      </div>

      <SectionLabel>Name</SectionLabel>
      <Input
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        className="h-12 rounded-xl border-primary/70 bg-surface text-base"
        aria-label="Name"
      />

      <SectionLabel>Account information</SectionLabel>
      <dl className="panel divide-y divide-border px-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-3 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <Button
        variant="neon"
        size="xl"
        className="mt-6 w-full"
        disabled={!valid || !dirty}
        onClick={async () => {
          await updateUser({ name: name.trim(), avatar });
          toast.success("Profile saved");
        }}
      >
        Save Changes
      </Button>
    </div>
  );
}
