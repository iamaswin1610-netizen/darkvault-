import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ScreenHeader, SectionLabel } from "@/components/vault/ScreenHeader";
import { ReminderCard } from "@/components/vault/ReminderCard";
import { remindersQuery } from "@/lib/vault-data";

export const Route = createFileRoute("/_vault/reminders/history")({
  head: () => ({
    meta: [
      { title: "Completed History — DarkVault" },
      { name: "description", content: "Every completed reminder, kept and never deleted." },
      { property: "og:title", content: "Completed History — DarkVault" },
      { property: "og:description", content: "A permanent record of finished events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

function History() {
  const { data: reminders = [] } = useQuery(remindersQuery);
  const done = reminders
    .filter((r) => r.status === "COMPLETED")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const groups = new Map<string, typeof done>();
  for (const r of done) {
    const key = format(r.completedAt ?? r.dateTime, "MMMM yyyy");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div>
      <ScreenHeader back title="Completed History" />
      <p className="rounded-xl border border-success/60 bg-success/10 p-3 text-center text-sm font-bold text-success">
        Records are kept, never deleted
      </p>
      {done.length === 0 && (
        <p className="panel mt-4 p-6 text-center text-sm text-muted-foreground">
          No completed events yet
        </p>
      )}
      {[...groups.entries()].map(([month, items]) => (
        <div key={month}>
          <SectionLabel>{month}</SectionLabel>
          <div className="space-y-2">
            {items.map((r) => (
              <ReminderCard key={r.id} r={r} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
