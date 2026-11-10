// Vault session: setup, unlock, lock, auto-lock, settings, theme, privacy blur and the reminder alert loop.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  defaultSettings,
  getAll,
  kvGet,
  kvSet,
  type Reminder,
  type Settings,
  type UserRecord,
} from "./db";
import { hashCode, PBKDF2_ITERATIONS, randomBytes, toB64, verifyCode } from "./crypto";
import {
  emptyLockout,
  isLocked,
  registerFailure,
  registerSuccess,
  type LockoutState,
} from "./lockout";
import { dueAlerts } from "./rules";
import { sendAlert, verifyFingerprint } from "./device";
import { ensureDefaultFolders, markAlertFired } from "./vault-data";

export type VaultStatus = "loading" | "new" | "locked" | "unlocked";

interface VaultCtx {
  status: VaultStatus;
  user: UserRecord | null;
  settings: Settings;
  lockout: LockoutState;
  setup: (name: string, code: string) => Promise<void>;
  unlock: (code: string) => Promise<"ok" | "wrong" | "locked">;
  unlockWithFingerprint: () => Promise<boolean>;
  lock: () => void;
  checkCode: (code: string) => Promise<boolean>;
  changeCode: (current: string, next: string) => Promise<boolean>;
  updateUser: (patch: Partial<Pick<UserRecord, "name" | "avatar">>) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

const Ctx = createContext<VaultCtx | null>(null);

export function useVault() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVault must be used inside VaultProvider");
  return v;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [user, setUser] = useState<UserRecord | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [lockout, setLockout] = useState<LockoutState>(emptyLockout);
  const hiddenAt = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Load
  useEffect(() => {
    (async () => {
      try {
        const [u, s, l] = await Promise.all([
          kvGet<UserRecord>("user"),
          kvGet<Settings>("settings"),
          kvGet<LockoutState>("lockout"),
        ]);
        setSettings({ ...defaultSettings, ...(s ?? {}) });
        setLockout(l ?? emptyLockout);
        setUser(u ?? null);
        setStatus(u ? "locked" : "new");
      } catch (e) {
        console.error("Vault storage unavailable", e);
        setStatus("new");
      }
    })();
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, [settings.theme]);

  const lock = useCallback(() => {
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, []);

  // Auto-lock + privacy blur when the app goes to the background
  useEffect(() => {
    const onVis = () => {
      const s = settingsRef.current;
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        if (s.blurRecents) document.documentElement.classList.add("privacy-blur");
        if (s.autoLockSeconds === 0) lock();
      } else {
        document.documentElement.classList.remove("privacy-blur");
        if (hiddenAt.current && Date.now() - hiddenAt.current >= s.autoLockSeconds * 1000) lock();
        hiddenAt.current = null;
      }
    };
    const onBlur = () => {
      if (settingsRef.current.blurRecents) document.documentElement.classList.add("privacy-blur");
    };
    const onFocus = () => document.documentElement.classList.remove("privacy-blur");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [lock]);

  // Reminder alerts loop (runs while the app is open, even when locked)
  useEffect(() => {
    if (!user) return;
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const s = settingsRef.current;
        const reminders = await getAll<Reminder>("reminders");
        const now = Date.now();
        let changed = false;
        for (const r of reminders) {
          if (r.status !== "UPCOMING") continue;
          for (const offset of dueAlerts(r.dateTime, r.alertOffsets, r.firedAlerts, now)) {
            await markAlertFired(r.id, offset);
            changed = true;
            if (!s.reminderAlerts) continue;
            const when =
              offset === 0
                ? "Starting now"
                : `In ${offset >= 1440 ? `${offset / 1440} day(s)` : offset >= 60 ? `${offset / 60} hour(s)` : `${offset} min`}`;
            const title =
              s.hideOnLockScreen && document.visibilityState === "hidden"
                ? "DarkVault reminder"
                : r.title;
            const body =
              s.hideOnLockScreen && document.visibilityState === "hidden"
                ? "Open DarkVault to see details"
                : `${when} · ${r.category}`;
            sendAlert(title, body, s);
          }
        }
        if (changed) qc.invalidateQueries({ queryKey: ["reminders"] });
      } finally {
        running = false;
      }
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [user, qc]);

  const saveLockout = async (l: LockoutState) => {
    setLockout(l);
    await kvSet("lockout", l);
  };

  const setup = async (name: string, code: string) => {
    const salt = randomBytes(16);
    const codeHash = await hashCode(code, salt);
    const u: UserRecord = {
      name: name.trim(),
      codeHash,
      salt: toB64(salt),
      iterations: PBKDF2_ITERATIONS,
      createdAt: Date.now(),
    };
    await kvSet("user", u);
    await kvSet("settings", settings);
    await ensureDefaultFolders();
    setUser(u);
    await saveLockout(emptyLockout);
    setStatus("unlocked");
  };

  const checkCode = async (code: string) => {
    if (!user) return false;
    return verifyCode(code, user.salt, user.codeHash, user.iterations);
  };

  const unlock = async (code: string) => {
    const now = Date.now();
    if (isLocked(lockout, now)) return "locked" as const;
    if (await checkCode(code)) {
      await saveLockout(registerSuccess());
      setStatus("unlocked");
      return "ok" as const;
    }
    const next = registerFailure(lockout, now);
    await saveLockout(next);
    return isLocked(next, now) ? ("locked" as const) : ("wrong" as const);
  };

  const unlockWithFingerprint = async () => {
    if (!settings.fingerprintEnabled || !settings.credentialId) return false;
    try {
      const ok = await verifyFingerprint(settings.credentialId);
      if (ok) {
        await saveLockout(registerSuccess());
        setStatus("unlocked");
      }
      return ok;
    } catch {
      return false;
    }
  };

  const changeCode = async (current: string, next: string) => {
    if (!user || !(await checkCode(current))) return false;
    const salt = randomBytes(16);
    const u = {
      ...user,
      codeHash: await hashCode(next, salt),
      salt: toB64(salt),
      iterations: PBKDF2_ITERATIONS,
    };
    await kvSet("user", u);
    setUser(u);
    return true;
  };

  const updateUser = async (patch: Partial<Pick<UserRecord, "name" | "avatar">>) => {
    if (!user) return;
    const u = { ...user, ...patch };
    await kvSet("user", u);
    setUser(u);
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    const s = { ...settingsRef.current, ...patch };
    settingsRef.current = s;
    setSettings(s);
    await kvSet("settings", s);
  };

  return (
    <Ctx.Provider
      value={{
        status,
        user,
        settings,
        lockout,
        setup,
        unlock,
        unlockWithFingerprint,
        lock,
        checkCode,
        changeCode,
        updateUser,
        updateSettings,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
