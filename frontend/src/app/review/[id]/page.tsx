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

/**
 * 对齐后端 /api/reviews/predefined-feedback 返回结构
 * 后端现在返回 key / label / content 三个字段
 */
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

  /**
   * 主资源详情：进入 review detail 页时先拿当前资源
   */
  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const predefinedFeedbackQuery = useQuery({
    queryKey: ["predefined-feedback"],
    queryFn: () =>
      apiClient.get<PredefinedFeedbackOption[]>("/api/reviews/predefined-feedback"),
  });

  /**
   * Approve 仍然保持原逻辑
   * 审核通过后清理当前资源缓存并返回 review queue
   */
  const approveMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ResourceResponse>(`/api/reviews/${id}/approve`),
    onSuccess: () => {
      // Remove (don't invalidate) the resource query to avoid a background
      // refetch that could race with navigation and trigger a stale 401.
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

  /**
   * Reject 仍然只提交 comments
   * quick reply button 只是帮助用户快速填充 comments，不改 reject 接口结构
   */
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

  /**
   * 点击快捷标签后的行为：
   * - 如果文本框为空，直接填入该模板
   * - 如果已包含该模板，再点一次就移除
   * - 如果已有别的内容，则追加到末尾
   */
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

  /**
   * 前端先做一次必填校验
   * 后端 reject 接口也会继续校验 comments 是否为空
   */
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
      <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32 space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (resourceQuery.isError) {
    return (
      <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32">
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
    <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32">
      <Link href="/review" className="text-sm text-accent hover:underline">
        ← Back to review queue
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{resource.title || "Untitled draft"}</h1>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Category
              </span>

              <p className="text-sm">{resource.category?.name || "No category selected"}</p>

             

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

          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {resource.description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {resource.description}
              </p>
            </div>
          )}

          <div>
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Copyright
            </span>

            <p className="text-sm">{resource.copyrightDeclaration || "No copyright declaration provided yet."}</p>

            <p className="text-sm">{resource.copyrightDeclaration}</p>

          </div>

          <Separator />

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
                      <p className="text-sm font-medium">{file.originalFileName}</p>
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

                <Button className="w-full" onClick={handleApprove} disabled={isActing}>
                  <CheckCircle2 className="mr-1.5 size-4" />
                  {approveMutation.isPending ? "Approving…" : "Approve"}
                </Button>

                <Separator />

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={openRejectForm}
                    disabled={isActing}
                  >
                    <XCircle className="mr-1.5 size-4" />
                    Reject
                  </Button>

                  {isRejectFormOpen && (
                    <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">Mandatory Feedback</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Provide a rejection reason before submitting this review
                            decision.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={closeRejectForm}
                          disabled={rejectMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Quick reply tags
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
                              // 用 content 判断当前模板是否已被加入 textarea
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

                      <div className="space-y-2">
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
                        <p className="text-xs text-muted-foreground">
                          Preset text can be edited, and you can add your own explanation.
                        </p>
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
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="mr-1.5 size-4" />
                          {rejectMutation.isPending
                            ? "Submitting..."
                            : "Submit Rejection"}
                        </Button>
                      </div>
                    </div>
                  )}
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