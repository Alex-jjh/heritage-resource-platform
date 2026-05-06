"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import type { FileReferenceDto } from "@/types";

interface FileUploaderProps {
  resourceId: string;
  existingFiles: FileReferenceDto[];
  onFilesChange: () => void;
}

interface UploadingFile {
  name: string;
  progress: "uploading" | "done" | "error";
  error?: string;
}

export function FileUploader({
  resourceId,
  existingFiles,
  onFilesChange,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const queryClient = useQueryClient();

  const removeFileMutation = useMutation({
    mutationFn: (fileRefId: string) =>
      apiClient.delete(`/api/files/${resourceId}/references/${fileRefId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      onFilesChange();
    },
  });

  async function uploadFile(file: File) {
    const entry: UploadingFile = { name: file.name, progress: "uploading" };
    setUploading((prev) => [...prev, entry]);

    const updateEntry = (updates: Partial<UploadingFile>) => {
      setUploading((prev) =>
        prev.map((u) => (u.name === file.name ? { ...u, ...updates } : u))
      );
    };

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("accessToken");
      const resp = await fetch(`/api/files/${resourceId}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        throw new Error(errBody?.message || `Upload failed: ${resp.status}`);
      }

      updateEntry({ progress: "done" });
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      onFilesChange();
    } catch (err) {
      updateEntry({
        progress: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(uploadFile);
    e.target.value = "";
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const activeUploads = uploading.filter((u) => u.progress !== "done");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Upload Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          aria-label="Select files to upload"
        />
        <span className="text-sm text-muted-foreground">
          Attach images, documents, audio, or archive files.
        </span>
      </div>

      {activeUploads.length > 0 && (
        <ul className="space-y-2">
          {activeUploads.map((u) => (
            <li
              key={u.name}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/20 p-3 text-sm"
            >
              {u.progress === "error" ? (
                <X className="size-4 text-destructive" />
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{u.name}</span>
              <span className="text-xs text-muted-foreground">
                {u.progress === "uploading" && "Uploading..."}
                {u.progress === "error" && (
                  <span className="text-destructive">{u.error}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {existingFiles.length > 0 && (
        <ul className="space-y-2">
          {existingFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {file.originalFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file.contentType} / {formatFileSize(file.fileSize)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeFileMutation.mutate(file.id)}
                disabled={removeFileMutation.isPending}
                aria-label={`Remove ${file.originalFileName}`}
                className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
