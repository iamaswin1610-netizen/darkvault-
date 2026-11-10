import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/vault/ScreenHeader";
import { ReminderForm } from "@/components/vault/ReminderForm";

export const Route = createFileRoute("/_vault/reminders/new")({
  validateSearch: (s: Record<string, unknown>): { date?: string | undefined } => {
    const d = s["date"];
    return { date: typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined };
  },
  head: () => ({
    meta: [
      { title: "Add Reminder — DarkVault" },
      {
        name: "description",
        content: "Create a reminder with category, date, time and alert schedule.",
      },
      { property: "og:title", content: "Add Reminder — DarkVault" },
      {
        property: "og:description",
        content: "Schedule alerts for exams, interviews and deadlines.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewReminder,
});

function NewReminder() {
  const { date } = Route.useSearch();
  const isToday = !date || date === new Date().toISOString().slice(0, 10);
  const defaultDate = date && !isToday ? new Date(`${date}T10:00`) : undefined;
  return (
    <div>
      <ScreenHeader back title="Add Reminder" />
      <ReminderForm defaultDate={defaultDate} />
    </div>
  );
}
