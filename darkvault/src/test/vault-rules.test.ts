import { describe, expect, it } from "vitest";
import { registerFailure, emptyLockout, isLocked, lockSecondsForLevel } from "@/lib/lockout";
import { validateFolderName, dueAlerts, alertTimes, isValidCode, isOverdue } from "@/lib/rules";

describe("wrong-code lockout", () => {
  it("locks for 30 seconds after 5 wrong codes", () => {
    let s = emptyLockout;
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) s = registerFailure(s, now);
    expect(isLocked(s, now)).toBe(false);
    s = registerFailure(s, now);
    expect(s.lockedUntil - now).toBe(30_000);
  });

  it("locks longer after repeated lockouts", () => {
    expect(lockSecondsForLevel(1)).toBe(30);
    expect(lockSecondsForLevel(2)).toBe(60);
    expect(lockSecondsForLevel(3)).toBe(120);
  });
});

describe("security code", () => {
  it("must be exactly 6 digits", () => {
    expect(isValidCode("123456")).toBe(true);
    expect(isValidCode("12345")).toBe(false);
    expect(isValidCode("12345a")).toBe(false);
  });
});

describe("new folder rules", () => {
  const existing = [{ id: "education", name: "Education" }];
  it("needs 1 to 30 characters", () => {
    expect(validateFolderName("", existing)).not.toBeNull();
    expect(validateFolderName("a".repeat(31), existing)).not.toBeNull();
    expect(validateFolderName("a".repeat(30), existing)).toBeNull();
  });
  it("needs a unique name", () => {
    expect(validateFolderName("education", existing)).not.toBeNull();
    expect(validateFolderName("Medical", existing)).toBeNull();
  });
});

describe("reminder alerts", () => {
  const event = Date.UTC(2026, 10, 12, 10, 0);
  it("creates one alert per chosen schedule", () => {
    expect(alertTimes(event, [0, 60, 1440])).toEqual([
      event - 1440 * 60_000,
      event - 60 * 60_000,
      event,
    ]);
  });
  it("fires 1 hour before but not yet the at-event alert", () => {
    const now = event - 59 * 60_000;
    expect(dueAlerts(event, [0, 60], [], now)).toEqual([60]);
    expect(dueAlerts(event, [0, 60], [60], now)).toEqual([]);
  });
  it("marks past upcoming events as overdue", () => {
    expect(isOverdue({ status: "UPCOMING", dateTime: event }, event + 1)).toBe(true);
    expect(isOverdue({ status: "COMPLETED", dateTime: event }, event + 1)).toBe(false);
  });
});
