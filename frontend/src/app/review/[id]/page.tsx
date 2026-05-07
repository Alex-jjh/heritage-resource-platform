"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileIcon, XCircle } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceResponse, ResourceStatus } from "@/types";

type PredefinedFeedbackOption = {
  key: string;
  label: string;
  content: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReviewDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRejectFormOpen, setIsRejectFormOpen] = useState(false);
  const [rejectDraft, setRejectDraft] = useState("");

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const predefinedFeedbackQuery = useQuery({
    queryKey: ["predefined-feedback"],
    queryFn: () =>
      apiClient.get<PredefinedFeedbackOption[]>("/api/reviews/predefined-feedback"),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ResourceResponse>(`/api/reviews/${id}/approve`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["resource", id] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["featured-resources"] });
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
      apiClient.post<ResourceResponse>(`/api/reviews/${id}/reject`, { comments }),
    onSuccess: () => {
      setIsRejectFormOpen(false);
      setRejectDraft("");
      setFeedbackError(null);
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      router.push("/review");
    },
    onError: (err) => {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to reject resource."
      );
    },
  });

  function openRejectForm() {
    setActionError(null);
    setFeedbackError(null);
    setIsRejectFormOpen(true);
  }

  function closeRejectForm() {
    if (rejectMutation.isPending) return;
    setIsRejectFormOpen(false);
    setFeedbackError(null);
    setRejectDraft("");
  }

  function applyPredefinedFeedback(content: string) {
    setFeedbackError(null);
    setActionError(null);

    setRejectDraft((current) => {
      const trimmed = current.trim();

      if (!trimmed) {
        return content;
      }

      if (trimmed.includes(content)) {
        return trimmed
          .replace(`\n\n${content}`, "")
          .replace(`${content}\n\n`, "")
          .replace(content, "")
          .trim();
      }

      return `${trimmed}\n\n${content}`;
    });
  }

  function submitReject() {
    setFeedbackError(null);
    setActionError(null);

    if (!rejectDraft.trim()) {
      setFeedbackError("Feedback required");
      return;
    }

    rejectMutation.mutate(rejectDraft.trim());
  }

  function handleApprove() {
    setActionError(null);
    approveMutation.mutate();
  }

  if (resourceQuery.isLoading) {
    return (
      <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-12 lg:px-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </main>
    );
  }

  if (resourceQuery.isError) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10">
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Resource not found or you don&apos;t have permission to review it.
        </div>
        <Link
          href="/review"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Back to review queue
        </Link>
      </main>
    );
  }

  const resource = resourceQuery.data!;
  const isPending =
    resource.status === "PENDING_REVIEW" || resource.status === "IN_REVIEW";
  const isActing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <main className="relative z-[2] mx-auto max-w-[1200px] px-6 py-12 lg:px-10">
      <Link
        href="/review"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-accent"
      >
        <ArrowLeft className="size-4" />
        Back to review queue
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1
          className="font-serif"
          style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {resource.title || "Untitled draft"}
        </h1>
        <StatusBadge status={resource.status as ResourceStatus} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        By {resource.contributorName} / Submitted{" "}
        <time dateTime={resource.updatedAt}>
          {new Date(resource.updatedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </p>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          <section className="rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-card)]">
            <p className="heritage-eyebrow">- Submitted Metadata</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Category
                </span>
                <p className="mt-1 text-sm">
                  {resource.category?.name || "No category selected"}
                </p>
              </div>
              {resource.place && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Place
                  </span>
                  <p className="mt-1 text-sm">{resource.place}</p>
                </div>
              )}
            </div>

            {resource.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="border-border bg-secondary/30">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {resource.description && (
            <section>
              <h2 className="font-serif text-[1.6rem] font-medium">Description</h2>
              <p className="mt-3 whitespace-pre-wrap text-[1.05rem] leading-8 text-foreground/80">
                {resource.description}
              </p>
            </section>
          )}

          <section>
            <p className="heritage-eyebrow">- Copyright</p>
            <p className="mt-4 text-sm leading-7 text-foreground/80">
              {resource.copyrightDeclaration ||
                "No copyright declaration provided yet."}
            </p>
          </section>

          {resource.fileReferences.length > 0 && (
            <section>
              <p className="heritage-eyebrow">- File Attachments</p>
              <ul className="mt-4 space-y-2">
                {resource.fileReferences.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.originalFileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.contentType} / {formatFileSize(file.fileSize)}
                        </p>
                      </div>
                    </div>
                    {file.downloadUrl && (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center rounded-full border border-border bg-white px-3 text-sm font-medium hover:bg-secondary/60"
                      >
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-card)]">
            <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
              Review Actions
            </p>

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
                    className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                  >
                    {actionError}
                  </div>
                )}

                <Button className="w-full" onClick={handleApprove} disabled={isActing}>
                  <CheckCircle2 className="size-4" />
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={openRejectForm}
                  disabled={isActing}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>

                {isRejectFormOpen && (
                  <div className="space-y-4 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
                    <div>
                      <h3 className="text-sm font-semibold">Mandatory Feedback</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Provide a rejection reason before submitting this review
                        decision.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-muted-foreground">
                        Quick Reply Tags
                      </p>

                      {predefinedFeedbackQuery.isLoading && (
                        <p className="text-xs text-muted-foreground">
                          Loading preset feedback...
                        </p>
                      )}

                      {predefinedFeedbackQuery.isError && (
                        <p className="text-xs text-muted-foreground">
                          Preset feedback is unavailable right now. You can still enter
                          custom feedback below.
                        </p>
                      )}

                      {!!predefinedFeedbackQuery.data?.length && (
                        <div className="flex flex-wrap gap-2">
                          {predefinedFeedbackQuery.data.map((option) => {
                            const active = rejectDraft.includes(option.content);

                            return (
                              <Button
                                key={option.key}
                                type="button"
                                variant={active ? "default" : "outline"}
                                size="sm"
                                className="h-auto whitespace-normal px-3 py-1.5 text-left"
                                onClick={() => applyPredefinedFeedback(option.content)}
                                disabled={rejectMutation.isPending}
                              >
                                {option.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reject-feedback" className="text-sm font-medium">
                        Feedback
                      </label>
                      <Textarea
                        id="reject-feedback"
                        placeholder="Enter rejection feedback..."
                        value={rejectDraft}
                        onChange={(e) => {
                          setRejectDraft(e.target.value);
                          if (feedbackError) setFeedbackError(null);
                        }}
                        rows={6}
                      />
                    </div>

                    {feedbackError && (
                      <p role="alert" className="text-sm text-destructive">
                        {feedbackError}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeRejectForm}
                        disabled={rejectMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={submitReject}
                        disabled={rejectMutation.isPending || !rejectDraft.trim()}
                        className="bg-rose-600 text-white hover:bg-rose-700"
                      >
                        <XCircle className="size-4" />
                        {rejectMutation.isPending
                          ? "Submitting..."
                          : "Submit Rejection"}
                      </Button>
                    </div>
                  </div>
                )}
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
