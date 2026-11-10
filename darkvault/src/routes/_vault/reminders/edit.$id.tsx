import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/vault/ScreenHeader";
import { ReminderForm } from "@/components/vault/ReminderForm";
import { remindersQuery } from "@/lib/vault-data";

export const Route = createFileRoute("/_vault/reminders/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Reminder — DarkVault" },
      {
        name: "description",
        content: "Change any field of a reminder; its alerts are rescheduled.",
      },
      { property: "og:title", content: "Edit Reminder — DarkVault" },
      { property: "og:description", content: "Update reminder details and alert schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditReminder,
});

function EditReminder() {
  const { id } = Route.useParams();
  const { data: reminders = [], isFetched } = useQuery(remindersQuery);
  const r = reminders.find((x) => x.id === id);
  if (isFetched && (!r || r.status === "COMPLETED")) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">This reminder can't be edited.</p>
        <Link to="/reminders" className="mt-4 inline-block font-semibold text-glow">
          Back to Reminders
        </Link>
      </div>
    );
  }
  if (!r) return null;
  return (
    <div>
      <ScreenHeader back title="Edit Reminder" />
      <ReminderForm initial={r} />
    </div>
  );
}
