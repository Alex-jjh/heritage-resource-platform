"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getReviewHistory } from "@/lib/review-history/service";
import type {
    ReviewDecision,
    ReviewHistoryQueryParams,
    ReviewHistoryRecord,
} from "@/types/review-history";

function formatCreatedAt(dateString: string) {
    return new Date(dateString).toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function getAuthInfoFromToken() {
    if (typeof window === "undefined") {
        return {
            reviewerEmail: "",
            isAdmin: false,
        };
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
        return {
            reviewerEmail: "",
            isAdmin: false,
        };
    }

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));

        const reviewerEmail =
            (typeof payload.email === "string" && payload.email) ||
            (typeof payload.sub === "string" && payload.sub.includes("@") ? payload.sub : "") ||
            "";

        const roles: string[] = Array.isArray(payload.roles)
            ? payload.roles
            : Array.isArray(payload.authorities)
                ? payload.authorities
                : typeof payload.role === "string"
                    ? [payload.role]
                    : [];

        const isAdmin = roles.some(
            (role) =>
                role === "ADMINISTRATOR" ||
                role === "ROLE_ADMINISTRATOR" ||
                role === "ADMIN"
        );

        return {
            reviewerEmail,
            isAdmin,
        };
    } catch {
        return {
            reviewerEmail: "",
            isAdmin: false,
        };
    }
}

