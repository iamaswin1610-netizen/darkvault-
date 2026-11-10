// Local-only storage (IndexedDB). Nothing leaves the phone.
import type { ReminderCategory, ToneKey } from "./rules";

export interface UserRecord {
  name: string;
  codeHash: string; // base64 PBKDF2-SHA256
  salt: string; // base64
  iterations: number;
  createdAt: number;
  avatar?: string | undefined; // data URL
}

export interface Settings {
  theme: "dark" | "light";
  binaryRain: boolean;
  autoLockSeconds: number; // 0 = immediately
  fingerprintEnabled: boolean;
  credentialId?: string | undefined;
  hideOnLockScreen: boolean;
  blurRecents: boolean;
  reminderAlerts: boolean;
  sound: "cyber-ping" | "pulse" | "beacon" | "silent";
  volume: number; // 0-100
  vibration: boolean;
  pattern: "short" | "double" | "long";
  lastBackup?: number | undefined;
}

export const defaultSettings: Settings = {
  theme: "dark",
  binaryRain: true,
  autoLockSeconds: 60,
  fingerprintEnabled: false,
  hideOnLockScreen: true,
  blurRecents: true,
  reminderAlerts: true,
  sound: "cyber-ping",
  volume: 70,
  vibration: true,
  pattern: "double",
};

export interface Folder {
  id: string;
  name: string;
  color: ToneKey;
  isDefault: boolean;
  createdAt: number;
}

export interface DocumentMeta {
  id: string;
  folderId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  addedOn: number;
}

export interface EncryptedBlob {
  id: string;
  iv: Uint8Array;
  data: ArrayBuffer;
}

export interface Reminder {
  id: string;
  title: string;
  category: ReminderCategory;
  dateTime: number;
  alertOffsets: number[];
  description: string;
  status: "UPCOMING" | "COMPLETED";
  completedAt?: number | undefined;
  createdAt: number;
  firedAlerts: number[];
}

const DB_NAME = "darkvault";
const DB_VERSION = 1;
export type StoreName = "kv" | "folders" | "documents" | "blobs" | "reminders";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("folders"))
        db.createObjectStore("folders", { keyPath: "id" });
      if (!db.objectStoreNames.contains("documents")) {
        const s = db.createObjectStore("documents", { keyPath: "id" });
        s.createIndex("folderId", "folderId");
      }
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("reminders"))
        db.createObjectStore("reminders", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name: StoreName, mode: IDBTransactionMode = "readonly") {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return wrap((await store("kv")).get(key)) as Promise<T | undefined>;
}
export async function kvSet<T>(key: string, value: T): Promise<void> {
  await wrap((await store("kv", "readwrite")).put(value, key));
}
export async function kvDelete(key: string): Promise<void> {
  await wrap((await store("kv", "readwrite")).delete(key));
}

export async function getAll<T>(name: StoreName): Promise<T[]> {
  return wrap((await store(name)).getAll()) as Promise<T[]>;
}
export async function getOne<T>(name: StoreName, id: string): Promise<T | undefined> {
  return wrap((await store(name)).get(id)) as Promise<T | undefined>;
}
export async function put<T>(name: StoreName, value: T): Promise<void> {
  await wrap((await store(name, "readwrite")).put(value));
}
export async function remove(name: StoreName, id: string): Promise<void> {
  await wrap((await store(name, "readwrite")).delete(id));
}
export async function clearStore(name: StoreName): Promise<void> {
  await wrap((await store(name, "readwrite")).clear());
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
