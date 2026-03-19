"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { CommentSection } from "@/components/comment-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, Undo2 } from "lucide-react";
import type { ResourceResponse, ResourceStatus } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ResourceDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [adminError, setAdminError] = useState<string | null>(null);
  const isAdmin = user?.role === "ADMINISTRATOR";

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ResourceResponse>(`/api/admin/resources/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      setAdminError(null);
    },
    onError: (err) => {
      setAdminError(err instanceof ApiError ? err.message : "Failed to archive resource.");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ResourceResponse>(`/api/admin/resources/${id}/unpublish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      setAdminError(null);
    },
    onError: (err) => {
      setAdminError(err instanceof ApiError ? err.message : "Failed to unpublish resource.");
    },
  });

  if (resourceQuery.isLoading) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (resourceQuery.isError) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Resource not found or you don&apos;t have permission to view it.
        </div>
        <Link href="/browse" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← Back to browse
        </Link>
      </main>
    );
  }

  const resource = resourceQuery.data!;

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/browse" className="text-sm text-accent hover:underline">
        ← Back to browse
      </Link>

      <div className="mt-4 space-y-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{resource.title}</h1>
            <StatusBadge status={resource.status as ResourceStatus} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            By {resource.contributorName}
            {resource.approvedAt && (
              <> · Approved on{" "}
                <time dateTime={resource.approvedAt}>
                  {new Date(resource.approvedAt).toLocaleDateString(undefined, {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </time>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs font-medium uppercase text-muted-foreground">Category</span>
            <p className="text-sm">{resource.category.name}</p>
          </div>
          {resource.place && (
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground">Place</span>
              <p className="text-sm">{resource.place}</p>
            </div>
          )}
        </div>

        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <Badge key={tag.id} variant="outline">{tag.name}</Badge>
            ))}
          </div>
        )}

        {resource.description && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{resource.description}</p>
          </div>
        )}

        <div>
          <span className="text-xs font-medium uppercase text-muted-foreground">Copyright</span>
          <p className="text-sm">{resource.copyrightDeclaration}</p>
        </div>

        <Separator />

        {resource.fileReferences.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">File Attachments</h2>
            <ul className="space-y-2">
              {resource.fileReferences.map((file) => (
                <li key={file.id} className="flex items-center justify-between rounded-md border p-3">
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

        <Separator />

        {isAdmin && resource.status === "APPROVED" && (
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">Admin Actions</h2>
            {adminError && (
              <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {adminError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending || unpublishMutation.isPending}
              >
                <Archive className="mr-1 size-3.5" />
                {archiveMutation.isPending ? "Archiving…" : "Archive"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => unpublishMutation.mutate()}
                disabled={archiveMutation.isPending || unpublishMutation.isPending}
              >
                <Undo2 className="mr-1 size-3.5" />
                {unpublishMutation.isPending ? "Unpublishing…" : "Unpublish"}
              </Button>
            </div>
          </div>
        )}

        {resource.status === "APPROVED" && (
          <CommentSection resourceId={resource.id} />
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
