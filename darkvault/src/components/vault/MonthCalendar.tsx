import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Reminder } from "@/lib/db";
import { categoryTone, toneVar } from "@/lib/rules";
import { cn } from "@/lib/utils";

export function MonthCalendar({
  reminders,
  selected,
  onSelect,
}: {
  reminders: Reminder[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const [month, setMonth] = useState(startOfMonth(selected));
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = getDay(days[0] ?? month);

  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="rounded-full p-1.5 text-glow hover:bg-accent"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-display text-sm font-bold">{format(month, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="rounded-full p-1.5 text-glow hover:bg-accent"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`l${i}`} />
        ))}
        {days.map((d) => {
          const dayEvents = reminders.filter((r) => isSameDay(r.dateTime, d));
          const isSel = isSameDay(d, selected);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              className="flex flex-col items-center gap-0.5 py-0.5"
              aria-label={format(d, "MMMM d")}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  isSel &&
                    "bg-primary font-bold text-primary-foreground shadow-[var(--shadow-glow)]",
                  !isSel && isToday(d) && "border border-glow text-glow",
                )}
              >
                {format(d, "d")}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {dayEvents.slice(0, 3).map((r) => (
                  <span
                    key={r.id}
                    style={toneVar(categoryTone(r.category))}
                    className="tone-dot h-1.5 w-1.5 rounded-full"
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
