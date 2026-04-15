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
    <main className="container">
      <h1>Review Queue</h1>

      {queueQuery.isLoading ? (
        <p>Loading...</p>
      ) : queueQuery.isError ? (
        <div className="error-msg">Failed to load the review queue.</div>
      ) : queueQuery.data && queueQuery.data.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: 40 }}>No resources pending review.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Contributor</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queueQuery.data?.map((resource) => (
              <tr key={resource.id}>
                <td>{resource.title}</td>
                <td>{resource.category.name}</td>
                <td>{resource.contributorName}</td>
                <td>{new Date(resource.updatedAt).toLocaleDateString()}</td>
                <td><StatusBadge status={resource.status} /></td>
                <td>
                  <Link href={`/review/${resource.id}`} className="btn btn-sm btn-primary">Review</Link>
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
