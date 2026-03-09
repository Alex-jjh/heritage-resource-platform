"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import type {
  FileReferenceDto,
  UploadUrlResponse,
  FileReferenceRequest,
} from "@/types";

interface FileUploaderProps {
  resourceId: string;
  existingFiles: FileReferenceDto[];
  onFilesChange: () => void;
}

interface UploadingFile {
  name: string;
  progress: "requesting-url" | "uploading" | "registering" | "done" | "error";
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
    const entry: UploadingFile = { name: file.name, progress: "requesting-url" };
    setUploading((prev) => [...prev, entry]);

    const updateEntry = (updates: Partial<UploadingFile>) => {
      setUploading((prev) =>
        prev.map((u) => (u.name === file.name ? { ...u, ...updates } : u))
      );
    };

    try {
      // 1. Get pre-signed URL
      const urlResp = await apiClient.post<UploadUrlResponse>(
        "/api/files/upload-url",
        {
          resourceId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }
      );

      // 2. PUT file directly to S3 (raw fetch, no auth header)
      updateEntry({ progress: "uploading" });
      const putResp = await fetch(urlResp.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!putResp.ok) {
        throw new Error(`S3 upload failed: ${putResp.status}`);
      }

      // 3. Register file reference
      updateEntry({ progress: "registering" });
      const refBody: FileReferenceRequest = {
        s3Key: urlResp.s3Key,
        originalFileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size,
      };
      await apiClient.post(`/api/files/${resourceId}/references`, refBody);

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
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Remove completed uploads from the uploading list
  const activeUploads = uploading.filter(
    (u) => u.progress !== "done"
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 size-4" />
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
      </div>

      {/* Active uploads */}
      {activeUploads.length > 0 && (
        <ul className="space-y-2">
          {activeUploads.map((u) => (
            <li
              key={u.name}
              className="flex items-center gap-2 rounded-md border p-2 text-sm"
            >
              {u.progress === "error" ? (
                <X className="size-4 text-destructive" />
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{u.name}</span>
              <span className="text-xs text-muted-foreground">
                {u.progress === "requesting-url" && "Preparing…"}
                {u.progress === "uploading" && "Uploading…"}
                {u.progress === "registering" && "Registering…"}
                {u.progress === "error" && (
                  <span className="text-destructive">{u.error}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <ul className="space-y-2">
          {existingFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.originalFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file.contentType} · {formatFileSize(file.fileSize)}
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
