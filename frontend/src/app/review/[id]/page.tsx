"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import type { ResourceResponse, ResourceStatus } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReviewDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiClient.post<ResourceResponse>(`/api/reviews/${id}/approve`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["resource", id] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["featured-resources"] });
      router.push("/review");
    },
    onError: (err) => { setActionError(err instanceof ApiError ? err.message : "Failed to approve."); },
  });

  const rejectMutation = useMutation({
    mutationFn: (comments: string) => apiClient.post<ResourceResponse>(`/api/reviews/${id}/reject`, { comments }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["resource", id] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      router.push("/review");
    },
    onError: (err) => { setActionError(err instanceof ApiError ? err.message : "Failed to reject."); },
  });

  function handleReject() {
    setFeedbackError(null);
    setActionError(null);
    if (!feedback.trim()) { setFeedbackError("Feedback is required when rejecting."); return; }
    rejectMutation.mutate(feedback.trim());
  }

  function handleApprove() {
    setActionError(null);
    approveMutation.mutate();
  }

  if (resourceQuery.isLoading) return <div className="container"><p>Loading...</p></div>;

  if (resourceQuery.isError) {
    return (
      <div className="container">
        <div className="error-msg">Resource not found or you don&apos;t have permission to review it.</div>
        <Link href="/review">← Back to review queue</Link>
      </div>
    );
  }

  const resource = resourceQuery.data!;
  const isPending = resource.status === "PENDING_REVIEW";
  const isActing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <main className="container">
      <Link href="/review">← Back to review queue</Link>

      <div style={{ display: "flex", gap: 30, marginTop: 16, flexWrap: "wrap" }}>
        {/* Left: Resource details */}
        <div style={{ flex: 2, minWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{resource.title}</h1>
            <StatusBadge status={resource.status as ResourceStatus} />
          </div>
          <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
            By {resource.contributorName} · Submitted {new Date(resource.updatedAt).toLocaleDateString()}
          </p>

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
                  <tr><th>File</th><th>Type</th><th>Size</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {resource.fileReferences.map((file) => (
                    <tr key={file.id}>
                      <td>{file.originalFileName}</td>
                      <td>{file.contentType}</td>
                      <td>{formatFileSize(file.fileSize)}</td>
                      <td>{file.downloadUrl && <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>}</td>
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
        </div>

        {/* Right: Review actions */}
        <div style={{ flex: 1, minWidth: 250 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Review Actions</h2>

            {!isPending ? (
              <p style={{ color: "#888" }}>
                This resource is no longer pending review. Status: <StatusBadge status={resource.status as ResourceStatus} />
              </p>
            ) : (
              <>
                {actionError && <div className="error-msg">{actionError}</div>}

                <button className="btn btn-primary" style={{ width: "100%", marginBottom: 12 }} onClick={handleApprove} disabled={isActing}>
                  {approveMutation.isPending ? "Approving..." : "✅ Approve"}
                </button>

                <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #ddd" }} />

                <div className="form-group">
                  <label htmlFor="reject-feedback">Rejection Feedback</label>
                  <textarea
                    id="reject-feedback"
                    placeholder="Explain why this resource is being rejected..."
                    value={feedback}
                    onChange={(e) => { setFeedback(e.target.value); if (feedbackError) setFeedbackError(null); }}
                    rows={4}
                  />
                  {feedbackError && <p style={{ color: "#c00", fontSize: 13 }}>{feedbackError}</p>}
                </div>
                <button className="btn btn-danger" style={{ width: "100%" }} onClick={handleReject} disabled={isActing}>
                  {rejectMutation.isPending ? "Rejecting..." : "❌ Reject"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute requiredRoles={["REVIEWER", "ADMINISTRATOR"]}>
      <ReviewDetailContent id={id} />
    </ProtectedRoute>
  );
}
