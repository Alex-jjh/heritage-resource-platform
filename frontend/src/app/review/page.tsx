"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceResponse } from "@/types";

function ReviewQueueContent() {
  const queueQuery = useQuery({
    queryKey: ["review-queue"],
    queryFn: () =>
      apiClient.get<ResourceResponse[]>("/api/reviews/queue"),
  });

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl font-bold mb-6">Review Queue</h1>

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
                <tr key={resource.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{resource.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {resource.category.name}
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
