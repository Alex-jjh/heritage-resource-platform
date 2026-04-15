"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
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

export function FileUploader({ resourceId, existingFiles, onFilesChange }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const queryClient = useQueryClient();

  const removeFileMutation = useMutation({
    mutationFn: (fileRefId: string) => apiClient.delete(`/api/files/${resourceId}/references/${fileRefId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      onFilesChange();
    },
  });

  async function uploadFile(file: File) {
    const entry: UploadingFile = { name: file.name, progress: "uploading" };
    setUploading((prev) => [...prev, entry]);

    const updateEntry = (updates: Partial<UploadingFile>) => {
      setUploading((prev) => prev.map((u) => (u.name === file.name ? { ...u, ...updates } : u)));
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
      updateEntry({ progress: "error", error: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(uploadFile);
    e.target.value = "";
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const activeUploads = uploading.filter((u) => u.progress !== "done");

  return (
    <div>
      <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
        📎 Upload Files
      </button>
      <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFileSelect} />

      {activeUploads.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
          {activeUploads.map((u) => (
            <li key={u.name} style={{ padding: "6px 0", fontSize: 13, color: u.progress === "error" ? "#c00" : "#666" }}>
              {u.progress === "uploading" ? "⏳" : "❌"} {u.name} {u.progress === "error" && `- ${u.error}`}
            </li>
          ))}
        </ul>
      )}

      {existingFiles.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
          {existingFiles.map((file) => (
            <li key={file.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #eee" }}>
              <div>
                <span style={{ fontSize: 14 }}>{file.originalFileName}</span>
                <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{file.contentType} · {formatSize(file.fileSize)}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => removeFileMutation.mutate(file.id)}
                disabled={removeFileMutation.isPending}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
