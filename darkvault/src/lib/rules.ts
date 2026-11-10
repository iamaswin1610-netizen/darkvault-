// Pure business rules for folders, reminders and formatting (kept free of browser APIs so they are testable).
import type { CSSProperties } from "react";

export type ToneKey = "blue" | "green" | "orange" | "purple" | "cyan" | "red";
export const TONES: ToneKey[] = ["blue", "green", "orange", "purple", "cyan", "red"];
export const toneVar = (t: ToneKey) => ({ "--tone": `var(--tone-${t})` }) as CSSProperties;

export const DEFAULT_FOLDERS: { id: string; name: string; color: ToneKey }[] = [
  { id: "education", name: "Education", color: "blue" },
  { id: "certifications", name: "Certifications", color: "green" },
  { id: "personal", name: "Personal", color: "orange" },
  { id: "resume", name: "Resume", color: "purple" },
];

/** New folder rules: unique name (case-insensitive), 1 to 30 characters. Returns an error message or null. */
export function validateFolderName(
  name: string,
  existing: { id: string; name: string }[],
  ignoreId?: string,
): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) return "Folder name is required";
  if (trimmed.length > 30) return "Folder name must be 30 characters or fewer";
  const clash = existing.some(
    (f) => f.id !== ignoreId && f.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (clash) return "A folder with this name already exists";
  return null;
}

export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// ---------- Reminders ----------
export type ReminderCategory =
  | "Education"
  | "Certifications"
  | "Professional"
  | "Personal"
  | "Hackathons";

export const REMINDER_CATEGORIES: { name: ReminderCategory; tone: ToneKey }[] = [
  { name: "Education", tone: "blue" },
  { name: "Certifications", tone: "green" },
  { name: "Professional", tone: "cyan" },
  { name: "Personal", tone: "orange" },
  { name: "Hackathons", tone: "purple" },
];

export const categoryTone = (c: string): ToneKey =>
  REMINDER_CATEGORIES.find((x) => x.name === c)?.tone ?? "blue";

/** Alert offsets in minutes before the event. */
export const ALERT_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "At event time" },
  { minutes: 10, label: "10 min before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 10080, label: "1 week before" },
];

export function alertLabel(minutes: number): string {
  const preset = ALERT_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} before`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"} before`;
  return `${minutes} min before`;
}

/** Each chosen offset creates its own alert time (epoch ms). */
export function alertTimes(dateTime: number, offsets: number[]): number[] {
  return [...new Set(offsets)].map((m) => dateTime - m * 60_000).sort((a, b) => a - b);
}

/** Alerts that are due now and not yet fired. Alerts older than 12 hours are skipped (missed while closed). */
export function dueAlerts(
  dateTime: number,
  offsets: number[],
  fired: number[],
  now: number,
): number[] {
  const graceMs = 12 * 60 * 60_000;
  return [...new Set(offsets)].filter((m) => {
    if (fired.includes(m)) return false;
    const t = dateTime - m * 60_000;
    return now >= t && now - t <= graceMs;
  });
}

export function isOverdue(r: { status: string; dateTime: number }, now: number): boolean {
  return r.status === "UPCOMING" && r.dateTime < now;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DV";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}
