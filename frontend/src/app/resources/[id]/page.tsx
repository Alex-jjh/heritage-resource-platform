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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Archive, Undo2 } from "lucide-react";
import type {
  ResourceResponse,
  ResourceStatus,
  UserProfileResponse,
} from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEnglishDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
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
        className="h-10 w-10 rounded-full border object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-foreground">
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
    contributorProfile?.displayName ?? resource.contributorName;

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
              {formatEnglishDate(resource.approvedAt)}
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
      className="inline-block rounded-md transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {summary}
    </Link>
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
      <main className="space-y-6 px-6 py-8 sm:px-10 lg:px-20 xl:px-32">
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
          Resource not found or you don&apos;t have permission to view it.
        </div>
        <Link
          href="/browse"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          ← Back to browse
        </Link>
      </main>
    );
  }

  const resource = resourceQuery.data!;
  const contributorProfile = contributorProfileQuery.data ?? null;

  return (
    <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32">
      <Link href="/browse" className="text-sm text-accent hover:underline">
        ← Back to browse
      </Link>

      <div className="mt-4 space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">
              {resource.title || "Untitled draft"}
            </h1>
            <StatusBadge status={resource.status as ResourceStatus} />
          </div>

          <ContributorSummary
            resource={resource}
            contributorProfile={contributorProfile}
          />
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
            <h2 className="mb-2 text-lg font-semibold">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {resource.description}
            </p>
          </div>
        )}

        <div>
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Copyright
          </span>
          <p className="text-sm">
            {resource.copyrightDeclaration || "No copyright declaration provided yet."}
          </p>
        </div>

        <Separator />

        {resource.fileReferences.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">File Attachments</h2>
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
            <h2 className="mb-3 text-lg font-semibold">External Links</h2>
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

        <Separator />

        {isAdmin && resource.status === "APPROVED" && (
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Admin Actions</h2>

            {adminError && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {adminError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveMutation.mutate()}
                disabled={
                  archiveMutation.isPending || unpublishMutation.isPending
                }
              >
                <Archive className="mr-1 size-3.5" />
                {archiveMutation.isPending ? "Archiving…" : "Archive"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnpublishForm(!showUnpublishForm)}
                disabled={
                  archiveMutation.isPending || unpublishMutation.isPending
                }
              >
                <Undo2 className="mr-1 size-3.5" />
                Unpublish
              </Button>
            </div>

            {showUnpublishForm && (
              <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <label
                  htmlFor="unpublish-reason"
                  className="text-sm font-medium text-amber-800"
                >
                  Reason for unpublishing (visible to contributor)
                </label>
                <Textarea
                  id="unpublish-reason"
                  placeholder="Explain why this resource is being unpublished…"
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
                      ? "Unpublishing…"
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
          </div>
        )}

        {resource.status === "APPROVED" && (
          <CommentSection
            resourceId={resource.id}
            initialPage={initialCommentPage}
            highlightCommentId={highlightCommentId}
          />
        )}
      </div>
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