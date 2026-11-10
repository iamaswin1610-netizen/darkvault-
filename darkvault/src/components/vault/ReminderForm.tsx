import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "./Chip";
import type { Reminder } from "@/lib/db";
import { ALERT_PRESETS, alertLabel, REMINDER_CATEGORIES, type ReminderCategory } from "@/lib/rules";
import { saveReminder } from "@/lib/vault-data";
import { requestNotificationPermission } from "@/lib/device";

const fieldCls = "h-12 rounded-xl border-primary/60 bg-surface text-base";

export function ReminderForm({
  initial,
  defaultDate,
}: {
  initial?: Reminder | undefined;
  defaultDate?: Date | undefined;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const start = initial
    ? new Date(initial.dateTime)
    : (defaultDate ?? new Date(Date.now() + 60 * 60_000));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<ReminderCategory>(initial?.category ?? "Education");
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(initial ? format(start, "HH:mm") : "10:00");
  const [offsets, setOffsets] = useState<number[]>(initial?.alertOffsets ?? [0, 60]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"min" | "hour" | "day">("min");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const dateTime = new Date(`${date}T${time}`).getTime();
  const errors = {
    title: !title.trim()
      ? "Event name is required"
      : title.trim().length > 80
        ? "Keep it under 80 characters"
        : null,
    date: Number.isNaN(dateTime) ? "Pick a date and time" : null,
    offsets: offsets.length === 0 ? "Pick at least one alert" : null,
  };
  const valid = !errors.title && !errors.date && !errors.offsets;

  const toggle = (m: number) =>
    setOffsets((o) => (o.includes(m) ? o.filter((x) => x !== m) : [...o, m]));

  const addCustom = () => {
    const n = parseInt(customValue, 10);
    if (!n || n < 1 || n > 999) return;
    const minutes = n * (customUnit === "min" ? 1 : customUnit === "hour" ? 60 : 1440);
    if (minutes > 60 * 24 * 60) return;
    setOffsets((o) => (o.includes(minutes) ? o : [...o, minutes]));
    setCustomValue("");
  };

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    const saved = await saveReminder({
      id: initial?.id,
      title,
      category,
      dateTime,
      alertOffsets: offsets,
      description: description.slice(0, 500),
    });
    await qc.invalidateQueries({ queryKey: ["reminders"] });
    void requestNotificationPermission();
    toast.success(initial ? "Reminder updated — alerts rescheduled" : "Reminder saved");
    navigate({ to: "/reminders/$id", params: { id: saved.id }, replace: true });
  };

  const customOffsets = offsets.filter((m) => !ALERT_PRESETS.some((p) => p.minutes === m));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="r-title" className="label-caps block">
          Event name
        </label>
        <Input
          id="r-title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hackathon Round 2 submission"
          className={fieldCls}
        />
        {touched && errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div>
        <p className="label-caps mb-2">Event category</p>
        <div className="flex flex-wrap gap-2">
          {REMINDER_CATEGORIES.map((c) => (
            <Chip
              key={c.name}
              tone={c.tone}
              selected={category === c.name}
              onClick={() => setCategory(c.name)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="label-caps mb-2">Date and time</p>
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <Input
            type="date"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${fieldCls}`}
          />
          <Input
            type="time"
            aria-label="Time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`${fieldCls}`}
          />
        </div>
        {touched && errors.date && <p className="mt-1 text-xs text-destructive">{errors.date}</p>}
      </div>

      <div>
        <p className="label-caps mb-2">Notification schedule</p>
        <div className="flex flex-wrap gap-2">
          {ALERT_PRESETS.map((p) => (
            <Chip
              key={p.minutes}
              selected={offsets.includes(p.minutes)}
              onClick={() => toggle(p.minutes)}
            >
              {p.label}
            </Chip>
          ))}
          {customOffsets.map((m) => (
            <Chip key={m} selected onClick={() => toggle(m)}>
              <span className="flex items-center gap-1">
                {alertLabel(m)} <X className="h-3 w-3" />
              </span>
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Custom"
            aria-label="Custom alert amount"
            className="h-10 w-24 rounded-lg border-border bg-surface"
          />
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value as typeof customUnit)}
            aria-label="Custom alert unit"
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
          >
            <option value="min">min before</option>
            <option value="hour">hours before</option>
            <option value="day">days before</option>
          </select>
          <Button
            type="button"
            variant="neonOutline"
            size="icon"
            className="h-10 w-10"
            onClick={addCustom}
            aria-label="Add custom alert"
          >
            <Plus />
          </Button>
        </div>
        {touched && errors.offsets && (
          <p className="mt-1 text-xs text-destructive">{errors.offsets}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="r-desc" className="label-caps block">
          Description (optional)
        </label>
        <Textarea
          id="r-desc"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="e.g. Upload final project video and GitHub link before the deadline."
          className="rounded-xl border-border bg-surface text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="neonOutline" size="xl" onClick={() => router.history.back()}>
          Cancel
        </Button>
        <Button variant="neon" size="xl" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save Reminder
        </Button>
      </div>
    </div>
  );
}
