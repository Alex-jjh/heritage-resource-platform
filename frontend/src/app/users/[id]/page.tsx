"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { ResourceCard } from "@/components/resource-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfileResponse } from "@/types";

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
}

function ProfileAvatar({
    displayName,
    avatarUrl,
}: {
    displayName: string;
    avatarUrl?: string | null;
}) {
    const initials = getInitials(displayName) || "?";

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={displayName}
                className="h-20 w-20 rounded-full border object-cover"
            />
        );
    }

    return (
        <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted text-2xl font-semibold text-foreground">
            {initials}
        </div>
    );
}

function ContributorProfileContent({ id }: { id: string }) {
    const router = useRouter();
    const { user } = useAuth();

    const profileQuery = useQuery({
        queryKey: ["user-profile", id],
        queryFn: () =>
            apiClient.get<UserProfileResponse>(`/api/users/${id}/profile`),
    });

    if (profileQuery.isLoading) {
        return (
            <main>
                <PageContainer className="space-y-6">
                    <Skeleton className="h-10 w-32" />
                    <div className="flex items-start gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-56" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-72" />
                        </div>
                    </div>
                    <Skeleton className="h-40 w-full" />
                </PageContainer>
            </main>
        );
    }

    if (profileQuery.isError) {
        const err = profileQuery.error;
        const message =
            err instanceof ApiError
                ? err.message
                : "Failed to load contributor profile.";

        return (
            <main>
                <PageContainer className="space-y-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        ← Back
                    </Button>
                    <div
                        role="alert"
                        className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
                    >
                        {message}
                    </div>
                </PageContainer>
            </main>
        );
    }

    const profile = profileQuery.data!;
    const isOwner = user?.id === profile.id;
    const resources = profile.publishedResources ?? [];
    const resourceCount = resources.length;

    const privateMode = !isOwner && profile.profilePublic === false;

    return (
        <main>
            <PageContainer className="space-y-8">
                <div className="flex items-center justify-between gap-3">
                    <Button variant="outline" onClick={() => router.back()}>
                        ← Back
                    </Button>

                    {isOwner && (
                        <Link href="/profile">
                            <Button variant="outline">Edit My Profile</Button>
                        </Link>
                    )}
                </div>

                <section className="rounded-xl border bg-card p-6">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                        <ProfileAvatar
                            displayName={profile.displayName}
                            avatarUrl={profile.avatarUrl}
                        />

                        <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="font-serif text-3xl font-bold">
                                    {profile.displayName}
                                </h1>

                                {isOwner ? (
                                    <Badge variant="outline">Your Public Profile</Badge>
                                ) : privateMode ? (
                                    <Badge variant="secondary">Private Profile</Badge>
                                ) : (
                                    <Badge variant="outline">Contributor</Badge>
                                )}
                            </div>

                            {!privateMode && profile.showEmail && (
                                <p className="text-sm text-muted-foreground">{profile.email}</p>
                            )}

                            {!privateMode && profile.bio ? (
                                <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                    {profile.bio}
                                </p>
                            ) : privateMode ? (
                                <p className="text-sm text-muted-foreground">
                                    This contributor has chosen to keep their profile details private.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No bio provided yet.
                                </p>
                            )}

                            <div className="pt-2">
                                <p className="text-sm text-muted-foreground">
                                    Published resources: {resourceCount}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {!privateMode && (
                    <section className="space-y-4">
                        <div>
                            <h2 className="font-serif text-2xl font-bold">
                                Published Resources
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Approved resources shared by this contributor.
                            </p>
                        </div>

                        {resources.length === 0 ? (
                            <div className="rounded-lg border bg-card px-6 py-16 text-center">
                                <p className="text-lg font-medium">No published resources yet.</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Once approved resources are available, they will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {resources.map((resource) => (
                                    <ResourceCard key={resource.id} resource={resource} />
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </PageContainer>
        </main>
    );
}

export default function ContributorProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);

    return (
        <ProtectedRoute>
            <ContributorProfileContent id={id} />
        </ProtectedRoute>
    );
}