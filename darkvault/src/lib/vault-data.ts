// Folders, documents and reminders — all stored locally, file contents encrypted.
import { queryOptions } from "@tanstack/react-query";
import {
  clearStore,
  getAll,
  getOne,
  put,
  remove,
  uid,
  type DocumentMeta,
  type EncryptedBlob,
  type Folder,
  type Reminder,
} from "./db";
import { decryptBytes, encryptBytes, getDeviceKey } from "./crypto";
import { DEFAULT_FOLDERS, type ToneKey } from "./rules";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function ensureDefaultFolders() {
  const folders = await getAll<Folder>("folders");
  for (const [i, f] of DEFAULT_FOLDERS.entries()) {
    if (!folders.some((x) => x.id === f.id)) {
      await put<Folder>("folders", { ...f, isDefault: true, createdAt: i });
    }
  }
}

export const foldersQuery = queryOptions({
  queryKey: ["folders"],
  queryFn: async () => {
    await ensureDefaultFolders();
    const all = await getAll<Folder>("folders");
    return all.sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt,
    );
  },
});

export const documentsQuery = queryOptions({
  queryKey: ["documents"],
  queryFn: async () => {
    const all = await getAll<DocumentMeta>("documents");
    return all.sort((a, b) => b.addedOn - a.addedOn);
  },
});

export const remindersQuery = queryOptions({
  queryKey: ["reminders"],
  queryFn: async () => {
    const all = await getAll<Reminder>("reminders");
    return all.sort((a, b) => a.dateTime - b.dateTime);
  },
});

// ---------- Folders ----------
export async function createFolder(name: string, color: ToneKey) {
  const folder: Folder = {
    id: uid(),
    name: name.trim(),
    color,
    isDefault: false,
    createdAt: Date.now(),
  };
  await put("folders", folder);
  return folder;
}

export async function updateFolder(folder: Folder) {
  await put("folders", folder);
}

export async function deleteFolder(id: string) {
  const docs = await getAll<DocumentMeta>("documents");
  for (const d of docs.filter((x) => x.folderId === id)) await deleteDocument(d.id);
  await remove("folders", id);
}

// ---------- Documents ----------
export async function uploadDocument(file: File, folderId: string) {
  if (file.size > MAX_FILE_BYTES) throw new Error("File is larger than 25 MB");
  const key = await getDeviceKey();
  const { iv, data } = await encryptBytes(key, await file.arrayBuffer());
  const id = uid();
  await put<EncryptedBlob>("blobs", { id, iv, data });
  const meta: DocumentMeta = {
    id,
    folderId,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    addedOn: Date.now(),
  };
  await put("documents", meta);
  return meta;
}

export async function importDocument(meta: DocumentMeta, bytes: ArrayBuffer) {
  const key = await getDeviceKey();
  const { iv, data } = await encryptBytes(key, bytes);
  await put<EncryptedBlob>("blobs", { id: meta.id, iv, data });
  await put("documents", meta);
}

export async function readDocumentBytes(id: string): Promise<ArrayBuffer> {
  const blob = await getOne<EncryptedBlob>("blobs", id);
  if (!blob) throw new Error("File data missing");
  return decryptBytes(await getDeviceKey(), blob.iv, blob.data);
}

export async function readDocumentBlob(meta: DocumentMeta): Promise<Blob> {
  return new Blob([await readDocumentBytes(meta.id)], { type: meta.mimeType });
}

export async function renameDocument(meta: DocumentMeta, fileName: string) {
  await put("documents", { ...meta, fileName: fileName.trim() });
}

export async function deleteDocument(id: string) {
  await remove("blobs", id);
  await remove("documents", id);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---------- Reminders ----------
export async function saveReminder(
  r: Omit<Reminder, "id" | "createdAt" | "firedAlerts" | "status"> & { id?: string | undefined },
) {
  const existing = r.id ? await getOne<Reminder>("reminders", r.id) : undefined;
  const reminder: Reminder = {
    id: existing?.id ?? uid(),
    createdAt: existing?.createdAt ?? Date.now(),
    status: existing?.status ?? "UPCOMING",
    completedAt: existing?.completedAt,
    title: r.title.trim(),
    category: r.category,
    dateTime: r.dateTime,
    alertOffsets: [...new Set(r.alertOffsets)].sort((a, b) => a - b),
    description: r.description.trim(),
    // editing reschedules every alert
    firedAlerts: [],
  };
  await put("reminders", reminder);
  return reminder;
}

export async function completeReminder(r: Reminder) {
  await put<Reminder>("reminders", { ...r, status: "COMPLETED", completedAt: Date.now() });
}

export async function markAlertFired(id: string, offset: number) {
  const r = await getOne<Reminder>("reminders", id);
  if (!r) return;
  await put<Reminder>("reminders", { ...r, firedAlerts: [...new Set([...r.firedAlerts, offset])] });
}

export async function wipeVaultContent() {
  await clearStore("documents");
  await clearStore("blobs");
  await clearStore("reminders");
  await clearStore("folders");
}
