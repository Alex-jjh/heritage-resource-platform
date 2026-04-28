"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    if (!value) return "—";
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
            <PageContainer>
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="font-serif text-3xl font-bold">Featured Resources</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Apply for homepage placement, review pending featured requests,
                            and manage manually selected featured resources.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link href="/browse">
                            <Button variant="outline">Browse Resources</Button>
                        </Link>
                        {(user?.role === "REVIEWER" || user?.role === "ADMINISTRATOR") && (
                            <Link href="/review">
                                <Button variant="outline">Review</Button>
                            </Link>
                        )}
                    </div>
                </div>

                {successMessage && (
                    <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                        {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {errorMessage}
                    </div>
                )}

                <section className="mb-10">
                    <div className="mb-4">
                        <h2 className="font-serif text-2xl font-bold">Currently Featured</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            These resources are currently prioritized for homepage display.
                        </p>
                    </div>

                    {currentFeaturedQuery.isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-md" />
                            ))}
                        </div>
                    ) : currentFeaturedQuery.isError ? (
                        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                            Failed to load featured resources.
                        </div>
                    ) : (currentFeaturedQuery.data ?? []).length === 0 ? (
                        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                            No resources are currently featured.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium">Title</th>
                                        <th className="px-4 py-3 text-left font-medium">Contributor</th>
                                        <th className="px-4 py-3 text-left font-medium">Approved</th>
                                        <th className="px-4 py-3 text-left font-medium">Featured Status</th>
                                        {isAdmin && (
                                            <th className="px-4 py-3 text-right font-medium">Action</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentFeaturedQuery.data?.map((resource) => (
                                        <tr
                                            key={resource.id}
                                            className="border-b last:border-0 hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-3 font-medium">{resource.title || "Untitled draft"}</td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {resource.contributorName}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {formatEnglishDate(resource.approvedAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {featuredStatusLabel(
                                                    resource.featuredStatus,
                                                    resource.isFeatured
                                                )}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isActing}
                                                        onClick={() => unfeatureMutation.mutate(resource.id)}
                                                    >
                                                        Unfeature
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {!isAdmin && (
                    <section>
                        <div className="mb-4">
                            <h2 className="font-serif text-2xl font-bold">My Approved Resources</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Submit approved resources for homepage featured consideration.
                            </p>
                        </div>

                        {myResourcesQuery.isLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-20 w-full rounded-md" />
                                ))}
                            </div>
                        ) : myResourcesQuery.isError ? (
                            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                                Failed to load your resources.
                            </div>
                        ) : myApprovedResources.length === 0 ? (
                            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                                You do not have any approved resources available for featured
                                applications yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-3 text-left font-medium">Title</th>
                                            <th className="px-4 py-3 text-left font-medium">Approved</th>
                                            <th className="px-4 py-3 text-left font-medium">Featured Status</th>
                                            <th className="px-4 py-3 text-right font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myApprovedResources.map((resource) => {
                                            const featuredLabel = featuredStatusLabel(
                                                resource.featuredStatus,
                                                resource.isFeatured
                                            );

                                            const canApply =
                                                resource.status === "APPROVED" &&
                                                !resource.isFeatured &&
                                                resource.featuredStatus !== "PENDING";

                                            return (
                                                <tr
                                                    key={resource.id}
                                                    className="border-b last:border-0 hover:bg-muted/30"
                                                >
                                                    <td className="px-4 py-3 font-medium">{resource.title || "Untitled draft"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {formatEnglishDate(resource.approvedAt)}
                                                    </td>
                                                    <td className="px-4 py-3">{featuredLabel}</td>
                                                    <td className="px-4 py-3 text-right">
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
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {isAdmin && (
                    <>
                        <section className="mb-10">
                            <div className="mb-4">
                                <h2 className="font-serif text-2xl font-bold">
                                    Pending Featured Applications
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Review requests submitted by contributors and reviewers.
                                </p>
                            </div>

                            {pendingApplicationsQuery.isLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded-md" />
                                    ))}
                                </div>
                            ) : pendingApplicationsQuery.isError ? (
                                <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                                    Failed to load pending featured applications.
                                </div>
                            ) : (pendingApplicationsQuery.data ?? []).length === 0 ? (
                                <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                                    No pending featured applications.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-4 py-3 text-left font-medium">Title</th>
                                                <th className="px-4 py-3 text-left font-medium">Contributor</th>
                                                <th className="px-4 py-3 text-left font-medium">Approved</th>
                                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                                <th className="px-4 py-3 text-right font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingApplicationsQuery.data?.map((resource) => (
                                                <tr
                                                    key={resource.id}
                                                    className="border-b last:border-0 hover:bg-muted/30"
                                                >
                                                    <td className="px-4 py-3 font-medium">{resource.title || "Untitled draft"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {resource.contributorName}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {formatEnglishDate(resource.approvedAt)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {featuredStatusLabel(
                                                            resource.featuredStatus,
                                                            resource.isFeatured
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
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
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section>
                            <div className="mb-4">
                                <h2 className="font-serif text-2xl font-bold">
                                    Manual Featured Selection
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Manually pin approved resources to the homepage or remove them
                                    from featured placement.
                                </p>
                            </div>

                            {approvedResourcesQuery.isLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded-md" />
                                    ))}
                                </div>
                            ) : approvedResourcesQuery.isError ? (
                                <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                                    Failed to load approved resources.
                                </div>
                            ) : approvedResourcePool.length === 0 ? (
                                <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                                    No approved resources available.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-4 py-3 text-left font-medium">Title</th>
                                                <th className="px-4 py-3 text-left font-medium">Contributor</th>
                                                <th className="px-4 py-3 text-left font-medium">Approved</th>
                                                <th className="px-4 py-3 text-left font-medium">Review Status</th>
                                                <th className="px-4 py-3 text-left font-medium">Featured State</th>
                                                <th className="px-4 py-3 text-right font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {approvedResourcePool.map((resource) => (
                                                <tr
                                                    key={resource.id}
                                                    className="border-b last:border-0 hover:bg-muted/30"
                                                >
                                                    <td className="px-4 py-3 font-medium">{resource.title || "Untitled draft"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {resource.contributorName}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {formatEnglishDate(resource.approvedAt)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={resource.status} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {featuredStatusLabel(
                                                            resource.featuredStatus,
                                                            resource.isFeatured
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
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
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </PageContainer>
        </main>
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