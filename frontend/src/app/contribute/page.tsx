"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Eye,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Star,
  Trash2,
  XCircle,
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
  const [deleteTarget, setDeleteTarget] = useState<ResourceResponse | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/resources/${id}`),
    onMutate: () => {
      setSuccessMsg(null);
      setErrorMsg(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-resources"] });
      setDeleteTarget(null);
      setSuccessMsg("Resource deleted.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to delete resource.");
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  return (
    <main>
      <FloatingNotice
        message={errorMsg ?? successMsg}
        tone={errorMsg ? "error" : "success"}
      />

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
                onRequestDelete={() => setDeleteTarget(resource)}
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
                isDeleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables === resource.id
                }
              />
            ))}
          </div>
        )}
      </PageContainer>

      {deleteTarget && (
        <DeleteConfirmDialog
          resourceTitle={deleteTarget.title || "Untitled draft"}
          isDeleting={deleteMutation.isPending}
          onCancel={() => {
            if (!deleteMutation.isPending) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}
    </main>
  );
}

function ResourceListItem({
  resource,
  onSubmit,
  onRevise,
  onApplyFeatured,
  onRequestDelete,
  isSubmitting,
  isRevising,
  isApplyingFeatured,
  isDeleting,
}: {
  resource: ResourceResponse;
  onSubmit: () => void;
  onRevise: () => void;
  onApplyFeatured: () => void;
  onRequestDelete: () => void;
  isSubmitting: boolean;
  isRevising: boolean;
  isApplyingFeatured: boolean;
  isDeleting: boolean;
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

  const latestUnpublishedFeedback = [...(resource.reviewFeedbacks ?? [])]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .find((fb) => fb.decision === "UNPUBLISHED");
  const wasPreviouslyApprovedDraft = isDraft && Boolean(resource.approvedAt);

  const shouldShowFeedback =
    latestFeedback?.decision === "REJECTED" && Boolean(latestRejectedFeedback);

  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-card)]",
        alreadyFeatured &&
          "my-resource-featured-card border-amber-300/70 bg-amber-50/40 shadow-[0_18px_44px_rgba(180,124,42,0.16)]"
      )}
    >
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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
              <Button
                variant="outline"
                size="sm"
                className="border-sky-200 bg-sky-50/80 text-sky-800 shadow-[0_6px_16px_rgba(14,116,144,0.08)] hover:bg-sky-100 hover:text-sky-900"
              >
                <Eye className="size-3.5" />
                View
              </Button>
            </Link>

            {isDraft && (
              <>
                <Link href={`/contribute/${resource.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-violet-200 bg-violet-50/80 text-violet-800 shadow-[0_6px_16px_rgba(109,40,217,0.08)] hover:bg-violet-100 hover:text-violet-900"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="default"
                  size="sm"
                  className="border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.22)] hover:bg-emerald-700"
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="border-teal-300 bg-teal-50 text-teal-800 opacity-100 shadow-[0_8px_20px_rgba(13,148,136,0.14)] disabled:opacity-100"
                  >
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
                    className={
                      rejectedFeatured
                        ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-amber-500 bg-amber-500 text-white shadow-[0_8px_20px_rgba(217,119,6,0.24)] hover:bg-amber-600"
                    }
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

        <div className="flex shrink-0 flex-col items-start gap-2 lg:min-h-[7.5rem] lg:items-end">
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
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-rose-300 bg-rose-50/80 text-rose-700 hover:bg-rose-100 hover:text-rose-800 lg:mt-auto"
            onClick={onRequestDelete}
            disabled={isDeleting}
          >
            <Trash2 className="size-3.5" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {shouldShowFeedback && latestRejectedFeedback && (
        <div className="relative z-10 mt-5 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
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

      {(latestUnpublishedFeedback || wasPreviouslyApprovedDraft) && (
        <div className="relative z-10 mt-5 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="size-4" />
            Publication Notice
          </div>
          <div className="text-sm text-amber-800">
            <p className="leading-6">
              This resource has been unpublished by{" "}
              {latestUnpublishedFeedback?.reviewerName || "admin"}.
            </p>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-amber-600">
              UNPUBLISHED /{" "}
              {formatEnglishDate(
                latestUnpublishedFeedback?.createdAt ?? resource.updatedAt
              )}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function FloatingNotice({
  message,
  tone,
}: {
  message: string | null;
  tone: "success" | "error";
}) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-[88px] z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
      <div
        role={tone === "error" ? "alert" : "status"}
        className={cn(
          "pointer-events-auto rounded-2xl border px-5 py-3 text-center text-sm shadow-[0_18px_40px_rgba(20,28,50,0.18)] backdrop-blur-xl",
          tone === "error"
            ? "border-rose-200 bg-rose-50/95 text-rose-700"
            : "border-emerald-200 bg-emerald-50/95 text-emerald-700"
        )}
      >
        {message}
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  resourceTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  resourceTitle: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/35 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-resource-title"
        className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-lifted)]"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700">
            <Trash2 className="size-4" />
          </span>
          <div>
            <h2
              id="delete-resource-title"
              className="font-serif text-xl font-medium text-foreground"
            >
              Delete this resource?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {resourceTitle} will be permanently removed from your resources.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-auto min-h-10 w-full whitespace-normal border-border bg-white px-4 py-2 text-center leading-5"
            onClick={onCancel}
            disabled={isDeleting}
          >
            <XCircle className="size-4" />
            No, I clicked by accident.
          </Button>
          <Button
            variant="outline"
            className="h-auto min-h-10 w-full whitespace-normal border-rose-300 bg-rose-50 px-4 py-2 text-center leading-5 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            <Trash2 className="size-4" />
            {isDeleting ? "Deleting..." : "Yes, I'm sure I want to delete this."}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ContributePage() {
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}>
      <ContributeDashboardContent />
    </ProtectedRoute>
  );
}
