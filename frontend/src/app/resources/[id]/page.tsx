"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { CommentSection } from "@/components/comment-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Archive, ArrowLeft, Download, FileIcon, ImageIcon, Undo2 } from "lucide-react";
import type {
  ResourceResponse,
  ResourceStatus,
  UserProfileResponse,
} from "@/types";

type FileReference = ResourceResponse["fileReferences"][number];

function formatFileSize(bytes?: number | null): string {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getResourceTitle(resource: ResourceResponse) {
  return resource.title || "Untitled draft";
}

function getFileDisplayName(file: FileReference, fallback: string) {
  return file.originalFileName || fallback;
}

function isImageFile(file: FileReference) {
  return Boolean(
    file.downloadUrl && file.contentType?.toLowerCase().startsWith("image/")
  );
}

function ContributorAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const initials = getInitials(name) || "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-10 w-10 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60 font-serif text-sm font-semibold text-foreground">
      {initials}
    </div>
  );
}

function ContributorSummary({
  resource,
  contributorProfile,
}: {
  resource: ResourceResponse;
  contributorProfile?: UserProfileResponse | null;
}) {
  const avatarUrl =
    contributorProfile?.avatarUrl ?? resource.contributorAvatarUrl ?? null;

  const displayName =
    contributorProfile?.displayName ??
    resource.contributorName ??
    "Unknown contributor";

  const canOpenProfile = Boolean(resource.contributorId);

  const summary = (
    <div className="flex items-center gap-3">
      <ContributorAvatar name={displayName} avatarUrl={avatarUrl} />
      <div className="min-w-0">
        <div className="font-medium leading-none">{displayName}</div>
        {resource.approvedAt && (
          <p className="mt-1 text-sm text-muted-foreground">
            Approved on{" "}
            <time dateTime={resource.approvedAt}>
              {formatDate(resource.approvedAt)}
            </time>
          </p>
        )}
      </div>
    </div>
  );

  if (!canOpenProfile) {
    return summary;
  }

  return (
    <Link
      href={`/users/${resource.contributorId}`}
      className="inline-block rounded-full transition hover:text-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {summary}
    </Link>
  );
}

