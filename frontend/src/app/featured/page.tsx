"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StarOff } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import type {
  FeaturedStatus,
  MessageResponse,
  Page,
  ResourceResponse,
} from "@/types";

function formatEnglishDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function featuredStatusLabel(status?: FeaturedStatus | null, isFeatured?: boolean) {
  if (isFeatured) return "Featured";
  if (!status || status === "NONE") return "Not Applied";
  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  return status;
}

function FeaturedContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMINISTRATOR";

  const myResourcesQuery = useQuery({
    queryKey: ["my-resources-featured-page"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/resources/mine"),
    enabled: !!user,
  });

  const currentFeaturedQuery = useQuery({
    queryKey: ["featured-resources"],
    queryFn: () => apiClient.get<ResourceResponse[]>("/api/resources/featured"),
    enabled: !!user,
  });

  const pendingApplicationsQuery = useQuery({
    queryKey: ["featured-applications-pending"],
    queryFn: () =>
      apiClient.get<ResourceResponse[]>("/api/admin/resources/featured-applications"),
    enabled: isAdmin,
  });

  const approvedResourcesQuery = useQuery({
    queryKey: ["featured-approved-resource-pool"],
    queryFn: () =>
      apiClient.get<Page<ResourceResponse>>("/api/search/resources?page=0&size=100"),
    enabled: isAdmin,
  });

  const myApprovedResources = useMemo(
    () =>
      (myResourcesQuery.data ?? []).filter(
        (resource) => resource.status === "APPROVED"
      ),
    [myResourcesQuery.data]
  );

  const approvedResourcePool = useMemo(
    () => approvedResourcesQuery.data?.content ?? [],
    [approvedResourcesQuery.data]
  );

  function clearMessages() {
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function refreshFeaturedData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-resources-featured-page"] }),
      queryClient.invalidateQueries({ queryKey: ["featured-resources"] }),
      queryClient.invalidateQueries({ queryKey: ["featured-applications-pending"] }),
      queryClient.invalidateQueries({ queryKey: ["featured-approved-resource-pool"] }),
      queryClient.invalidateQueries({ queryKey: ["homepage-featured-resources"] }),
      queryClient.invalidateQueries({ queryKey: ["my-resources"] }),
    ]);
  }

  const applyMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.post<MessageResponse>(`/api/resources/${resourceId}/apply-featured`, {}),
    onMutate: clearMessages,
    onSuccess: async () => {
      setSuccessMessage("Featured application submitted.");
      await refreshFeaturedData();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to submit featured application.");
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ resourceId, approved }: { resourceId: string; approved: boolean }) =>
      apiClient.post<MessageResponse>(
        `/api/admin/resources/${resourceId}/approve-featured?approved=${approved}`,
        {}
      ),
    onMutate: clearMessages,
    onSuccess: async (_, variables) => {
      setSuccessMessage(
        variables.approved
          ? "Featured application approved."
          : "Featured application rejected."
      );
      await refreshFeaturedData();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to process featured application.");
    },
  });

  const featureMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.post<MessageResponse>(`/api/admin/resources/${resourceId}/feature`, {}),
    onMutate: clearMessages,
    onSuccess: async () => {
      setSuccessMessage("Resource marked as featured.");
      await refreshFeaturedData();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to feature resource.");
    },
  });

  const unfeatureMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.post<MessageResponse>(`/api/admin/resources/${resourceId}/unfeature`, {}),
    onMutate: clearMessages,
    onSuccess: async () => {
      setSuccessMessage("Resource removed from featured.");
      await refreshFeaturedData();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to remove featured resource.");
    },
  });

  const isActing =
    applyMutation.isPending ||
    approveMutation.isPending ||
    featureMutation.isPending ||
    unfeatureMutation.isPending;

  return (
    <main>
      <PageContainer
        wide
        eyebrow="The Collection / 2026"
        title="Featured Resources"
        lede="Apply for homepage placement, review featured requests, and manage curated selections."
        rightSlot={
          <>
            <Link href="/browse">
              <Button variant="outline">Browse Resources</Button>
            </Link>
            {(user?.role === "REVIEWER" || user?.role === "ADMINISTRATOR") && (
              <Link href="/review">
                <Button variant="outline">Review</Button>
              </Link>
            )}
          </>
        }
      >
        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <section className="mb-10">
          <SectionTitle
            title="Currently Featured"
            helper="These resources are currently prioritized for homepage display."
          />
          {currentFeaturedQuery.isLoading ? (
            <LoadingRows />
          ) : currentFeaturedQuery.isError ? (
            <ErrorBox text="Failed to load featured resources." />
          ) : (currentFeaturedQuery.data ?? []).length === 0 ? (
            <EmptyBox text="No resources are currently featured." />
          ) : (
            <TableCard
              headers={[
                ["Title", 3],
                ["Contributor", 3],
                ["Approved date", 2],
                ["Featured Status", 2],
                ...(isAdmin ? [["Action", 2] as [string, number]] : []),
              ]}
            >
              {currentFeaturedQuery.data?.map((resource) => (
                <TableRow key={resource.id}>
                  <Cell span={3} title>{resource.title || "Untitled draft"}</Cell>
                  <Cell span={3} muted>{resource.contributorName}</Cell>
                  <Cell span={2} muted>{formatEnglishDate(resource.approvedAt)}</Cell>
                  <Cell span={2}>{featuredStatusLabel(resource.featuredStatus, resource.isFeatured)}</Cell>
                  {isAdmin && (
                    <Cell span={2} right>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActing}
                        onClick={() => unfeatureMutation.mutate(resource.id)}
                      >
                        <StarOff className="size-3.5" />
                        Unfeature
                      </Button>
                    </Cell>
                  )}
                </TableRow>
              ))}
            </TableCard>
          )}
        </section>

        {!isAdmin && (
          <section>
            <SectionTitle
              title="My Approved Resources"
              helper="Submit approved resources for homepage featured consideration."
            />
            {myResourcesQuery.isLoading ? (
              <LoadingRows />
            ) : myResourcesQuery.isError ? (
              <ErrorBox text="Failed to load your resources." />
            ) : myApprovedResources.length === 0 ? (
              <EmptyBox text="You do not have any approved resources available for featured applications yet." />
            ) : (
              <TableCard
                headers={[
                  ["Title", 4],
                  ["Approved", 2],
                  ["Featured Status", 3],
                  ["Action", 3],
                ]}
              >
                {myApprovedResources.map((resource) => {
                  const canApply =
                    resource.status === "APPROVED" &&
                    !resource.isFeatured &&
                    resource.featuredStatus !== "PENDING";

                  return (
                    <TableRow key={resource.id}>
                      <Cell span={4} title>{resource.title || "Untitled draft"}</Cell>
                      <Cell span={2} muted>{formatEnglishDate(resource.approvedAt)}</Cell>
                      <Cell span={3}>{featuredStatusLabel(resource.featuredStatus, resource.isFeatured)}</Cell>
                      <Cell span={3} right>
                        <Button
                          size="sm"
                          disabled={!canApply || isActing}
                          onClick={() => applyMutation.mutate(resource.id)}
                        >
                          {resource.isFeatured || resource.featuredStatus === "APPROVED"
                            ? "Featured"
                            : resource.featuredStatus === "PENDING"
                              ? "Application Pending"
                              : resource.featuredStatus === "REJECTED"
                                ? "Reapply for Featured"
                                : "Apply for Featured"}
                        </Button>
                      </Cell>
                    </TableRow>
                  );
                })}
              </TableCard>
            )}
          </section>
        )}

        {isAdmin && (
          <>
            <section className="mb-10">
              <SectionTitle
                title="Pending Featured Applications"
                helper="Review requests submitted by contributors and reviewers."
              />
              {pendingApplicationsQuery.isLoading ? (
                <LoadingRows />
              ) : pendingApplicationsQuery.isError ? (
                <ErrorBox text="Failed to load pending featured applications." />
              ) : (pendingApplicationsQuery.data ?? []).length === 0 ? (
                <EmptyBox text="No pending featured applications." />
              ) : (
                <TableCard
                  headers={[
                    ["Title", 3],
                    ["Contributor", 3],
                    ["Requested date", 2],
                    ["Action", 4],
                  ]}
                >
                  {pendingApplicationsQuery.data?.map((resource) => (
                    <TableRow key={resource.id}>
                      <Cell span={3} title>{resource.title || "Untitled draft"}</Cell>
                      <Cell span={3} muted>{resource.contributorName}</Cell>
                      <Cell span={2} muted>{formatEnglishDate(resource.approvedAt)}</Cell>
                      <Cell span={4} right>
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={isActing}
                          onClick={() =>
                            approveMutation.mutate({
                              resourceId: resource.id,
                              approved: true,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActing}
                          onClick={() =>
                            approveMutation.mutate({
                              resourceId: resource.id,
                              approved: false,
                            })
                          }
                        >
                          Decline
                        </Button>
                      </Cell>
                    </TableRow>
                  ))}
                </TableCard>
              )}
            </section>

            <section>
              <SectionTitle
                title="Manual Featured Selection"
                helper="Manually pin approved resources to the homepage or remove them from featured placement."
              />
              {approvedResourcesQuery.isLoading ? (
                <LoadingRows />
              ) : approvedResourcesQuery.isError ? (
                <ErrorBox text="Failed to load approved resources." />
              ) : approvedResourcePool.length === 0 ? (
                <EmptyBox text="No approved resources available." />
              ) : (
                <TableCard
                  headers={[
                    ["Title", 3],
                    ["Contributor", 2],
                    ["Approved date", 2],
                    ["Review Status", 2],
                    ["Featured State", 2],
                    ["Action", 1],
                  ]}
                >
                  {approvedResourcePool.map((resource) => (
                    <TableRow key={resource.id}>
                      <Cell span={3} title>{resource.title || "Untitled draft"}</Cell>
                      <Cell span={2} muted>{resource.contributorName}</Cell>
                      <Cell span={2} muted>{formatEnglishDate(resource.approvedAt)}</Cell>
                      <Cell span={2}><StatusBadge status={resource.status} /></Cell>
                      <Cell span={2}>{featuredStatusLabel(resource.featuredStatus, resource.isFeatured)}</Cell>
                      <Cell span={1} right>
                        {resource.isFeatured ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActing}
                            onClick={() => unfeatureMutation.mutate(resource.id)}
                          >
                            Unfeature
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isActing}
                            onClick={() => featureMutation.mutate(resource.id)}
                          >
                            Feature
                          </Button>
                        )}
                      </Cell>
                    </TableRow>
                  ))}
                </TableCard>
              )}
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
}

