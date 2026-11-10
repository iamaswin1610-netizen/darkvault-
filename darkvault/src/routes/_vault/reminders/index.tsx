import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { Bell, BellOff, History, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScreenHeader, SectionLabel } from "@/components/vault/ScreenHeader";
import { MonthCalendar } from "@/components/vault/MonthCalendar";
import { ReminderCard } from "@/components/vault/ReminderCard";
import { remindersQuery } from "@/lib/vault-data";
import { notificationsSupported, requestNotificationPermission } from "@/lib/device";

export const Route = createFileRoute("/_vault/reminders/")({
  head: () => ({
    meta: [
      { title: "Reminders — DarkVault" },
      {
        name: "description",
        content: "Today's events, upcoming events and your reminder calendar.",
      },
      { property: "og:title", content: "Reminders — DarkVault" },
      {
        property: "og:description",
        content: "Never miss an exam, interview or hackathon deadline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemindersHome,
});

function RemindersHome() {
  const { data: reminders = [] } = useQuery(remindersQuery);
  const [selected, setSelected] = useState(new Date());
  const [perm, setPerm] = useState(() =>
    notificationsSupported() ? Notification.permission : "denied",
  );

  const upcoming = reminders.filter((r) => r.status === "UPCOMING");
  const dayEvents = upcoming.filter((r) => isSameDay(r.dateTime, selected));
  const next = upcoming
    .filter((r) => !isSameDay(r.dateTime, selected) && r.dateTime > Date.now())
    .slice(0, 3);
  const overdue = upcoming.filter(
    (r) => r.dateTime < Date.now() && !isSameDay(r.dateTime, selected),
  );

  const askPermission = async () => {
    const p = await requestNotificationPermission();
    if (p === "unsupported") toast.error("This browser can't show notifications");
    else {
      setPerm(p);
      if (p === "granted") toast.success("Reminder alerts are on");
      else toast.error("Notifications are blocked — allow them in your phone settings");
    }
  };

  return (
    <div>
      <ScreenHeader
        title="Reminders"
        right={
          <button
            type="button"
            onClick={askPermission}
            className="flex h-10 w-10 items-center justify-center rounded-full text-glow hover:bg-accent"
            aria-label="Notification permission"
          >
            {perm === "granted" ? (
              <Bell className="h-6 w-6 fill-current drop-shadow-[0_0_10px_var(--glow)]" />
            ) : (
              <BellOff className="h-6 w-6 text-warning" />
            )}
          </button>
        }
      />

      {perm !== "granted" && (
        <button
          type="button"
          onClick={askPermission}
          className="mb-2 w-full rounded-xl border border-warning/60 bg-warning/10 p-3 text-left text-xs font-semibold text-warning"
        >
          Tap to allow notifications so DarkVault can alert you.
        </button>
      )}

      <SectionLabel
        right={
          <span className="text-xs text-muted-foreground">{format(selected, "EEE, MMM d")}</span>
        }
      >
        {isToday(selected) ? "Today's events" : "Events on this day"}
      </SectionLabel>
      <div className="space-y-2">
        {dayEvents.length === 0 && (
          <p className="panel p-4 text-center text-sm text-muted-foreground">Nothing scheduled</p>
        )}
        {dayEvents.map((r) => (
          <ReminderCard key={r.id} r={r} right="time" />
        ))}
      </div>

      {overdue.length > 0 && (
        <>
          <SectionLabel>Overdue</SectionLabel>
          <div className="space-y-2">
            {overdue.map((r) => (
              <ReminderCard key={r.id} r={r} right="date" />
            ))}
          </div>
        </>
      )}

      <SectionLabel>Calendar</SectionLabel>
      <MonthCalendar reminders={upcoming} selected={selected} onSelect={setSelected} />

      <SectionLabel
        right={
          <Link to="/reminders/upcoming" className="text-xs font-bold text-glow">
            View all &gt;
          </Link>
        }
      >
        Upcoming events
      </SectionLabel>
      <div className="space-y-2">
        {next.length === 0 && (
          <p className="panel p-4 text-center text-sm text-muted-foreground">No upcoming events</p>
        )}
        {next.map((r) => (
          <ReminderCard key={r.id} r={r} right="date" />
        ))}
      </div>

      <Link
        to="/reminders/history"
        className="mt-4 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <History className="h-4 w-4" /> Completed history
      </Link>

      <div className="sticky bottom-24 mt-4">
        <Button asChild variant="neon" size="xl" className="w-full">
          <Link to="/reminders/new" search={{ date: format(selected, "yyyy-MM-dd") }}>
            <Plus /> Add Reminder
          </Link>
        </Button>
      </div>
    </div>
  );
}
