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
    <main className="max-w-5xl mx-auto px-5 py-5">
      <AdminNav />

      {archivedQuery.isLoading ? (
        <p>Loading...</p>
      ) : archivedQuery.isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Failed to load archived resources.</div>
      ) : archivedQuery.data && archivedQuery.data.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No archived resources.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Title</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Category</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Contributor</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Status</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {archivedQuery.data?.map((resource) => (
              <tr key={resource.id}>
                <td className="border border-gray-200 px-3 py-2 text-sm">{resource.title}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{resource.category.name}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{resource.contributorName}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm"><StatusBadge status={resource.status} /></td>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  <div className="flex gap-1">
                    <button
                      className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50"
                      onClick={() => restoreMutation.mutate(resource.id)}
                      disabled={restoreMutation.isPending}
                    >
                      {restoreMutation.isPending ? "Restoring..." : "Restore"}
                    </button>
                    <Link href={`/resources/${resource.id}`} className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 no-underline text-inherit">View</Link>
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
