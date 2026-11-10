import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import type { Reminder } from "@/lib/db";
import { categoryTone, isOverdue, toneVar } from "@/lib/rules";

export function ReminderCard({ r, right }: { r: Reminder; right?: "time" | "date" }) {
  const overdue = isOverdue(r, Date.now());
  const done = r.status === "COMPLETED";
  return (
    <Link
      to="/reminders/$id"
      params={{ id: r.id }}
      style={toneVar(categoryTone(r.category))}
      className="panel flex items-stretch gap-3 p-3 transition-colors hover:bg-accent"
    >
      <span className="tone-bar w-1 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{r.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {done && r.completedAt
            ? `Completed ${format(r.completedAt, "MMM d, h:mm a")} | ${r.category}`
            : right === "time"
              ? r.category
              : `${format(r.dateTime, "EEE, MMM d")} | ${r.category}`}
        </p>
      </div>
      {done ? (
        <CheckCircle2 className="h-6 w-6 shrink-0 self-center text-success" />
      ) : (
        <div className="shrink-0 self-center text-right">
          <p className="text-xs font-bold text-glow">
            {right === "date" ? format(r.dateTime, "MMM d") : format(r.dateTime, "h:mm a")}
          </p>
          {overdue && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-warning">Overdue</p>
          )}
        </div>
      )}
    </Link>
  );
}
