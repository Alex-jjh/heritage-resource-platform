"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Star,
} from "lucide-react";
import type {
  FeaturedStatus,
  MessageResponse,
  ResourceResponse,
  ResourceStatus,
} from "@/types";

function formatEnglishDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function featuredLabel(
  featuredStatus?: FeaturedStatus | null,
  isFeatured?: boolean
) {
  if (isFeatured || featuredStatus === "APPROVED") {
    return "Featured";
  }
  if (featuredStatus === "PENDING") {
    return "Featured application pending";
  }
  if (featuredStatus === "REJECTED") {
    return "Featured application rejected";
  }
  return "Not applied for featured";
}

function ContributeDashboardContent() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: ["my-resources"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/resources/mine"),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/resources/${id}/submit`),
    onMutate: () => {
      setSuccessMsg(null);
      setErrorMsg(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-resources"] });
      setSuccessMsg("Resource submitted for review.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to submit resource for review.");
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  const reviseMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/resources/${id}/revise`),
    onMutate: () => {
      setSuccessMsg(null);
      setErrorMsg(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-resources"] });
      setSuccessMsg("Resource moved back to draft for revision.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to move resource back to draft.");
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  const applyFeaturedMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<MessageResponse>(`/api/resources/${id}/apply-featured`, {}),
    onMutate: () => {
      setSuccessMsg(null);
      setErrorMsg(null);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-resources"] }),
        queryClient.invalidateQueries({ queryKey: ["featured-resources"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage-featured-resources"] }),
        queryClient.invalidateQueries({ queryKey: ["featured-applications-pending"] }),
      ]);
      setSuccessMsg("Featured application submitted.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to submit featured application.");
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  return (
    <main>
      <PageContainer
        wide
        eyebrow="Contributor Workspace"
        title="My Resources"
        lede="Manage drafts, submissions, reviewer feedback, and featured applications."
        rightSlot={
          <Link href="/contribute/new">
            <Button>
              <Plus className="size-4" />
              New Resource
            </Button>
          </Link>
        }
      >
        {successMsg && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {errorMsg}
          </div>
        )}

        {resourcesQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : resourcesQuery.isError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            Failed to load your resources. Please try again.
          </div>
        ) : resourcesQuery.data && resourcesQuery.data.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white py-16 text-center shadow-[var(--shadow-heritage-card)]">
            <p className="font-serif text-xl text-foreground">
              You haven&apos;t created any resources yet.
            </p>
            <Link href="/contribute/new" className="mt-4 inline-block">
              <Button variant="outline">Create your first resource</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {resourcesQuery.data?.map((resource) => (
              <ResourceListItem
                key={resource.id}
                resource={resource}
                onSubmit={() => submitMutation.mutate(resource.id)}
                onRevise={() => reviseMutation.mutate(resource.id)}
                onApplyFeatured={() => applyFeaturedMutation.mutate(resource.id)}
                isSubmitting={
                  submitMutation.isPending &&
                  submitMutation.variables === resource.id
                }
                isRevising={
                  reviseMutation.isPending &&
                  reviseMutation.variables === resource.id
                }
                isApplyingFeatured={
                  applyFeaturedMutation.isPending &&
                  applyFeaturedMutation.variables === resource.id
                }
              />
            ))}
          </div>
        )}
      </PageContainer>
    </main>
  );
}

function ResourceListItem({
  resource,
  onSubmit,
  onRevise,
  onApplyFeatured,
  isSubmitting,
  isRevising,
  isApplyingFeatured,
}: {
  resource: ResourceResponse;
  onSubmit: () => void;
  onRevise: () => void;
  onApplyFeatured: () => void;
  isSubmitting: boolean;
  isRevising: boolean;
  isApplyingFeatured: boolean;
}) {
  const status = resource.status as ResourceStatus;
  const isDraft = status === "DRAFT";
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED";

  const featuredStatus = resource.featuredStatus;
  const alreadyFeatured = resource.isFeatured || featuredStatus === "APPROVED";
  const pendingFeatured = featuredStatus === "PENDING";
  const rejectedFeatured = featuredStatus === "REJECTED";

  const canApplyFeatured =
    isApproved && !alreadyFeatured && !pendingFeatured && !isApplyingFeatured;

  const latestRejectedFeedback = [...(resource.reviewFeedbacks ?? [])]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .find((fb) => fb.decision === "REJECTED");

  const latestFeedback = [...(resource.reviewFeedbacks ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  const shouldShowFeedback =
    latestFeedback?.decision === "REJECTED" && Boolean(latestRejectedFeedback);

  return (
    <article className="rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-card)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-[1.25rem] font-medium">
            {resource.title || "Untitled draft"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {resource.category?.name || "No category selected"}
            {resource.place && <> / {resource.place}</>}
            {" / "}
            Updated {formatEnglishDate(resource.updatedAt)}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link href={`/resources/${resource.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="size-3.5" />
                View
              </Button>
            </Link>

            {isDraft && (
              <>
                <Link href={`/contribute/${resource.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                >
                  <Send className="size-3.5" />
                  {isSubmitting ? "Submitting..." : "Submit for Review"}
                </Button>
              </>
            )}

            {isRejected && (
              <Button
                variant="default"
                size="sm"
                onClick={onRevise}
                disabled={isRevising}
              >
                <RotateCcw className="size-3.5" />
                {isRevising ? "Revising..." : "Revise"}
              </Button>
            )}

            {isApproved && (
              <>
                {alreadyFeatured ? (
                  <Button variant="outline" size="sm" disabled>
                    <Star className="size-3.5" />
                    Featured
                  </Button>
                ) : pendingFeatured ? (
                  <Button variant="outline" size="sm" disabled>
                    <Star className="size-3.5" />
                    Application Pending
                  </Button>
                ) : (
                  <Button
                    variant={rejectedFeatured ? "outline" : "default"}
                    size="sm"
                    onClick={onApplyFeatured}
                    disabled={!canApplyFeatured}
                  >
                    <Star className="size-3.5" />
                    {isApplyingFeatured
                      ? "Applying..."
                      : rejectedFeatured
                        ? "Reapply for Featured"
                        : "Apply for Featured"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <StatusBadge status={status} />
          {isApproved && (
            <span className="text-xs text-muted-foreground">
              {featuredLabel(featuredStatus, resource.isFeatured)}
            </span>
          )}
          {status === "PENDING_REVIEW" && (
            <span className="text-xs text-muted-foreground">
              Awaiting reviewer
            </span>
          )}
        </div>
      </div>

      {shouldShowFeedback && latestRejectedFeedback && (
        <div className="mt-5 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <MessageSquare className="size-4" />
            Admin / Reviewer Feedback
          </div>
          <div className="text-sm text-amber-800">
            <p className="leading-6">{latestRejectedFeedback.comments}</p>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-amber-600">
              {latestRejectedFeedback.decision} /{" "}
              {formatEnglishDate(latestRejectedFeedback.createdAt)}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

export default function ContributePage() {
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}>
      <ContributeDashboardContent />
    </ProtectedRoute>
  );
}
