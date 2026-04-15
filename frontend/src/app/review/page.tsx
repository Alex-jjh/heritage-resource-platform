"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import type { ResourceResponse } from "@/types";

function ReviewQueueContent() {
  const queueQuery = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/reviews/queue"),
  });

  return (
    <main className="max-w-5xl mx-auto px-5 py-5">
      <h1>Review Queue</h1>

      {queueQuery.isLoading ? (
        <p>Loading...</p>
      ) : queueQuery.isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Failed to load the review queue.</div>
      ) : queueQuery.data && queueQuery.data.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No resources pending review.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Title</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Category</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Contributor</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Submitted</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Status</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {queueQuery.data?.map((resource) => (
              <tr key={resource.id}>
                <td className="border border-gray-200 px-3 py-2 text-sm">{resource.title}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{resource.category.name}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{resource.contributorName}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{new Date(resource.updatedAt).toLocaleDateString()}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm"><StatusBadge status={resource.status} /></td>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  <Link href={`/review/${resource.id}`} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 no-underline">Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default function ReviewQueuePage() {
  return (
    <ProtectedRoute requiredRoles={["REVIEWER", "ADMINISTRATOR"]}>
      <ReviewQueueContent />
    </ProtectedRoute>
  );
}
