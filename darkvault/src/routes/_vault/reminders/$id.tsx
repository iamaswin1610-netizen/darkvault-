import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/vault/ScreenHeader";
import { completeReminder, remindersQuery } from "@/lib/vault-data";
import { alertLabel, categoryTone, isOverdue, toneVar } from "@/lib/rules";

export const Route = createFileRoute("/_vault/reminders/$id")({
  head: () => ({
    meta: [
      { title: "Event Details — DarkVault" },
      { name: "description", content: "Reminder details, alerts and description." },
      { property: "og:title", content: "Event Details — DarkVault" },
      { property: "og:description", content: "View, edit or complete a reminder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReminderDetails,
});

function ReminderDetails() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: reminders = [], isFetched } = useQuery(remindersQuery);
  const [busy, setBusy] = useState(false);
  const r = reminders.find((x) => x.id === id);

  if (isFetched && !r) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">This reminder doesn't exist.</p>
        <Link to="/reminders" className="mt-4 inline-block font-semibold text-glow">
          Back to Reminders
        </Link>
      </div>
    );
  }
  if (!r) return null;

  const done = r.status === "COMPLETED";
  const overdue = isOverdue(r, Date.now());

  return (
    <div>
      <ScreenHeader back title={done ? "Completed Event" : "Event Details"} />
      <section style={toneVar(categoryTone(r.category))} className="panel-glow p-5">
        <p className="label-caps">Event details</p>
        <h2 className="mt-2 text-xl font-bold">{r.title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="tone-solid rounded-full px-3 py-1 text-xs font-bold">{r.category}</span>
          {overdue && (
            <span className="rounded-full border border-warning px-3 py-1 text-xs font-bold text-warning">
              Overdue
            </span>
          )}
          {done && (
            <span className="rounded-full border border-success px-3 py-1 text-xs font-bold text-success">
              Completed
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{done ? "Scheduled:" : "Date:"}</dt>
          <dd className="font-medium">{format(r.dateTime, "EEE, MMM d, yyyy | h:mm a")}</dd>
          {done && r.completedAt && (
            <>
              <dt className="text-muted-foreground">Completed:</dt>
              <dd className="font-medium text-success">
                {format(r.completedAt, "MMM d, yyyy | h:mm a")}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Alerts:</dt>
          <dd className="font-medium">{r.alertOffsets.map(alertLabel).join(", ")}</dd>
        </dl>

        {r.description && (
          <>
            <p className="label-caps mt-5">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{r.description}</p>
          </>
        )}

        {done ? (
          <p className="mt-6 text-xs text-muted-foreground">
            Read-only record — kept in Completed History.
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button asChild variant="neonOutline" size="xl">
                <Link to="/reminders/edit/$id" params={{ id: r.id }}>
                  Edit
                </Link>
              </Button>
              <Button
                variant="success"
                size="xl"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await completeReminder(r);
                  await qc.invalidateQueries({ queryKey: ["reminders"] });
                  toast.success("Moved to Completed History");
                  navigate({ to: "/reminders/history" });
                }}
              >
                {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark Completed
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Marking it done moves it to Completed History
            </p>
          </>
        )}
      </section>
    </div>
  );
}
