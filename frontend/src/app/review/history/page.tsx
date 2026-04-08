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

function formatReviewedAt(dateString: string) {
    return new Date(dateString).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function ReviewHistoryContent() {
    const [keyword, setKeyword] = useState("");
    const [reviewerEmployeeId, setReviewerEmployeeId] = useState("");
    const [decision, setDecision] = useState<"ALL" | ReviewDecision>("ALL");
    const [page, setPage] = useState(0);

    const queryParams: ReviewHistoryQueryParams = useMemo(
        () => ({
            q: keyword,
            reviewerEmployeeId,
            decision,
            page,
            size: 10,
            sort: "reviewedAt,desc",
        }),
        [keyword, reviewerEmployeeId, decision, page]
    );

    const historyQuery = useQuery({
        queryKey: ["review-history", queryParams],
        queryFn: () => getReviewHistory(queryParams),
        placeholderData: (previousData) => previousData,
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
                            View past review decisions and filter records by reviewer employee ID,
                            keyword, or decision type.
                        </p>
                    </div>

                    <Link href="/review">
                        <Button variant="outline">Back to Review Queue</Button>
                    </Link>
                </div>

                <div className="mb-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
                    <div className="space-y-1">
                        <label htmlFor="review-history-keyword" className="text-sm font-medium">
                            Keyword
                        </label>
                        <Input
                            id="review-history-keyword"
                            placeholder="Search decision, date, comments..."
                            value={keyword}
                            onChange={(e) => {
                                setPage(0);
                                setKeyword(e.target.value);
                            }}
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="review-history-employee" className="text-sm font-medium">
                            Reviewer Employee ID
                        </label>
                        <Input
                            id="review-history-employee"
                            placeholder="e.g. EMP-R-1001"
                            value={reviewerEmployeeId}
                            onChange={(e) => {
                                setPage(0);
                                setReviewerEmployeeId(e.target.value);
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
                ) : records.length === 0 ? (
                    <div className="rounded-lg border bg-card px-6 py-16 text-center">
                        <p className="text-lg font-medium">No matching review history records.</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Try adjusting the keyword, employee ID, or decision filters.
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
                            setPage((current) =>
                                historyQuery.data?.last ? current : current + 1
                            )
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
                <div className="mt-1 text-xs text-muted-foreground">{record.resourceId}</div>
            </td>

            <td className="px-4 py-3">
                <div>{record.reviewerName}</div>
                <div className="mt-1 text-xs text-muted-foreground">{record.reviewerEmail}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    Employee ID: {record.reviewerEmployeeId}
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
                <time dateTime={record.reviewedAt}>{formatReviewedAt(record.reviewedAt)}</time>
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