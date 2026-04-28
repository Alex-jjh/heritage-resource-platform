"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceResponse } from "@/types";

function ReviewQueueContent() {
  const queueQuery = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/reviews/queue"),
  });

  return (
    <main>
      <PageContainer>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Review Queue</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review pending submissions and manage publication decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/review/history">
              <Button variant="outline">Review History</Button>
            </Link>
            <Link href="/featured">
              <Button variant="outline">Featured</Button>
            </Link>
          </div>
        </div>

        {queueQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : queueQuery.isError ? (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
          >
            Failed to load the review queue. Please try again.
          </div>
        ) : queueQuery.data && queueQuery.data.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">
              No resources pending review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Contributor</th>
                  <th className="px-4 py-3 text-left font-medium">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {queueQuery.data?.map((resource) => (
                  <tr
                    key={resource.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{resource.title || "Untitled draft"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {resource.category?.name || "No category selected"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {resource.contributorName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <time dateTime={resource.updatedAt}>
                        {new Date(resource.updatedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={resource.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/review/${resource.id}`}>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
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