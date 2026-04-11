import { apiClient } from "@/lib/api-client";
import type {
    PagedResponse,
    ReviewHistoryQueryParams,
    ReviewHistoryRecord,
} from "@/types/review-history";

function normalizeKeyword(value: string): string {
    return value.trim().toLowerCase();
}

function buildPagedResponse<T>(
    items: T[],
    page: number,
    size: number
): PagedResponse<T> {
    const start = page * size;
    const end = start + size;
    const content = items.slice(start, end);
    const totalElements = items.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));

    return {
        content,
        totalElements,
        totalPages,
        size,
        number: page,
        first: page === 0,
        last: page >= totalPages - 1,
        empty: totalElements === 0,
    };
}

function filterAndSortReviewHistory(
    items: ReviewHistoryRecord[],
    params: ReviewHistoryQueryParams
): ReviewHistoryRecord[] {
    const {
        q = "",
        reviewerEmail = "",
        decision = "ALL",
        sort = "createdAt,desc",
    } = params;

    const keyword = normalizeKeyword(q);
    const normalizedReviewerEmail = normalizeKeyword(reviewerEmail);

    let filtered = [...items];

    if (keyword) {
        filtered = filtered.filter((item) => {
            const resourceTitle = item.resourceTitle?.toLowerCase?.() ?? "";
            const comments = item.comments?.toLowerCase?.() ?? "";
            const reviewerName = item.reviewerName?.toLowerCase?.() ?? "";
            const reviewerEmailValue = item.reviewerEmail?.toLowerCase?.() ?? "";
            const decisionValue = item.decision?.toLowerCase?.() ?? "";
            const createdAt = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("en-GB").toLowerCase()
                : "";

            return (
                resourceTitle.includes(keyword) ||
                comments.includes(keyword) ||
                reviewerName.includes(keyword) ||
                reviewerEmailValue.includes(keyword) ||
                decisionValue.includes(keyword) ||
                createdAt.includes(keyword)
            );
        });
    }

    if (normalizedReviewerEmail) {
        filtered = filtered.filter((item) =>
            (item.reviewerEmail?.toLowerCase?.() ?? "").includes(normalizedReviewerEmail)
        );
    }

    if (decision !== "ALL") {
        filtered = filtered.filter((item) => item.decision === decision);
    }

    const [sortField, sortDirection] = sort.split(",");

    filtered.sort((a, b) => {
        if (sortField === "createdAt") {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
        }
        return 0;
    });

    return filtered;
}

export async function getReviewHistory(
    params: ReviewHistoryQueryParams
): Promise<PagedResponse<ReviewHistoryRecord>> {
    const page = params.page ?? 0;
    const size = params.size ?? 10;

    const searchParams = new URLSearchParams();

    if (params.reviewerEmail?.trim()) {
        searchParams.set("reviewerEmail", params.reviewerEmail.trim());
    }

    if (params.decision && params.decision !== "ALL") {
        searchParams.set("decision", params.decision);
    }

    const path = searchParams.toString()
        ? `/api/reviews/history?${searchParams.toString()}`
        : "/api/reviews/history";

    const records = await apiClient.get<ReviewHistoryRecord[]>(path);

    const filtered = filterAndSortReviewHistory(records, params);

    return buildPagedResponse(filtered, page, size);
}