import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FolderOpen, ListFilter, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScreenHeader } from "@/components/vault/ScreenHeader";
import { FolderDialog, UploadDialog } from "@/components/vault/DocumentDialogs";
import { FileRow } from "@/components/vault/FileRow";
import { ConfirmDialog } from "@/components/vault/ConfirmDialog";
import { useFileActions } from "@/components/vault/useFileActions";
import { deleteFolder, documentsQuery, foldersQuery } from "@/lib/vault-data";
import { toneVar } from "@/lib/rules";

export const Route = createFileRoute("/_vault/documents/$folderId")({
  head: () => ({
    meta: [
      { title: "Folder — DarkVault" },
      {
        name: "description",
        content: "Every document saved in this folder, with preview and download.",
      },
      { property: "og:title", content: "Folder — DarkVault" },
      { property: "og:description", content: "Files inside one of your vault folders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FolderView,
});

type Sort = "newest" | "oldest" | "name" | "size";

function FolderView() {
  const { folderId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: folders = [], isFetched } = useQuery(foldersQuery);
  const { data: docs = [] } = useQuery(documentsQuery);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const { handlers, dialogs } = useFileActions();

  const folder = folders.find((f) => f.id === folderId);
  const files = docs
    .filter((d) => d.folderId === folderId)
    .sort((a, b) =>
      sort === "newest"
        ? b.addedOn - a.addedOn
        : sort === "oldest"
          ? a.addedOn - b.addedOn
          : sort === "name"
            ? a.fileName.localeCompare(b.fileName)
            : b.sizeBytes - a.sizeBytes,
    );

  if (isFetched && !folder) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">This folder doesn't exist.</p>
        <Link to="/documents" className="mt-4 inline-block font-semibold text-glow">
          Back to Documents
        </Link>
      </div>
    );
  }
  if (!folder) return null;

  return (
    <div style={toneVar(folder.color)}>
      <ScreenHeader
        back
        title={
          <span className="flex items-center gap-2">
            <span className="tone-dot h-6 w-6 shrink-0 rounded-full" />
            <span className="truncate">{folder.name}</span>
          </span>
        }
        subtitle={`${files.length} ${files.length === 1 ? "file" : "files"}`}
        right={
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
              aria-label="Folder options"
            >
              <ListFilter className="h-6 w-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="panel-glow min-w-44">
              <DropdownMenuLabel className="label-caps">Sort by</DropdownMenuLabel>
              {(["newest", "oldest", "name", "size"] as Sort[]).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onSelect={() => setSort(s)}
                  className={sort === s ? "text-glow" : ""}
                >
                  {s === "newest"
                    ? "Newest first"
                    : s === "oldest"
                      ? "Oldest first"
                      : s === "name"
                        ? "Name"
                        : "Largest first"}
                </DropdownMenuItem>
              ))}
              {!folder.isDefault && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <Pencil /> Rename / colour
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 /> Delete folder
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="space-y-3">
        {files.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderOpen className="tone-text h-14 w-14" strokeWidth={1.5} />
            <p className="font-semibold">No files yet</p>
            <p className="text-sm text-muted-foreground">
              Upload a PDF or image to keep it safe here.
            </p>
          </div>
        )}
        {files.map((d) => (
          <FileRow key={d.id} doc={d} {...handlers(d)} />
        ))}
      </div>
      {files.length > 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Only files of thisfolder are shown
        </p>
      )}

      <div className="sticky bottom-24 mt-8">
        <Button variant="neon" size="xl" onClick={() => setUploadOpen(true)}>
          <Upload /> Upload here
        </Button>
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folders={folders}
        defaultFolderId={folder.id}
      />
      <FolderDialog open={editOpen} onOpenChange={setEditOpen} folders={folders} editing={folder} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${folder.name}"?`}
        description={`The folder and its ${files.length} ${files.length === 1 ? "file" : "files"} will be permanently removed.`}
        onConfirm={async () => {
          await deleteFolder(folder.id);
          await qc.invalidateQueries({ queryKey: ["folders"] });
          await qc.invalidateQueries({ queryKey: ["documents"] });
          toast.success("Folder deleted");
          navigate({ to: "/documents", replace: true });
        }}
      />
      {dialogs}
    </div>
  );
}
