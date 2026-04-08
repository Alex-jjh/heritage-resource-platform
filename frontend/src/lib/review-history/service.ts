import { apiClient } from "@/lib/api-client";
import { REVIEW_HISTORY_MOCK_DATA } from "@/lib/review-history/mock-data";
import type {
    PagedResponse,
    ReviewHistoryQueryParams,
    ReviewHistoryRecord,
} from "@/types/review-history";

const USE_MOCK =
    process.env.NEXT_PUBLIC_USE_REVIEW_HISTORY_MOCK === "true";

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

function getMockReviewHistory(
    params: ReviewHistoryQueryParams
): PagedResponse<ReviewHistoryRecord> {
    const {
        q = "",
        reviewerEmployeeId = "",
        decision = "ALL",
        page = 0,
        size = 10,
        sort = "reviewedAt,desc",
    } = params;

    const keyword = normalizeKeyword(q);
    const employeeId = normalizeKeyword(reviewerEmployeeId);

    let filtered = [...REVIEW_HISTORY_MOCK_DATA];

    if (keyword) {
        filtered = filtered.filter((item) => {
            return (
                item.resourceTitle.toLowerCase().includes(keyword) ||
                item.comments.toLowerCase().includes(keyword) ||
                item.reviewerName.toLowerCase().includes(keyword) ||
                item.reviewerEmail.toLowerCase().includes(keyword) ||
                item.reviewerEmployeeId.toLowerCase().includes(keyword) ||
                item.decision.toLowerCase().includes(keyword) ||
                new Date(item.reviewedAt)
                    .toLocaleDateString()
                    .toLowerCase()
                    .includes(keyword)
            );
        });
    }

    if (employeeId) {
        filtered = filtered.filter((item) =>
            item.reviewerEmployeeId.toLowerCase().includes(employeeId)
        );
    }

    if (decision !== "ALL") {
        filtered = filtered.filter((item) => item.decision === decision);
    }

    const [sortField, sortDirection] = sort.split(",");

    filtered.sort((a, b) => {
        if (sortField === "reviewedAt") {
            const aTime = new Date(a.reviewedAt).getTime();
            const bTime = new Date(b.reviewedAt).getTime();
            return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
        }
        return 0;
    });

    return buildPagedResponse(filtered, page, size);
}

export async function getReviewHistory(
    params: ReviewHistoryQueryParams
): Promise<PagedResponse<ReviewHistoryRecord>> {
    if (USE_MOCK) {
        return Promise.resolve(getMockReviewHistory(params));
    }

    const searchParams = new URLSearchParams();

    if (params.q?.trim()) searchParams.set("q", params.q.trim());
    if (params.reviewerEmployeeId?.trim()) {
        searchParams.set("reviewerEmployeeId", params.reviewerEmployeeId.trim());
    }
    if (params.decision && params.decision !== "ALL") {
        searchParams.set("decision", params.decision);
    }
    searchParams.set("page", String(params.page ?? 0));
    searchParams.set("size", String(params.size ?? 10));
    searchParams.set("sort", params.sort ?? "reviewedAt,desc");

    return apiClient.get<PagedResponse<ReviewHistoryRecord>>(
        `/api/reviews/history?${searchParams.toString()}`
    );
}