function ResourceImageGallery({ resource }: { resource: ResourceResponse }) {
  const resourceTitle = getResourceTitle(resource);
  const imageFiles = (resource.fileReferences ?? []).filter(isImageFile);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set()
  );

  const visibleImageFiles = imageFiles.filter(
    (file) => !failedImageIds.has(file.id)
  );

  if (visibleImageFiles.length === 0) {
    return (
      <div className="mt-10 flex aspect-[16/9] items-center justify-center rounded-2xl bg-muted">
        <ImageIcon className="size-10 text-muted-foreground" />
      </div>
    );
  }

  const safeSelectedIndex =
    selectedIndex >= visibleImageFiles.length ? 0 : selectedIndex;

  const selectedImage = visibleImageFiles[safeSelectedIndex];

  if (!selectedImage) {
    return null;
  }

  const selectedImageUrl = selectedImage.downloadUrl ?? "";
  const selectedImageAlt =
    selectedImage.originalFileName || resourceTitle || "Resource image";

  function markImageAsFailed(fileId: string) {
    setFailedImageIds((current) => {
      const next = new Set(current);
      next.add(fileId);
      return next;
    });
    setSelectedIndex(0);
  }

  return (
    <section className="mt-10 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-muted">
        <img
          src={selectedImageUrl}
          alt={selectedImageAlt}
          className="max-h-[640px] w-full object-cover"
          onError={() => markImageAsFailed(selectedImage.id)}
        />
      </div>

      {visibleImageFiles.length > 1 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {visibleImageFiles.map((file, index) => {
            const isSelected = index === safeSelectedIndex;
            const fileName = getFileDisplayName(file, resourceTitle);
            const fileUrl = file.downloadUrl ?? "";

            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`overflow-hidden rounded-xl border border-border bg-muted transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  isSelected ? "ring-2 ring-ring ring-offset-2" : ""
                }`}
                aria-label={`View ${fileName}`}
              >
                <img
                  src={fileUrl}
                  alt={fileName || "Resource image"}
                  className="aspect-square w-full object-cover"
                  onError={() => markImageAsFailed(file.id)}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ResourceDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [adminError, setAdminError] = useState<string | null>(null);
  const [unpublishReason, setUnpublishReason] = useState("");
  const [showUnpublishForm, setShowUnpublishForm] = useState(false);

  const isAdmin = user?.role === "ADMINISTRATOR";

  const highlightCommentId = searchParams.get("commentId") ?? undefined;

  const initialCommentPage = useMemo(() => {
    const raw = searchParams.get("commentPage");
    if (!raw) return 0;

    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0) return 0;

    return parsed;
  }, [searchParams]);

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const contributorProfileQuery = useQuery({
    queryKey: ["contributor-profile", resourceQuery.data?.contributorId],
    queryFn: () =>
      apiClient.get<UserProfileResponse>(
        `/api/users/${resourceQuery.data!.contributorId}/profile`
      ),
    enabled: Boolean(resourceQuery.data?.contributorId),
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ResourceResponse>(`/api/admin/resources/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      setAdminError(null);
    },
    onError: (err) => {
      setAdminError(
        err instanceof ApiError ? err.message : "Failed to archive resource."
      );
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (reason: string) =>
      apiClient.post<ResourceResponse>(`/api/admin/resources/${id}/unpublish`, {
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      setAdminError(null);
      setShowUnpublishForm(false);
      setUnpublishReason("");
    },
    onError: (err) => {
      setAdminError(
        err instanceof ApiError ? err.message : "Failed to unpublish resource."
      );
    },
  });

  if (resourceQuery.isLoading) {
    return (
      <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-12 lg:px-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
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
          Resource not found or you don&apos;t have permission to view it.
        </div>
        <Link
          href="/browse"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Back to Browse
        </Link>
      </main>
    );
  }

  const resource = resourceQuery.data!;
  const contributorProfile = contributorProfileQuery.data ?? null;
  const resourceTitle = getResourceTitle(resource);
  const tags = resource.tags ?? [];
  const fileReferences = resource.fileReferences ?? [];
  const externalLinks = resource.externalLinks ?? [];

  return (
    <main className="relative z-[2] mx-auto max-w-[1200px] px-6 py-12 lg:px-10">
      <Link
        href="/browse"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-accent"
      >
        <ArrowLeft className="size-4" />
        Back to Browse
      </Link>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          {resource.category?.name || "No category selected"}
          {resource.approvedAt && <> / {new Date(resource.approvedAt).getFullYear()}</>}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="font-serif"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 4rem)",
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
            }}
          >
            {resourceTitle}
          </h1>
          <div className="mt-5">
            <ContributorSummary
              resource={resource}
              contributorProfile={contributorProfile}
            />
          </div>
        </div>
        <StatusBadge status={resource.status as ResourceStatus} />
      </div>

      <ResourceImageGallery resource={resource} />

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <article className="lg:col-span-8">
          {resource.description && (
            <p className="whitespace-pre-wrap font-serif text-[1.4rem] leading-[1.6] tracking-[-0.005em] text-foreground/85">
              {resource.description}
            </p>
          )}

          <section className="mt-10">
            <p className="heritage-eyebrow">- Copyright</p>
            <p className="mt-4 text-[1.05rem] leading-8 text-foreground/80">
              {resource.copyrightDeclaration ||
                "No copyright declaration provided yet."}
            </p>
          </section>

          {fileReferences.length > 0 && (
            <section className="mt-10">
              <p className="heritage-eyebrow">- File Attachments</p>
              <ul className="mt-4 space-y-2">
                {fileReferences.map((file) => {
                  const fileName = getFileDisplayName(file, "Untitled file");
                  const fileType = file.contentType || "Unknown type";

                  return (
                    <li
                      key={file.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {fileType} / {formatFileSize(file.fileSize)}
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
                  );
                })}
              </ul>
            </section>
          )}

          {externalLinks.length > 0 && (
            <section className="mt-10">
              <p className="heritage-eyebrow">- External Links</p>
              <ul className="mt-4 space-y-2">
                {externalLinks.map((link) => (
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
            </section>
          )}

          {isAdmin && resource.status === "APPROVED" && (
            <section className="mt-10 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-heritage-card)]">
              <h2 className="font-serif text-[1.25rem] font-medium">
                Admin Actions
              </h2>

              {adminError && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {adminError}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archiveMutation.mutate()}
                  disabled={
                    archiveMutation.isPending || unpublishMutation.isPending
                  }
                >
                  <Archive className="size-3.5" />
                  {archiveMutation.isPending ? "Archiving..." : "Archive"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnpublishForm(!showUnpublishForm)}
                  disabled={
                    archiveMutation.isPending || unpublishMutation.isPending
                  }
                >
                  <Undo2 className="size-3.5" />
                  Unpublish
                </Button>
              </div>

              {showUnpublishForm && (
                <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <label
                    htmlFor="unpublish-reason"
                    className="text-sm font-medium text-amber-800"
                  >
                    Reason for unpublishing (visible to contributor)
                  </label>
                  <Textarea
                    id="unpublish-reason"
                    placeholder="Explain why this resource is being unpublished..."
                    value={unpublishReason}
                    onChange={(e) => setUnpublishReason(e.target.value)}
                    rows={3}
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        unpublishMutation.mutate(unpublishReason.trim())
                      }
                      disabled={unpublishMutation.isPending}
                    >
                      {unpublishMutation.isPending
                        ? "Unpublishing..."
                        : "Confirm Unpublish"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowUnpublishForm(false);
                        setUnpublishReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </article>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-card)]">
            <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
              Archive Record
            </p>
            <dl className="mt-5 space-y-4">
              {[
                ["Category", resource.category?.name || "No category selected"],
                ["Place", resource.place || "Unknown"],
                ["Status", resource.status.replace("_", " ").toLowerCase()],
                ["Updated", formatDate(resource.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-border pb-3 last:border-0">
                  <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="text-right text-sm font-medium capitalize">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="border-border bg-secondary/30">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {fileReferences.some((file) => file.downloadUrl) && (
              <a
                href={fileReferences.find((file) => file.downloadUrl)?.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="size-4" />
                Download files
              </a>
            )}
          </div>
        </aside>
      </div>

      {resource.status === "APPROVED" && (
        <CommentSection
          resourceId={resource.id}
          initialPage={initialCommentPage}
          highlightCommentId={highlightCommentId}
        />
      )}
    </main>
  );
}

export default function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ProtectedRoute>
      <ResourceDetailContent id={id} />
    </ProtectedRoute>
  );
}
