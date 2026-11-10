import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/vault/ScreenHeader";
import { ReminderCard } from "@/components/vault/ReminderCard";
import { remindersQuery } from "@/lib/vault-data";

export const Route = createFileRoute("/_vault/reminders/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming Events — DarkVault" },
      { name: "description", content: "All upcoming and overdue reminders in date order." },
      { property: "og:title", content: "Upcoming Events — DarkVault" },
      { property: "og:description", content: "Every event still ahead of you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Upcoming,
});

function Upcoming() {
  const { data: reminders = [] } = useQuery(remindersQuery);
  const upcoming = reminders.filter((r) => r.status === "UPCOMING");
  return (
    <div>
      <ScreenHeader
        back
        title="Upcoming Events"
        right={<span className="text-xs text-muted-foreground">{upcoming.length} events</span>}
      />
      <div className="space-y-2">
        {upcoming.length === 0 && (
          <p className="panel p-6 text-center text-sm text-muted-foreground">No upcoming events</p>
        )}
        {upcoming.map((r) => (
          <ReminderCard key={r.id} r={r} />
        ))}
      </div>
      <div className="sticky bottom-24 mt-6">
        <Button asChild variant="neon" size="xl" className="w-full">
          <Link to="/reminders/new">
            <Plus /> Add Reminder
          </Link>
        </Button>
      </div>
    </div>
  );
}
