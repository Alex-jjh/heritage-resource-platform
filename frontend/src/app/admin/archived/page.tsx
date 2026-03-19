"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { AdminNav } from "@/components/admin-nav";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceResponse } from "@/types";

function ArchivedContent() {
  const archivedQuery = useQuery({
    queryKey: ["archived-resources"],
    queryFn: () =>
      apiClient.get<ResourceResponse[]>("/api/admin/resources/archived"),
  });

  return (
    <main><PageContainer>
      <AdminNav />
      <h1 className="font-serif text-3xl font-bold mb-6">Archived Resources</h1>

      {archivedQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : archivedQuery.isError ? (
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load archived resources.
        </div>
      ) : archivedQuery.data && archivedQuery.data.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">No archived resources.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Contributor</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {archivedQuery.data?.map((resource) => (
                <tr key={resource.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{resource.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{resource.category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{resource.contributorName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={resource.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/resources/${resource.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer></main>
  );
}

export default function AdminArchivedPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <ArchivedContent />
    </ProtectedRoute>
  );
}
