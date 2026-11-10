// Encrypted backup file: everything is encrypted with a key derived from the security code.
import { getAll, put, type DocumentMeta, type Folder, type Reminder } from "./db";
import {
  decryptBytes,
  deriveBackupKey,
  encryptBytes,
  fromB64,
  PBKDF2_ITERATIONS,
  randomBytes,
  toB64,
} from "./crypto";
import { downloadBlob, importDocument, readDocumentBytes, wipeVaultContent } from "./vault-data";

interface BackupFile {
  app: "darkvault";
  version: 1;
  createdAt: number;
  salt: string;
  iv: string;
  iterations: number;
  payload: string;
}

interface BackupPayload {
  folders: Folder[];
  documents: (DocumentMeta & { data: string })[];
  reminders: Reminder[];
}

export async function createBackup(code: string) {
  const folders = await getAll<Folder>("folders");
  const docs = await getAll<DocumentMeta>("documents");
  const reminders = await getAll<Reminder>("reminders");
  const documents = [];
  for (const d of docs) documents.push({ ...d, data: toB64(await readDocumentBytes(d.id)) });
  const payload: BackupPayload = { folders, documents, reminders };

  const salt = randomBytes(16);
  const key = await deriveBackupKey(code, salt);
  const { iv, data } = await encryptBytes(
    key,
    new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer,
  );
  const file: BackupFile = {
    app: "darkvault",
    version: 1,
    createdAt: Date.now(),
    salt: toB64(salt),
    iv: toB64(iv),
    iterations: PBKDF2_ITERATIONS,
    payload: toB64(data),
  };
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([JSON.stringify(file)], { type: "application/json" }),
    `darkvault-backup-${stamp}.dvault`,
  );
  return file.createdAt;
}

export async function restoreBackup(file: File, code: string) {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("This isn't a DarkVault backup file");
  }
  if (parsed.app !== "darkvault" || parsed.version !== 1)
    throw new Error("This isn't a DarkVault backup file");
  const key = await deriveBackupKey(code, fromB64(parsed.salt), parsed.iterations);
  let payload: BackupPayload;
  try {
    const plain = await decryptBytes(
      key,
      fromB64(parsed.iv),
      fromB64(parsed.payload).buffer as ArrayBuffer,
    );
    payload = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error("Wrong security code for this backup");
  }
  await wipeVaultContent();
  for (const f of payload.folders) await put("folders", f);
  for (const r of payload.reminders) await put("reminders", r);
  for (const { data, ...meta } of payload.documents) {
    await importDocument(meta, fromB64(data).buffer as ArrayBuffer);
  }
  return { files: payload.documents.length, reminders: payload.reminders.length };
}
