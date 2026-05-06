"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { History, Inbox, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceResponse } from "@/types";

function ReviewQueueContent() {
  const router = useRouter();
  const [nextTaskError, setNextTaskError] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/reviews/queue"),
  });

  const nextTaskMutation = useMutation({
    mutationFn: () => apiClient.post<ResourceResponse | undefined>("/api/tasks/next"),
    onSuccess: (task) => {
      if (!task) {
        setNextTaskError("No available review tasks right now.");
        return;
      }
      setNextTaskError(null);
      router.push(`/review/${task.id}`);
    },
    onError: (error) => {
      setNextTaskError(
        error instanceof Error ? error.message : "Failed to get next task."
      );
    },
  });

  return (
    <main>
      <PageContainer
        wide
        eyebrow="Editorial Review"
        title="Review Queue"
        lede="Review pending submissions and manage publication decisions."
        rightSlot={
          <>
            <Button
              onClick={() => nextTaskMutation.mutate()}
              disabled={nextTaskMutation.isPending}
            >
              <Inbox className="size-4" />
              {nextTaskMutation.isPending ? "Loading..." : "Get Next Task"}
            </Button>
            <Link href="/review/history">
              <Button variant="outline">
                <History className="size-4" />
                Review History
              </Button>
            </Link>
            <Link href="/featured">
              <Button variant="outline">
                <Star className="size-4" />
                Featured
              </Button>
            </Link>
          </>
        }
      >
        {nextTaskError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            {nextTaskError}
          </div>
        )}

        {queueQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : queueQuery.isError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            Failed to load the review queue. Please try again.
          </div>
        ) : queueQuery.data && queueQuery.data.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white py-16 text-center shadow-[var(--shadow-heritage-card)]">
            <p className="font-serif text-xl text-foreground">
              No resources pending review.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-heritage-card)]">
            <div className="grid grid-cols-12 border-b border-border bg-secondary/40 px-6 py-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <div style={{ gridColumn: "span 3 / span 3" }}>Title</div>
              <div style={{ gridColumn: "span 3 / span 3" }}>Category</div>
              <div style={{ gridColumn: "span 2 / span 2" }}>Contributor</div>
              <div style={{ gridColumn: "span 2 / span 2" }}>Submitted</div>
              <div style={{ gridColumn: "span 1 / span 1" }}>Status</div>
              <div className="text-right" style={{ gridColumn: "span 1 / span 1" }}>
                Action
              </div>
            </div>
            {queueQuery.data?.map((resource) => (
              <div
                key={resource.id}
                className="grid grid-cols-12 items-center border-b border-border px-6 py-4 text-sm last:border-0 hover:bg-secondary/30"
              >
                <div className="font-serif text-base font-medium" style={{ gridColumn: "span 3 / span 3" }}>
                  {resource.title || "Untitled draft"}
                </div>
                <div className="text-muted-foreground" style={{ gridColumn: "span 3 / span 3" }}>
                  {resource.category?.name || "No category selected"}
                </div>
                <div className="text-muted-foreground" style={{ gridColumn: "span 2 / span 2" }}>
                  {resource.contributorName}
                </div>
                <div className="text-muted-foreground" style={{ gridColumn: "span 2 / span 2" }}>
                  <time dateTime={resource.updatedAt}>
                    {new Date(resource.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <div style={{ gridColumn: "span 1 / span 1" }}>
                  <StatusBadge status={resource.status} />
                </div>
                <div className="flex justify-end" style={{ gridColumn: "span 1 / span 1" }}>
                  <Link href={`/review/${resource.id}`}>
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
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
