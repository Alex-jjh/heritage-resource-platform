"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ResourceResponse, ResourceStatus } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReviewDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ResourceResponse>(`/api/reviews/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      router.push("/review");
    },
    onError: (err) => {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to approve resource."
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (comments: string) =>
      apiClient.post<ResourceResponse>(`/api/reviews/${id}/reject`, {
        comments,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      router.push("/review");
    },
    onError: (err) => {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to reject resource."
      );
    },
  });

  function handleReject() {
    setFeedbackError(null);
    setActionError(null);
    if (!feedback.trim()) {
      setFeedbackError("Feedback is required when rejecting a resource.");
      return;
    }
    rejectMutation.mutate(feedback.trim());
  }

  function handleApprove() {
    setActionError(null);
    approveMutation.mutate();
  }

  if (resourceQuery.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (resourceQuery.isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          Resource not found or you don&apos;t have permission to review it.
        </div>
        <Link
          href="/review"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          ← Back to review queue
        </Link>
      </main>
    );
  }

  const resource = resourceQuery.data!;
  const isPending = resource.status === "PENDING_REVIEW";
  const isActing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/review" className="text-sm text-accent hover:underline">
        ← Back to review queue
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Resource detail — left/main column */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{resource.title}</h1>
              <StatusBadge status={resource.status as ResourceStatus} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              By {resource.contributorName} · Submitted{" "}
              <time dateTime={resource.updatedAt}>
                {new Date(resource.updatedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Category
              </span>
              <p className="text-sm">{resource.category.name}</p>
            </div>
            {resource.place && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Place
                </span>
                <p className="text-sm">{resource.place}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          {resource.description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {resource.description}
              </p>
            </div>
          )}

          {/* Copyright */}
          <div>
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Copyright
            </span>
            <p className="text-sm">{resource.copyrightDeclaration}</p>
          </div>

          <Separator />

          {/* File Attachments */}
          {resource.fileReferences.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">File Attachments</h2>
              <ul className="space-y-2">
                {resource.fileReferences.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {file.originalFileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.contentType} · {formatFileSize(file.fileSize)}
                      </p>
                    </div>
                    {file.downloadUrl && (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
                      >
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* External Links */}
          {resource.externalLinks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">External Links</h2>
              <ul className="space-y-2">
                {resource.externalLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      {link.label || link.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Review panel — right column */}
        <aside className="space-y-4">
          <div className="rounded-lg border p-5 space-y-4 sticky top-8">
            <h2 className="text-lg font-semibold">Review Actions</h2>

            {!isPending ? (
              <p className="text-sm text-muted-foreground">
                This resource is no longer pending review. Current status:{" "}
                <StatusBadge status={resource.status as ResourceStatus} />
              </p>
            ) : (
              <>
                {actionError && (
                  <div
                    role="alert"
                    className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {actionError}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleApprove}
                  disabled={isActing}
                >
                  <CheckCircle2 className="mr-1.5 size-4" />
                  {approveMutation.isPending ? "Approving…" : "Approve"}
                </Button>

                <Separator />

                <div className="space-y-2">
                  <label
                    htmlFor="reject-feedback"
                    className="text-sm font-medium"
                  >
                    Rejection Feedback
                  </label>
                  <Textarea
                    id="reject-feedback"
                    placeholder="Explain why this resource is being rejected…"
                    value={feedback}
                    onChange={(e) => {
                      setFeedback(e.target.value);
                      if (feedbackError) setFeedbackError(null);
                    }}
                    rows={4}
                  />
                  {feedbackError && (
                    <p role="alert" className="text-sm text-destructive">
                      {feedbackError}
                    </p>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleReject}
                    disabled={isActing}
                  >
                    <XCircle className="mr-1.5 size-4" />
                    {rejectMutation.isPending ? "Rejecting…" : "Reject"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ProtectedRoute requiredRoles={["REVIEWER", "ADMINISTRATOR"]}>
      <ReviewDetailContent id={id} />
    </ProtectedRoute>
  );
}
