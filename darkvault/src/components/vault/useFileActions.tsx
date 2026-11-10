import { useState } from "react";
import { toast } from "sonner";
import type { DocumentMeta } from "@/lib/db";
import { deleteDocument, downloadBlob, readDocumentBlob } from "@/lib/vault-data";
import { PreviewDialog, RenameDialog, useInvalidateVault } from "./DocumentDialogs";
import { ConfirmDialog } from "./ConfirmDialog";

/** Preview / download / rename / delete for files, with the dialogs they need. */
export function useFileActions() {
  const [preview, setPreview] = useState<DocumentMeta | null>(null);
  const [rename, setRename] = useState<DocumentMeta | null>(null);
  const [del, setDel] = useState<DocumentMeta | null>(null);
  const invalidate = useInvalidateVault();

  const download = async (d: DocumentMeta) => {
    try {
      downloadBlob(await readDocumentBlob(d), d.fileName);
    } catch {
      toast.error("Could not download this file");
    }
  };

  const handlers = (d: DocumentMeta) => ({
    onPreview: () => setPreview(d),
    onDownload: () => void download(d),
    onRename: () => setRename(d),
    onDelete: () => setDel(d),
  });

  const dialogs = (
    <>
      <PreviewDialog doc={preview} onOpenChange={(o) => !o && setPreview(null)} />
      <RenameDialog doc={rename} onOpenChange={(o) => !o && setRename(null)} />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete this file?"
        description={`"${del?.fileName ?? ""}" will be permanently removed from your vault.`}
        onConfirm={async () => {
          if (!del) return;
          await deleteDocument(del.id);
          invalidate();
          toast.success("File deleted");
          setDel(null);
        }}
      />
    </>
  );

  return { handlers, dialogs };
}
