import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderPlus, FolderLock, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScreenHeader, SectionLabel } from "@/components/vault/ScreenHeader";
import { FolderDialog, UploadDialog } from "@/components/vault/DocumentDialogs";
import { FileRow } from "@/components/vault/FileRow";
import { useFileActions } from "@/components/vault/useFileActions";
import { documentsQuery, foldersQuery } from "@/lib/vault-data";
import { toneVar } from "@/lib/rules";

export const Route = createFileRoute("/_vault/documents/")({
  head: () => ({
    meta: [
      { title: "My Documents — DarkVault" },
      { name: "description", content: "Your encrypted document categories and folders." },
      { property: "og:title", content: "My Documents — DarkVault" },
      {
        property: "og:description",
        content: "Upload, organise and preview your private documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Documents,
});

function Documents() {
  const { data: folders = [] } = useQuery(foldersQuery);
  const { data: docs = [] } = useQuery(documentsQuery);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const { handlers, dialogs } = useFileActions();

  const results = q.trim()
    ? docs.filter((d) => d.fileName.toLowerCase().includes(q.trim().toLowerCase()))
    : [];
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name;

  return (
    <div>
      <ScreenHeader
        title={
          <span className="flex items-center gap-2">
            <FolderLock className="h-6 w-6 text-neon" /> My Documents
          </span>
        }
        right={
          <button
            type="button"
            onClick={() => {
              setSearching((s) => !s);
              setQ("");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
            aria-label={searching ? "Close search" : "Search files"}
          >
            {searching ? <X className="h-6 w-6" /> : <Search className="h-6 w-6" />}
          </button>
        }
      />

      {searching && (
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search all files…"
          className="mb-2 h-11 rounded-xl border-primary/60 bg-surface"
        />
      )}

      {searching && q.trim() ? (
        <div className="mt-3 space-y-3">
          {results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No files match "{q}"</p>
          )}
          {results.map((d) => (
            <FileRow key={d.id} doc={d} folderName={folderName(d.folderId)} {...handlers(d)} />
          ))}
        </div>
      ) : (
        <>
          <SectionLabel>Categories</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {folders.map((f, i) => {
              const count = docs.filter((d) => d.folderId === f.id).length;
              return (
                <Link
                  key={f.id}
                  to="/documents/$folderId"
                  params={{ folderId: f.id }}
                  style={{ ...toneVar(f.color), animationDelay: `${i * 50}ms` }}
                  className="tone-tile flex flex-col items-center gap-2 px-3 py-5 text-center transition-transform active:scale-[0.97] animate-rise-in"
                >
                  <span className="tone-dot h-8 w-8 rounded-full" />
                  <p className="w-full truncate font-display text-sm font-bold">{f.name}</p>
                  <p className="-mt-1.5 text-xs text-muted-foreground">
                    ({count} {count === 1 ? "file" : "files"})
                  </p>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {docs.length} {docs.length === 1 ? "file" : "files"} encrypted on this phone
          </p>
        </>
      )}

      <div className="sticky bottom-24 mt-6 grid grid-cols-2 gap-3">
        <Button variant="neon" size="xl" onClick={() => setUploadOpen(true)}>
          <Upload /> Upload
        </Button>
        <Button variant="neonOutline" size="xl" onClick={() => setFolderOpen(true)}>
          <FolderPlus /> New Folder
        </Button>
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} folders={folders} />
      <FolderDialog open={folderOpen} onOpenChange={setFolderOpen} folders={folders} />
      {dialogs}
    </div>
  );
}
