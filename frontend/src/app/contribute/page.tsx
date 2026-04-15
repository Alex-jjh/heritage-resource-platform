"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import type { ResourceResponse, ResourceStatus } from "@/types";

function ContributeDashboardContent() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: ["my-resources"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/resources/mine"),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/resources/${id}/submit`),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["my-resources"] });
      setSuccessMsg("Resource submitted for review!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  const reviseMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/resources/${id}/revise`),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["my-resources"] });
      setSuccessMsg("Resource moved back to draft for revision.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>My Resources</h1>
        <Link href="/contribute/new" className="btn btn-primary">+ New Resource</Link>
      </div>

      {successMsg && <div className="success-msg">{successMsg}</div>}

      {resourcesQuery.isLoading ? (
        <p>Loading...</p>
      ) : resourcesQuery.isError ? (
        <div className="error-msg">Failed to load your resources.</div>
      ) : resourcesQuery.data && resourcesQuery.data.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#888" }}>You haven&apos;t created any resources yet.</p>
          <Link href="/contribute/new" className="btn" style={{ marginTop: 12 }}>Create your first resource</Link>
        </div>
      ) : (
        <div>
          {resourcesQuery.data?.map((resource) => {
            const status = resource.status as ResourceStatus;
            const isDraft = status === "DRAFT";
            const isRejected = status === "REJECTED";

            return (
              <div key={resource.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>{resource.title}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                      {resource.category.name}
                      {resource.place && <> · {resource.place}</>}
                      {" · Updated "}
                      {new Date(resource.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/resources/${resource.id}`} className="btn btn-sm">👁 View</Link>
                  {isDraft && (
                    <>
                      <Link href={`/contribute/${resource.id}/edit`} className="btn btn-sm">✏️ Edit</Link>
                      <button className="btn btn-sm btn-primary" onClick={() => submitMutation.mutate(resource.id)} disabled={submitMutation.isPending}>
                        {submitMutation.isPending ? "Submitting..." : "📤 Submit for Review"}
                      </button>
                    </>
                  )}
                  {isRejected && (
                    <button className="btn btn-sm" onClick={() => reviseMutation.mutate(resource.id)} disabled={reviseMutation.isPending}>
                      {reviseMutation.isPending ? "Revising..." : "🔄 Revise"}
                    </button>
                  )}
                </div>

                {(isRejected || isDraft) && resource.reviewFeedbacks && resource.reviewFeedbacks.length > 0 && (
                  <div className="warning-msg" style={{ marginTop: 10 }}>
                    <strong>Reviewer Feedback:</strong>
                    {resource.reviewFeedbacks.map((fb) => (
                      <div key={fb.id} style={{ marginTop: 4 }}>
                        <p style={{ margin: 0 }}>{fb.comments}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#999" }}>
                          {fb.decision} · {new Date(fb.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function ContributePage() {
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}>
      <ContributeDashboardContent />
    </ProtectedRoute>
  );
}
