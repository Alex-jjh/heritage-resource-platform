"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { AdminNav } from "@/components/admin-nav";
import type { ResourceResponse } from "@/types";

function ArchivedContent() {
  const queryClient = useQueryClient();
  const archivedQuery = useQuery({
    queryKey: ["archived-resources"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/admin/resources/archived"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/resources/${id}/restore`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["archived-resources"] }); },
  });

  return (
    <main className="container">
      <AdminNav />

      {archivedQuery.isLoading ? (
        <p>Loading...</p>
      ) : archivedQuery.isError ? (
        <div className="error-msg">Failed to load archived resources.</div>
      ) : archivedQuery.data && archivedQuery.data.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: 40 }}>No archived resources.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Contributor</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {archivedQuery.data?.map((resource) => (
              <tr key={resource.id}>
                <td>{resource.title}</td>
                <td>{resource.category.name}</td>
                <td>{resource.contributorName}</td>
                <td><StatusBadge status={resource.status} /></td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => restoreMutation.mutate(resource.id)}
                      disabled={restoreMutation.isPending}
                    >
                      {restoreMutation.isPending ? "Restoring..." : "🔄 Restore"}
                    </button>
                    <Link href={`/resources/${resource.id}`} className="btn btn-sm">View</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default function AdminArchivedPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <ArchivedContent />
    </ProtectedRoute>
  );
}
