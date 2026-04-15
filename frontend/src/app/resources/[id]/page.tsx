"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { CommentSection } from "@/components/comment-section";
import type { ResourceResponse, ResourceStatus } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ResourceDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adminError, setAdminError] = useState<string | null>(null);
  const [unpublishReason, setUnpublishReason] = useState("");
  const [showUnpublishForm, setShowUnpublishForm] = useState(false);
  const isAdmin = user?.role === "ADMINISTRATOR";

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiClient.post<ResourceResponse>(`/api/admin/resources/${id}/archive`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["resource", id] }); setAdminError(null); },
    onError: (err) => { setAdminError(err instanceof ApiError ? err.message : "Failed to archive resource."); },
  });

  const unpublishMutation = useMutation({
    mutationFn: (reason: string) => apiClient.post<ResourceResponse>(`/api/admin/resources/${id}/unpublish`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["resource", id] }); setAdminError(null); setShowUnpublishForm(false); setUnpublishReason(""); },
    onError: (err) => { setAdminError(err instanceof ApiError ? err.message : "Failed to unpublish resource."); },
  });

  if (resourceQuery.isLoading) return <div className="max-w-5xl mx-auto px-5 py-5"><p>Loading...</p></div>;

  if (resourceQuery.isError) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-5">
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Resource not found or you don&apos;t have permission to view it.</div>
        <Link href="/browse">← Back to browse</Link>
      </div>
    );
  }

  const resource = resourceQuery.data!;

  return (
    <main className="max-w-5xl mx-auto px-5 py-5">
      <Link href="/browse">← Back to browse</Link>

      <div className="mt-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="m-0">{resource.title}</h1>
          <StatusBadge status={resource.status as ResourceStatus} />
        </div>
        <p className="text-gray-500 text-sm mt-1">
          By {resource.contributorName}
          {resource.approvedAt && (
            <> · Approved on {new Date(resource.approvedAt).toLocaleDateString()}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <strong className="text-xs text-gray-400 uppercase">Category</strong>
          <p className="my-0.5">{resource.category.name}</p>
        </div>
        {resource.place && (
          <div>
            <strong className="text-xs text-gray-400 uppercase">Place</strong>
            <p className="my-0.5">{resource.place}</p>
          </div>
        )}
      </div>

      {resource.tags.length > 0 && (
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {resource.tags.map((tag) => (
            <span key={tag.id} className="bg-gray-200 px-2 py-0.5 rounded-xl text-xs">{tag.name}</span>
          ))}
        </div>
      )}

      {resource.description && (
        <div className="mt-4">
          <h2>Description</h2>
          <p className="whitespace-pre-wrap leading-relaxed">{resource.description}</p>
        </div>
      )}

      <div className="mt-3">
        <strong className="text-xs text-gray-400 uppercase">Copyright</strong>
        <p>{resource.copyrightDeclaration}</p>
      </div>

      <hr className="my-5 border-0 border-t border-gray-200" />

      {resource.fileReferences.length > 0 && (
        <div>
          <h2>File Attachments</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">File Name</th>
                <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Type</th>
                <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Size</th>
                <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {resource.fileReferences.map((file) => (
                <tr key={file.id}>
                  <td className="border border-gray-200 px-3 py-2 text-sm">{file.originalFileName}</td>
                  <td className="border border-gray-200 px-3 py-2 text-sm">{file.contentType}</td>
                  <td className="border border-gray-200 px-3 py-2 text-sm">{formatFileSize(file.fileSize)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-sm">
                    {file.downloadUrl && (
                      <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resource.externalLinks.length > 0 && (
        <div className="mt-4">
          <h2>External Links</h2>
          <ul>
            {resource.externalLinks.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || link.url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && resource.status === "APPROVED" && (
        <div className="bg-white border border-gray-200 rounded p-4 mt-5">
          <h2>Admin Actions</h2>
          {adminError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">{adminError}</div>}
          <div className="flex gap-2">
            <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending || unpublishMutation.isPending}>
              {archiveMutation.isPending ? "Archiving..." : "Archive"}
            </button>
            <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" onClick={() => setShowUnpublishForm(!showUnpublishForm)} disabled={archiveMutation.isPending || unpublishMutation.isPending}>
              Unpublish
            </button>
          </div>
          {showUnpublishForm && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded text-sm mt-3">
              <label htmlFor="unpublish-reason">Reason for unpublishing:</label>
              <textarea id="unpublish-reason" placeholder="Explain why..." value={unpublishReason} onChange={(e) => setUnpublishReason(e.target.value)} rows={3} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 mt-1" />
              <div className="flex gap-2 mt-2">
                <button className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50" onClick={() => unpublishMutation.mutate(unpublishReason.trim())} disabled={unpublishMutation.isPending}>
                  {unpublishMutation.isPending ? "Unpublishing..." : "Confirm Unpublish"}
                </button>
                <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={() => { setShowUnpublishForm(false); setUnpublishReason(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {resource.status === "APPROVED" && <CommentSection resourceId={resource.id} />}
    </main>
  );
}

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute>
      <ResourceDetailContent id={id} />
    </ProtectedRoute>
  );
}
