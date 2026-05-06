"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
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
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

function decisionClass(decision: ReviewDecision) {
  return decision === "APPROVED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}

function ReviewHistoryContent() {
  const { user, isLoading } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<"ALL" | "MINE">("ALL");
  const [decision, setDecision] = useState<"ALL" | ReviewDecision>("ALL");
  const [page, setPage] = useState(0);

  const isAdmin = user?.role === "ADMINISTRATOR";
  const reviewerEmail = user?.email ?? "";
  const effectiveScope = isAdmin ? scope : "MINE";

  const queryParams: ReviewHistoryQueryParams = useMemo(
    () => ({
      q: keyword,
      reviewerEmail:
        effectiveScope === "MINE" ? reviewerEmail || undefined : undefined,
      decision,
      page,
      size: 10,
      sort: "createdAt,desc",
    }),
    [keyword, effectiveScope, reviewerEmail, decision, page]
  );

  const historyQuery = useQuery({
    queryKey: ["review-history", queryParams],
    queryFn: () => getReviewHistory(queryParams),
    placeholderData: (previousData) => previousData,
    enabled:
      !isLoading &&
      Boolean(user) &&
      (effectiveScope === "ALL" || Boolean(reviewerEmail)),
  });

  const records = historyQuery.data?.content ?? [];
  const totalPages = historyQuery.data?.totalPages ?? 1;
  const totalElements = historyQuery.data?.totalElements ?? 0;

  if (isLoading || !user) {
    return (
      <main>
        <PageContainer wide>
          <div className="rounded-2xl border border-border bg-white px-6 py-16 text-center text-muted-foreground shadow-[var(--shadow-heritage-card)]">
            Loading review history...
          </div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main>
      <PageContainer
        wide
        eyebrow="Review Module"
        title="Review History"
        lede={
          isAdmin
            ? "View past review decisions and switch between all team reviews and your own review records."
            : "View your own past review decisions."
        }
        rightSlot={
          <Link href="/review">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              Back to Review Queue
            </Button>
          </Link>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-heritage-card)]">
          {isAdmin && (
            <div className="flex items-center gap-2 border-b border-border p-4">
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

          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-12">
            <div className="relative md:col-span-8">
              <label htmlFor="review-history-keyword" className="sr-only">
                Keyword
              </label>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="review-history-keyword"
                placeholder={
                  isAdmin
                    ? "Search reviewer email, decision, date, comments..."
                    : "Search decision, date, comments..."
                }
                value={keyword}
                onChange={(e) => {
                  setPage(0);
                  setKeyword(e.target.value);
                }}
                className="pl-9"
              />
            </div>

            <div className="md:col-span-4">
              <label htmlFor="review-history-decision" className="sr-only">
                Decision
              </label>
              <select
                id="review-history-decision"
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4 text-sm text-muted-foreground">
            <span>
              Showing <span className="font-medium text-foreground">{records.length}</span> of{" "}
              <span className="font-medium text-foreground">{totalElements}</span>{" "}
              record(s)
            </span>
            <span>
              Page <span className="font-medium text-foreground">{page + 1}</span> of{" "}
              <span className="font-medium text-foreground">
                {Math.max(totalPages, 1)}
              </span>
            </span>
          </div>

          {historyQuery.isLoading ? (
            <div className="px-6 py-16 text-center text-muted-foreground">
              Loading review history...
            </div>
          ) : historyQuery.isError ? (
            <div className="px-6 py-10 text-center text-destructive">
              Failed to load review history. Please try again later.
            </div>
          ) : effectiveScope === "MINE" && !reviewerEmail ? (
            <div className="px-6 py-16 text-center">
              <p className="font-serif text-xl">Unable to load your reviewer email.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please sign in again and retry.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-serif text-xl">
                {effectiveScope === "MINE"
                  ? "You have not reviewed any resources yet."
                  : "No review history yet."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Review decisions will appear here once resources have been approved
                or rejected.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 border-b border-border bg-secondary/40 px-6 py-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <div style={{ gridColumn: "span 3 / span 3" }}>Resource</div>
                <div style={{ gridColumn: "span 2 / span 2" }}>Reviewer</div>
                <div style={{ gridColumn: "span 1 / span 1" }}>Decision</div>
                <div style={{ gridColumn: "span 3 / span 3" }}>Comments</div>
                <div style={{ gridColumn: "span 2 / span 2" }}>Reviewed At</div>
                <div className="text-right" style={{ gridColumn: "span 1 / span 1" }}>
                  Action
                </div>
              </div>
              {records.map((record) => (
                <ReviewHistoryRow key={record.id} record={record} />
              ))}
            </>
          )}
        </div>

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
    <div className="grid grid-cols-12 items-start border-b border-border px-6 py-4 text-sm last:border-0 hover:bg-secondary/30">
      <div className="font-serif text-base font-medium" style={{ gridColumn: "span 3 / span 3" }}>
        {record.resourceTitle}
      </div>

      <div style={{ gridColumn: "span 2 / span 2" }}>
        <div>{record.reviewerName}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {record.reviewerEmail}
        </div>
      </div>

      <div style={{ gridColumn: "span 1 / span 1" }}>
        <Badge variant="outline" className={decisionClass(record.decision)}>
          {record.decision}
        </Badge>
      </div>

      <div style={{ gridColumn: "span 3 / span 3" }}>
        <p className="max-w-md whitespace-pre-wrap text-muted-foreground">
          {record.comments}
        </p>
      </div>

      <div className="text-muted-foreground" style={{ gridColumn: "span 2 / span 2" }}>
        <time dateTime={record.createdAt}>{formatCreatedAt(record.createdAt)}</time>
      </div>

      <div className="flex justify-end" style={{ gridColumn: "span 1 / span 1" }}>
        <Link href={`/review/${record.resourceId}`}>
          <Button variant="outline" size="sm">
            View
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ReviewHistoryPage() {
  return (
    <ProtectedRoute requiredRoles={["REVIEWER", "ADMINISTRATOR"]}>
      <ReviewHistoryContent />
    </ProtectedRoute>
  );
}
