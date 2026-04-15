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
      <button type="button" className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={() => fileInputRef.current?.click()}>
        Upload Files
      </button>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

      {activeUploads.length > 0 && (
        <ul className="list-none p-0 mt-2">
          {activeUploads.map((u) => (
            <li key={u.name} className={`py-1.5 text-[13px] ${u.progress === "error" ? "text-red-600" : "text-gray-500"}`}>
              {u.progress === "uploading" ? "uploading..." : "error"} {u.name} {u.progress === "error" && `- ${u.error}`}
            </li>
          ))}
        </ul>
      )}

      {existingFiles.length > 0 && (
        <ul className="list-none p-0 mt-2">
          {existingFiles.map((file) => (
            <li key={file.id} className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <div>
                <span className="text-sm">{file.originalFileName}</span>
                <span className="text-xs text-gray-400 ml-2">{file.contentType} · {formatSize(file.fileSize)}</span>
              </div>
              <button
                type="button"
                className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                onClick={() => removeFileMutation.mutate(file.id)}
                disabled={removeFileMutation.isPending}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
