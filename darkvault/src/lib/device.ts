// Device features: fingerprint (WebAuthn platform authenticator), sounds, vibration, notifications.
import { toast } from "sonner";
import { fromB64, randomBytes, toB64 } from "./crypto";
import type { Settings } from "./db";

// ---------- Fingerprint ----------
export async function biometricsAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerFingerprint(userName: string): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32) as BufferSource,
      rp: { name: "DarkVault" },
      user: {
        id: randomBytes(16) as BufferSource,
        name: userName || "DarkVault user",
        displayName: userName || "DarkVault user",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Fingerprint setup was cancelled");
  return toB64(cred.rawId);
}

export async function verifyFingerprint(credentialId: string): Promise<boolean> {
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32) as BufferSource,
      allowCredentials: [{ type: "public-key", id: fromB64(credentialId) as BufferSource }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  return !!res;
}

// ---------- Sound ----------
let audioCtx: AudioContext | null = null;
export function playAlertSound(sound: Settings["sound"], volume: number) {
  if (sound === "silent" || volume <= 0) return;
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const v = (volume / 100) * 0.35;
    const notes: [number, number, number][] =
      sound === "cyber-ping"
        ? [
            [1320, 0, 0.12],
            [1760, 0.14, 0.22],
          ]
        : sound === "pulse"
          ? [
              [660, 0, 0.09],
              [660, 0.15, 0.09],
              [660, 0.3, 0.09],
            ]
          : [
              [880, 0, 0.35],
              [587, 0.4, 0.45],
            ];
    const now = ctx.currentTime;
    for (const [freq, start, dur] of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = sound === "pulse" ? "square" : "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(v, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(g).connect(gain);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    }
  } catch {
    /* audio not available */
  }
}

export const VIBRATION_PATTERNS: Record<Settings["pattern"], number[]> = {
  short: [120],
  double: [100, 80, 100],
  long: [450],
};

export function vibrate(pattern: Settings["pattern"]) {
  try {
    navigator.vibrate?.(VIBRATION_PATTERNS[pattern]);
  } catch {
    /* not supported */
  }
}

// ---------- Notifications ----------
export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export function sendAlert(title: string, body: string, settings: Settings) {
  playAlertSound(settings.sound, settings.volume);
  if (settings.vibration) vibrate(settings.pattern);
  let shown = false;
  if (notificationsSupported() && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icon-192.png", tag: `${title}-${body}` });
      shown = true;
    } catch {
      shown = false;
    }
  }
  if (!shown || document.visibilityState === "visible") {
    toast(title, { description: body });
  }
}