function ReviewHistoryContent() {
    const authInfo = getAuthInfoFromToken();

    const [keyword, setKeyword] = useState("");
    const [scope, setScope] = useState<"ALL" | "MINE">(
        authInfo.isAdmin ? "ALL" : "MINE"
    );
    const [decision, setDecision] = useState<"ALL" | ReviewDecision>("ALL");
    const [page, setPage] = useState(0);

    const effectiveScope = authInfo.isAdmin ? scope : "MINE";

    const queryParams: ReviewHistoryQueryParams = useMemo(
        () => ({
            q: keyword,
            reviewerEmail:
                effectiveScope === "MINE" ? authInfo.reviewerEmail || undefined : undefined,
            decision,
            page,
            size: 10,
            sort: "createdAt,desc",
        }),
        [keyword, effectiveScope, authInfo.reviewerEmail, decision, page]
    );

    const historyQuery = useQuery({
        queryKey: ["review-history", queryParams],
        queryFn: () => getReviewHistory(queryParams),
        placeholderData: (previousData) => previousData,

        enabled: effectiveScope === "ALL" || Boolean(authInfo.reviewerEmail),
    });

    const records = historyQuery.data?.content ?? [];
    const totalPages = historyQuery.data?.totalPages ?? 1;
    const totalElements = historyQuery.data?.totalElements ?? 0;

    return (
        <main>
            <PageContainer>
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                            Review Module
                        </p>
                        <h1 className="font-serif text-3xl font-bold">Review History</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            {authInfo.isAdmin
                                ? "View past review decisions and switch between all team reviews and your own review records."
                                : "View your own past review decisions."}
                        </p>
                    </div>

                    <Link href="/review">
                        <Button variant="outline">Back to Review Queue</Button>
                    </Link>
                </div>

                {authInfo.isAdmin && (
                    <div className="mb-4 flex items-center gap-2">
                        <Button
                            variant={scope === "ALL" ? "default" : "outline"}
                            onClick={() => {
                                setPage(0);
                                setScope("ALL");
                            }}
                        >
                            All Reviews
                        </Button>
                        <Button
                            variant={scope === "MINE" ? "default" : "outline"}
                            onClick={() => {
                                setPage(0);
                                setScope("MINE");
                            }}
                        >
                            My Reviews
                        </Button>
                    </div>
                )}

                <div className="mb-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <label htmlFor="review-history-keyword" className="text-sm font-medium">
                            Keyword
                        </label>
                        <Input
                            id="review-history-keyword"
                            placeholder={
                                authInfo.isAdmin
                                    ? "Search reviewer email, decision, date, comments..."
                                    : "Search decision, date, comments..."
                            }
                            value={keyword}
                            onChange={(e) => {
                                setPage(0);
                                setKeyword(e.target.value);
                            }}
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="review-history-decision" className="text-sm font-medium">
                            Decision
                        </label>
                        <select
                            id="review-history-decision"
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={decision}
                            onChange={(e) => {
                                setPage(0);
                                setDecision(e.target.value as "ALL" | ReviewDecision);
                            }}
                        >
                            <option value="ALL">All decisions</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Showing{" "}
                        <span className="font-medium text-foreground">{records.length}</span> of{" "}
                        <span className="font-medium text-foreground">{totalElements}</span> record(s)
                    </span>
                    <span>
                        Page <span className="font-medium text-foreground">{page + 1}</span> of{" "}
                        <span className="font-medium text-foreground">{Math.max(totalPages, 1)}</span>
                    </span>
                </div>

                {historyQuery.isLoading ? (
                    <div className="rounded-lg border bg-card px-6 py-16 text-center text-muted-foreground">
                        Loading review history...
                    </div>
                ) : historyQuery.isError ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-10 text-center text-destructive">
                        Failed to load review history. Please try again later.
                    </div>
                ) : effectiveScope === "MINE" && !authInfo.reviewerEmail ? (
                    <div className="rounded-lg border bg-card px-6 py-16 text-center">
                        <p className="text-lg font-medium">Unable to load your reviewer email.</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Please sign in again and retry.
                        </p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="rounded-lg border bg-card px-6 py-16 text-center">
                        <p className="text-lg font-medium">
                            {effectiveScope === "MINE"
                                ? "You haven’t reviewed any resources yet."
                                : "No review history yet."}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {effectiveScope === "MINE"
                                ? "Once you approve or reject resources, your review records will appear here."
                                : "Review decisions will appear here once resources have been approved or rejected."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border bg-card">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-4 py-3 text-left font-medium">Resource</th>
                                    <th className="px-4 py-3 text-left font-medium">Reviewer</th>
                                    <th className="px-4 py-3 text-left font-medium">Decision</th>
                                    <th className="px-4 py-3 text-left font-medium">Comments</th>
                                    <th className="px-4 py-3 text-left font-medium">Reviewed At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <ReviewHistoryRow key={record.id} record={record} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        disabled={page === 0 || historyQuery.isLoading}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            setPage((current) => (historyQuery.data?.last ? current : current + 1))
                        }
                        disabled={(historyQuery.data?.last ?? true) || historyQuery.isLoading}
                    >
                        Next
                    </Button>
                </div>
            </PageContainer>
        </main>
    );
}

function ReviewHistoryRow({ record }: { record: ReviewHistoryRecord }) {
    return (
        <tr className="border-b align-top last:border-0 hover:bg-muted/20">
            <td className="px-4 py-3">
                <div className="font-medium">{record.resourceTitle}</div>
            </td>

            <td className="px-4 py-3">
                <div>{record.reviewerName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    {record.reviewerEmail}
                </div>
            </td>

            <td className="px-4 py-3">
                <Badge variant={record.decision === "APPROVED" ? "default" : "destructive"}>
                    {record.decision}
                </Badge>
            </td>

            <td className="px-4 py-3">
                <p className="max-w-md whitespace-pre-wrap text-muted-foreground">
                    {record.comments}
                </p>
            </td>

            <td className="px-4 py-3 text-muted-foreground">
                <time dateTime={record.createdAt}>{formatCreatedAt(record.createdAt)}</time>
            </td>
        </tr>
    );
}

export default function ReviewHistoryPage() {
    return (
        <ProtectedRoute requiredRoles={["REVIEWER", "ADMINISTRATOR"]}>
            <ReviewHistoryContent />
        </ProtectedRoute>
    );
}