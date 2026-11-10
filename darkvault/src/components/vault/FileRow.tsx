import { Eye, FileImage, FileText, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentMeta } from "@/lib/db";
import { formatBytes } from "@/lib/rules";

export function FileRow({
  doc,
  folderName,
  onPreview,
  onDownload,
  onRename,
  onDelete,
}: {
  doc: DocumentMeta;
  folderName?: string | undefined;
  onPreview: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const Icon = doc.mimeType.startsWith("image/") ? FileImage : FileText;
  return (
    <div className="panel flex items-center gap-3 p-3">
      <button
        type="button"
        onClick={onPreview}
        className="flex h-14 w-12 shrink-0 items-center justify-center rounded-md bg-foreground/90 text-background"
        aria-label={`Preview ${doc.fileName}`}
      >
        <Icon className="h-6 w-6" />
      </button>
      <button type="button" onClick={onPreview} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-bold">{doc.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {format(doc.addedOn, "MMM d, yyyy")} | {formatBytes(doc.sizeBytes)}
          {folderName && ` | ${folderName}`}
        </p>
      </button>
      <button
        type="button"
        onClick={onPreview}
        className="flex h-9 w-9 items-center justify-center rounded-full text-glow hover:bg-accent"
        aria-label="Preview"
      >
        <Eye className="h-5 w-5" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-9 w-7 items-center justify-center rounded-full text-foreground hover:bg-accent"
          aria-label="File actions"
        >
          <MoreVertical className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="panel-glow min-w-36">
          <DropdownMenuItem onSelect={onPreview}>Preview</DropdownMenuItem>
          <DropdownMenuItem onSelect={onDownload}>Download</DropdownMenuItem>
          <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
