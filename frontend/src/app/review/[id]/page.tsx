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

  if (resourceQuery.isLoading) return <div className="max-w-5xl mx-auto px-5 py-5"><p>Loading...</p></div>;

  if (resourceQuery.isError) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-5">
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Resource not found or you don&apos;t have permission to review it.</div>
        <Link href="/review">← Back to review queue</Link>
      </div>
    );
  }

  const resource = resourceQuery.data!;
  const isPending = resource.status === "PENDING_REVIEW";
  const isActing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <main className="max-w-5xl mx-auto px-5 py-5">
      <Link href="/review">← Back to review queue</Link>

      <div className="flex gap-8 mt-4 flex-wrap">
        {/* Left: Resource details */}
        <div className="flex-[2] min-w-[300px]">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0">{resource.title}</h1>
            <StatusBadge status={resource.status as ResourceStatus} />
          </div>
          <p className="text-gray-500 text-sm mt-1">
            By {resource.contributorName} · Submitted {new Date(resource.updatedAt).toLocaleDateString()}
          </p>

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
                    <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">File</th>
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
                      <td className="border border-gray-200 px-3 py-2 text-sm">{file.downloadUrl && <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>}</td>
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
        </div>

        {/* Right: Review actions */}
        <div className="flex-1 min-w-[250px]">
          <div className="bg-white border border-gray-200 rounded p-4">
            <h2 className="mt-0">Review Actions</h2>

            {!isPending ? (
              <p className="text-gray-400">
                This resource is no longer pending review. Status: <StatusBadge status={resource.status as ResourceStatus} />
              </p>
            ) : (
              <>
                {actionError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">{actionError}</div>}

                <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50 w-full mb-3" onClick={handleApprove} disabled={isActing}>
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </button>

                <hr className="my-3 border-0 border-t border-gray-200" />

                <div className="mb-4">
                  <label htmlFor="reject-feedback" className="block text-sm font-bold mb-1">Rejection Feedback</label>
                  <textarea
                    id="reject-feedback"
                    placeholder="Explain why this resource is being rejected..."
                    value={feedback}
                    onChange={(e) => { setFeedback(e.target.value); if (feedbackError) setFeedbackError(null); }}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  {feedbackError && <p className="text-red-600 text-[13px]">{feedbackError}</p>}
                </div>
                <button className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50 w-full" onClick={handleReject} disabled={isActing}>
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
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
