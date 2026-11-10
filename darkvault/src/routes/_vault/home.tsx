import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Bell, FileText, GraduationCap, Lock, Settings, User } from "lucide-react";
import hacker from "@/assets/hooded_hacker_binary.jpg";
import { BinaryRain } from "@/components/vault/BinaryRain";
import { SectionLabel } from "@/components/vault/ScreenHeader";
import { documentsQuery, remindersQuery } from "@/lib/vault-data";
import { useVault } from "@/lib/vault";
import { DEFAULT_FOLDERS, toneVar } from "@/lib/rules";
import { format } from "date-fns";

export const Route = createFileRoute("/_vault/home")({
  head: () => ({
    meta: [
      { title: "Home — DarkVault" },
      {
        name: "description",
        content:
          "Your vault dashboard with Education, Certifications, Personal and Resume categories.",
      },
      { property: "og:title", content: "Home — DarkVault" },
      { property: "og:description", content: "Your personal vault is ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const ICONS = {
  education: GraduationCap,
  certifications: Award,
  personal: User,
  resume: FileText,
} as const;

function Home() {
  const { user, lock, settings } = useVault();
  const { data: docs = [] } = useQuery(documentsQuery);
  const { data: reminders = [] } = useQuery(remindersQuery);
  const firstName = user?.name.split(" ")[0] ?? "";
  const next = reminders.find((r) => r.status === "UPCOMING" && r.dateTime >= Date.now());

  return (
    <div>
      <section className="relative -mx-5 h-56 overflow-hidden border-b border-primary/60 shadow-[var(--shadow-neon)]">
        <img
          src={hacker}
          alt=""
          width={864}
          height={1536}
          className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
        />
        <BinaryRain
          active={settings.binaryRain}
          density={16}
          className="absolute inset-0 h-full w-full opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="relative flex items-center justify-between px-5 pt-5">
          <button
            type="button"
            onClick={lock}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/40 text-on-image backdrop-blur hover:bg-background/60"
            aria-label="Lock vault"
          >
            <Lock className="h-5 w-5" />
          </button>
          <Link
            to="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/40 text-glow backdrop-blur hover:bg-background/60"
            aria-label="Settings"
          >
            <Settings className="h-6 w-6" />
          </Link>
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <h1 className="text-3xl font-bold text-on-image">Hello, {firstName} </h1>
          <p className="mt-1 text-sm font-medium text-glow">Your personal vault is ready!</p>
        </div>
      </section>

      <SectionLabel>Categories</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        {DEFAULT_FOLDERS.map((f, i) => {
          const Icon = ICONS[f.id as keyof typeof ICONS];
          const count = docs.filter((d) => d.folderId === f.id).length;
          return (
            <Link
              key={f.id}
              to="/documents/$folderId"
              params={{ folderId: f.id }}
              style={{ ...toneVar(f.color), animationDelay: `${i * 70}ms` }}
              className="tone-tile flex aspect-[4/5] flex-col items-center justify-center gap-3 p-4 text-center transition-transform active:scale-[0.97] animate-rise-in"
            >
              <Icon
                className="tone-text h-14 w-14 drop-shadow-[0_0_14px_var(--tone)]"
                strokeWidth={1.8}
              />
              <div>
                <p className="font-display text-base font-bold">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {count} {count === 1 ? "File" : "Files"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {next && (
        <>
          <SectionLabel>Next reminder</SectionLabel>
          <Link
            to="/reminders/$id"
            params={{ id: next.id }}
            className="panel flex items-center gap-3 p-4 hover:bg-accent"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-glow">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{next.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(next.dateTime, "EEE, MMM d · h:mm a")} | {next.category}
              </p>
            </div>
          </Link>
        </>
      )}
    </div>
  );
}
