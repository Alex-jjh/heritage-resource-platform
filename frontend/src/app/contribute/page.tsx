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
    <main className="max-w-5xl mx-auto px-5 py-5">
      <div className="flex justify-between items-center mb-5">
        <h1>My Resources</h1>
        <Link href="/contribute/new" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 no-underline">+ New Resource</Link>
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded text-sm mb-3">{successMsg}</div>}

      {resourcesQuery.isLoading ? (
        <p>Loading...</p>
      ) : resourcesQuery.isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Failed to load your resources.</div>
      ) : resourcesQuery.data && resourcesQuery.data.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400">You haven&apos;t created any resources yet.</p>
          <Link href="/contribute/new" className="bg-white border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50 no-underline inline-block mt-3">Create your first resource</Link>
        </div>
      ) : (
        <div>
          {resourcesQuery.data?.map((resource) => {
            const status = resource.status as ResourceStatus;
            const isDraft = status === "DRAFT";
            const isRejected = status === "REJECTED";

            return (
              <div key={resource.id} className="bg-white border border-gray-200 rounded p-4 mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="m-0 mb-1">{resource.title}</h3>
                    <p className="m-0 text-[13px] text-gray-500">
                      {resource.category.name}
                      {resource.place && <> · {resource.place}</>}
                      {" · Updated "}
                      {new Date(resource.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="mt-2.5 flex gap-2 flex-wrap">
                  <Link href={`/resources/${resource.id}`} className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 no-underline text-inherit">View</Link>
                  {isDraft && (
                    <>
                      <Link href={`/contribute/${resource.id}/edit`} className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 no-underline text-inherit">Edit</Link>
                      <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50" onClick={() => submitMutation.mutate(resource.id)} disabled={submitMutation.isPending}>
                        {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
                      </button>
                    </>
                  )}
                  {isRejected && (
                    <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" onClick={() => reviseMutation.mutate(resource.id)} disabled={reviseMutation.isPending}>
                      {reviseMutation.isPending ? "Revising..." : "Revise"}
                    </button>
                  )}
                </div>

                {(isRejected || isDraft) && resource.reviewFeedbacks && resource.reviewFeedbacks.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded text-sm mt-2.5">
                    <strong>Reviewer Feedback:</strong>
                    {resource.reviewFeedbacks.map((fb) => (
                      <div key={fb.id} className="mt-1">
                        <p className="m-0">{fb.comments}</p>
                        <p className="mt-0.5 mb-0 text-xs text-gray-400">
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
