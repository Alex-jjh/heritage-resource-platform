"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MyCommentResponse, Page } from "@/types";

const PAGE_SIZE = 10;

function formatCommentDate(dateString: string) {
    return new Date(dateString).toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function MyCommentsContent() {
    const [page, setPage] = useState(0);

    const commentsQuery = useQuery({
        queryKey: ["my-comments", page],
        queryFn: () =>
            apiClient.get<Page<MyCommentResponse>>(
                `/api/comments/me?page=${page}&size=${PAGE_SIZE}`
            ),
    });

    if (commentsQuery.isLoading) {
        return (
            <main>
                <PageContainer className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-4 w-80" />
                    </div>

                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="rounded-lg border p-5 space-y-3">
                                <Skeleton className="h-5 w-56" />
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-9 w-40" />
                            </div>
                        ))}
                    </div>
                </PageContainer>
            </main>
        );
    }

    if (commentsQuery.isError) {
        const err = commentsQuery.error;
        const message =
            err instanceof ApiError
                ? err.message
                : "Failed to load your comments.";

        return (
            <main>
                <PageContainer className="space-y-4">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                            Activity
                        </p>
                        <h1 className="font-serif text-3xl font-bold">My Comments</h1>
                    </div>

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

    const data = commentsQuery.data!;
    const comments = data.content ?? [];

    return (
        <main>
            <PageContainer className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                            Activity
                        </p>
                        <h1 className="font-serif text-3xl font-bold">My Comments</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Review your previous comments and jump back to the exact resource
                            where each comment was posted.
                        </p>
                    </div>

                    <Link href="/browse">
                        <Button variant="outline">Back to Browse</Button>
                    </Link>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Showing{" "}
                        <span className="font-medium text-foreground">
                            {comments.length}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-foreground">
                            {data.totalElements}
                        </span>{" "}
                        comment(s)
                    </span>
                    <span>
                        Page{" "}
                        <span className="font-medium text-foreground">
                            {data.number + 1}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-foreground">
                            {Math.max(data.totalPages, 1)}
                        </span>
                    </span>
                </div>

                {comments.length === 0 ? (
                    <div className="rounded-lg border bg-card px-6 py-16 text-center">
                        <p className="text-lg font-medium">You haven’t posted any comments yet.</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Once you comment on approved resources, your comment history will
                            appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <article
                                key={comment.commentId}
                                className="rounded-lg border bg-card p-5 transition hover:shadow-sm"
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm text-muted-foreground">
                                                On resource
                                            </p>
                                            <h2 className="truncate text-lg font-semibold">
                                                {comment.resourceTitle}
                                            </h2>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {comment.anonymous && (
                                                <Badge variant="secondary">Anonymous</Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {formatCommentDate(comment.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="whitespace-pre-wrap rounded-md bg-muted/40 px-4 py-3 text-sm leading-relaxed">
                                        {comment.body}
                                    </p>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-xs text-muted-foreground">
                                            Target comment page: {comment.commentPage + 1}
                                        </p>

                                        <Link
                                            href={`/resources/${comment.resourceId}?commentId=${comment.commentId}&commentPage=${comment.commentPage}`}
                                        >
                                            <Button size="sm">Open Resource</Button>
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {data.totalPages > 1 && (
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setPage((current) => Math.max(0, current - 1))}
                            disabled={data.first}
                        >
                            Previous
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={data.last}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </PageContainer>
        </main>
    );
}

export default function MyCommentsPage() {
    return (
        <ProtectedRoute>
            <MyCommentsContent />
        </ProtectedRoute>
    );
}