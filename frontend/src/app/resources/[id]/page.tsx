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

  if (resourceQuery.isLoading) return <div className="container"><p>Loading...</p></div>;

  if (resourceQuery.isError) {
    return (
      <div className="container">
        <div className="error-msg">Resource not found or you don&apos;t have permission to view it.</div>
        <Link href="/browse">← Back to browse</Link>
      </div>
    );
  }

  const resource = resourceQuery.data!;

  return (
    <main className="container">
      <Link href="/browse">← Back to browse</Link>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>{resource.title}</h1>
          <StatusBadge status={resource.status as ResourceStatus} />
        </div>
        <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
          By {resource.contributorName}
          {resource.approvedAt && (
            <> · Approved on {new Date(resource.approvedAt).toLocaleDateString()}</>
          )}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div>
          <strong style={{ fontSize: 12, color: "#888", textTransform: "uppercase" }}>Category</strong>
          <p style={{ margin: "2px 0" }}>{resource.category.name}</p>
        </div>
        {resource.place && (
          <div>
            <strong style={{ fontSize: 12, color: "#888", textTransform: "uppercase" }}>Place</strong>
            <p style={{ margin: "2px 0" }}>{resource.place}</p>
          </div>
        )}
      </div>

      {resource.tags.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {resource.tags.map((tag) => (
            <span key={tag.id} style={{ background: "#e8e8e8", padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>{tag.name}</span>
          ))}
        </div>
      )}

      {resource.description && (
        <div style={{ marginTop: 16 }}>
          <h2>Description</h2>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{resource.description}</p>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <strong style={{ fontSize: 12, color: "#888", textTransform: "uppercase" }}>Copyright</strong>
        <p>{resource.copyrightDeclaration}</p>
      </div>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #ddd" }} />

      {resource.fileReferences.length > 0 && (
        <div>
          <h2>File Attachments</h2>
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {resource.fileReferences.map((file) => (
                <tr key={file.id}>
                  <td>{file.originalFileName}</td>
                  <td>{file.contentType}</td>
                  <td>{formatFileSize(file.fileSize)}</td>
                  <td>
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
        <div style={{ marginTop: 16 }}>
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
        <div className="card" style={{ marginTop: 20 }}>
          <h2>Admin Actions</h2>
          {adminError && <div className="error-msg">{adminError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending || unpublishMutation.isPending}>
              {archiveMutation.isPending ? "Archiving..." : "📦 Archive"}
            </button>
            <button className="btn btn-sm" onClick={() => setShowUnpublishForm(!showUnpublishForm)} disabled={archiveMutation.isPending || unpublishMutation.isPending}>
              ↩ Unpublish
            </button>
          </div>
          {showUnpublishForm && (
            <div className="warning-msg" style={{ marginTop: 12 }}>
              <label htmlFor="unpublish-reason">Reason for unpublishing:</label>
              <textarea id="unpublish-reason" placeholder="Explain why..." value={unpublishReason} onChange={(e) => setUnpublishReason(e.target.value)} rows={3} style={{ marginTop: 4 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-sm btn-danger" onClick={() => unpublishMutation.mutate(unpublishReason.trim())} disabled={unpublishMutation.isPending}>
                  {unpublishMutation.isPending ? "Unpublishing..." : "Confirm Unpublish"}
                </button>
                <button className="btn btn-sm" onClick={() => { setShowUnpublishForm(false); setUnpublishReason(""); }}>Cancel</button>
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
