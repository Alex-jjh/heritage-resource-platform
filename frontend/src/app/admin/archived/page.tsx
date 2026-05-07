"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, RotateCcw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { AdminNav } from "@/components/admin-nav";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceResponse } from "@/types";

function ArchivedContent() {
  const queryClient = useQueryClient();
  const archivedQuery = useQuery({
    queryKey: ["archived-resources"],
    queryFn: () =>
      apiClient.get<ResourceResponse[]>("/api/admin/resources/archived"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/api/admin/resources/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-resources"] });
    },
  });

  const archived = archivedQuery.data ?? [];

  return (
    <main>
      <PageContainer
        wide
        eyebrow="Administration"
        title="Admin Panel"
        lede="Manage users, categories, tags, and archived resources."
      >
        <AdminNav />
        <div className="rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-card)]">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground">
              <Archive className="size-5" />
            </span>
            <div>
              <h2 className="font-serif text-[1.6rem] font-medium">Archived Resources</h2>
              <p className="text-sm text-muted-foreground">{archived.length} archived</p>
            </div>
          </div>

          {archivedQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : archivedQuery.isError ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Failed to load archived resources.
            </div>
          ) : archived.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-serif text-xl text-foreground">No Archived Resources</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Archived records will appear here when administrators remove them from publication.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-12 border-b border-border bg-secondary/40 px-6 py-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <div style={{ gridColumn: "span 4 / span 4" }}>Title</div>
                <div style={{ gridColumn: "span 3 / span 3" }}>Category</div>
                <div style={{ gridColumn: "span 3 / span 3" }}>Contributor</div>
                <div className="text-right" style={{ gridColumn: "span 2 / span 2" }}>Actions</div>
              </div>
              {archived.map((resource) => (
                <div key={resource.id} className="grid grid-cols-12 items-center border-b border-border px-6 py-4 text-sm last:border-0 hover:bg-secondary/30">
                  <div className="font-serif text-base font-medium" style={{ gridColumn: "span 4 / span 4" }}>{resource.title || "Untitled draft"}</div>
                  <div className="text-muted-foreground" style={{ gridColumn: "span 3 / span 3" }}>{resource.category?.name || "No category selected"}</div>
                  <div className="text-muted-foreground" style={{ gridColumn: "span 3 / span 3" }}>{resource.contributorName}</div>
                  <div className="flex justify-end gap-2" style={{ gridColumn: "span 2 / span 2" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreMutation.mutate(resource.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="size-3.5" />
                      {restoreMutation.isPending ? "Restoring..." : "Restore"}
                    </Button>
                    <Link href={`/resources/${resource.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                    <StatusBadge status={resource.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </main>
  );
}

export default function AdminArchivedPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <ArchivedContent />
    </ProtectedRoute>
  );
}
