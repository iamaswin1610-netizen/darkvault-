import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentMeta, Folder } from "@/lib/db";
import { TONES, toneVar, validateFolderName, formatBytes, type ToneKey } from "@/lib/rules";
import {
  createFolder,
  downloadBlob,
  MAX_FILE_BYTES,
  readDocumentBlob,
  renameDocument,
  updateFolder,
  uploadDocument,
} from "@/lib/vault-data";
import { cn } from "@/lib/utils";

const dialogCls = "panel-glow max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-sm";

export function useInvalidateVault() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["folders"] });
  };
}

// ---------- Upload ----------
export function UploadDialog({
  open,
  onOpenChange,
  folders,
  defaultFolderId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folders: Folder[];
  defaultFolderId?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [folderId, setFolderId] = useState(defaultFolderId ?? folders[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const invalidate = useInvalidateVault();

  useEffect(() => {
    if (open) {
      setFile(null);
      setFolderId(defaultFolderId ?? folders[0]?.id ?? "");
    }
  }, [open, defaultFolderId, folders]);

  const save = async () => {
    if (!file || !folderId) return;
    setSaving(true);
    try {
      await uploadDocument(file, folderId);
      invalidate();
      toast.success("File saved and encrypted", { description: file.name });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the file");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle className="text-center">Upload Document</DialogTitle>
          <DialogDescription className="text-center">
            PDF or image, up to {formatBytes(MAX_FILE_BYTES)}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/60 bg-surface-strong/50 p-5 text-sm hover:bg-accent"
        >
          {file ? (
            <>
              <FileText className="h-8 w-8 text-glow" />
              <span className="max-w-full truncate font-semibold">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(file.size)} · tap to change
              </span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-glow" />
              <span className="font-semibold">Pick a file</span>
            </>
          )}
        </button>

        <div>
          <p className="label-caps mb-2">Choose the category</p>
          <div className="grid grid-cols-2 gap-2">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                style={toneVar(f.color)}
                onClick={() => setFolderId(f.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold",
                  folderId === f.id ? "tone-soft" : "border-border bg-surface",
                )}
              >
                <span className="tone-dot h-3 w-3 shrink-0 rounded-full" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="neonOutline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="neon" size="lg" disabled={!file || !folderId || saving} onClick={save}>
            {saving && <Loader2 className="animate-spin" />} Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- New / edit folder ----------
export function FolderDialog({
  open,
  onOpenChange,
  folders,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folders: Folder[];
  editing?: Folder;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ToneKey>("blue");
  const [touched, setTouched] = useState(false);
  const invalidate = useInvalidateVault();

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setColor(editing?.color ?? "cyan");
      setTouched(false);
    }
  }, [open, editing]);

  const error = validateFolderName(name, folders, editing?.id);

  const save = async () => {
    setTouched(true);
    if (error) return;
    if (editing) {
      await updateFolder({ ...editing, name: name.trim(), color });
      toast.success("Folder updated");
    } else {
      await createFolder(name, color);
      toast.success("Folder created", { description: name.trim() });
    }
    invalidate();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {editing ? "Edit Folder" : "Create New Folder"}
          </DialogTitle>
          <DialogDescription className="sr-only">Name and colour for the folder</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="folder-name" className="label-caps block">
            Folder name
          </label>
          <Input
            id="folder-name"
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Medical"
            className="h-12 rounded-xl border-primary/70 bg-background text-base"
          />
          <div className="flex justify-between text-xs">
            <span className="text-destructive">{touched && error}</span>
            <span className="text-muted-foreground">{name.trim().length}/30</span>
          </div>
        </div>
        <div>
          <p className="label-caps mb-3">Folder colour</p>
          <div className="flex justify-between">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                aria-label={t}
                aria-pressed={color === t}
                onClick={() => setColor(t)}
                style={toneVar(t)}
                className={cn(
                  "tone-dot h-10 w-10 rounded-full transition-transform",
                  color === t &&
                    "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background",
                )}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="neonOutline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="neon" size="lg" onClick={save}>
            {editing ? "Save" : "Create"}
          </Button>
        </div>
        {!editing && (
          <p className="text-center text-xs text-muted-foreground">
            New folder appears in the Documents grid
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Rename file ----------
export function RenameDialog({
  doc,
  onOpenChange,
}: {
  doc: DocumentMeta | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [name, setName] = useState("");
  const invalidate = useInvalidateVault();
  useEffect(() => {
    if (doc) setName(doc.fileName);
  }, [doc]);
  const valid = name.trim().length > 0 && name.trim().length <= 120;
  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle className="text-center">Rename File</DialogTitle>
          <DialogDescription className="sr-only">New file name</DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-xl border-primary/70 bg-background text-base"
          aria-label="File name"
        />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="neonOutline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="neon"
            size="lg"
            disabled={!valid}
            onClick={async () => {
              if (!doc) return;
              await renameDocument(doc, name);
              invalidate();
              toast.success("File renamed");
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Preview ----------
export function PreviewDialog({
  doc,
  onOpenChange,
}: {
  doc: DocumentMeta | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!doc) return;
    let objectUrl: string | null = null;
    setUrl(null);
    setFailed(false);
    readDocumentBlob(doc)
      .then((b) => {
        setBlob(b);
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc]);

  const isImage = doc?.mimeType.startsWith("image/");
  const isPdf = doc?.mimeType === "application/pdf";

  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] max-w-[calc(100%-1rem)] flex-col gap-3 rounded-2xl border-primary/60 bg-background p-3 sm:max-w-md [&>button:last-child]:hidden">
        <DialogHeader className="px-1 pt-1 text-left">
          <DialogTitle className="truncate text-base">{doc?.fileName}</DialogTitle>
          <DialogDescription>{doc && formatBytes(doc.sizeBytes)}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-border bg-surface">
          {failed && <p className="text-sm text-destructive">Could not open this file.</p>}
          {!url && !failed && <Loader2 className="h-8 w-8 animate-spin text-glow" />}
          {url && isImage && (
            <img src={url} alt={doc?.fileName} className="max-h-full max-w-full object-contain" />
          )}
          {url && isPdf && (
            <iframe src={url} title={doc?.fileName} className="h-full w-full rounded-xl bg-card" />
          )}
          {url && !isImage && !isPdf && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-2 h-10 w-10 text-glow" />
              Preview isn't available for this file type. Download to open it.
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="neon"
            size="lg"
            disabled={!blob}
            onClick={() => blob && doc && downloadBlob(blob, doc.fileName)}
          >
            <Download /> Download
          </Button>
          <Button variant="neonOutline" size="lg" onClick={() => onOpenChange(false)}>
            <X /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