function SectionTitle({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-[1.6rem] font-medium">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-muted-foreground">{helper}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {text}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-heritage-card)]">
      {text}
    </div>
  );
}

function TableCard({
  headers,
  children,
}: {
  headers: [string, number][];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-heritage-card)]">
      <div className="grid grid-cols-12 border-b border-border bg-secondary/40 px-6 py-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {headers.map(([label, span]) => (
          <div
            key={label}
            className={label === "Action" ? "text-right" : ""}
            style={{ gridColumn: `span ${span} / span ${span}` }}
          >
            {label}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function TableRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 items-center border-b border-border px-6 py-4 text-sm last:border-0 hover:bg-secondary/30">
      {children}
    </div>
  );
}

function Cell({
  span,
  children,
  title,
  muted,
  right,
}: {
  span: number;
  children: React.ReactNode;
  title?: boolean;
  muted?: boolean;
  right?: boolean;
}) {
  return (
    <div
      className={`${title ? "font-serif text-base font-medium" : ""} ${
        muted ? "text-muted-foreground" : ""
      } ${right ? "flex justify-end gap-2 text-right" : ""}`}
      style={{ gridColumn: `span ${span} / span ${span}` }}
    >
      {children}
    </div>
  );
}

export default function FeaturedPage() {
  return (
    <ProtectedRoute
      requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}
    >
      <FeaturedContent />
    </ProtectedRoute>
  );
}
