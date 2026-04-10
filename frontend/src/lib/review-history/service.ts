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
        reviewerId = "",
        decision = "ALL",
        sort = "createdAt,desc",
    } = params;

    const keyword = normalizeKeyword(q);
    const normalizedReviewerId = normalizeKeyword(reviewerId);

    let filtered = [...items];

    /**
     * 当前后端 history 接口还没有明确支持通用 keyword 搜索，
     * 所以 q 先在前端 service 层做本地过滤，
     * 这样 page.tsx 不需要同步大改。
     */
    if (keyword) {
        filtered = filtered.filter((item) => {
            const resourceTitle = item.resourceTitle?.toLowerCase?.() ?? "";
            const comments = item.comments?.toLowerCase?.() ?? "";
            const reviewerName = item.reviewerName?.toLowerCase?.() ?? "";
            const reviewerIdValue = item.reviewerId?.toLowerCase?.() ?? "";
            const decisionValue = item.decision?.toLowerCase?.() ?? "";
            const createdAt = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString().toLowerCase()
                : "";

            return (
                resourceTitle.includes(keyword) ||
                comments.includes(keyword) ||
                reviewerName.includes(keyword) ||
                reviewerIdValue.includes(keyword) ||
                decisionValue.includes(keyword) ||
                createdAt.includes(keyword)
            );
        });
    }

    /**
     * 前后端统一改成 reviewerId(UUID) 过滤，不再使用 employee ID。
     */
    if (normalizedReviewerId) {
        filtered = filtered.filter((item) =>
            (item.reviewerId?.toLowerCase?.() ?? "").includes(normalizedReviewerId)
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

    /**
     * 当前后端明确支持 reviewerId(UUID) 和 decision。
     */
    if (params.reviewerId?.trim()) {
        searchParams.set("reviewerId", params.reviewerId.trim());
    }

    if (params.decision && params.decision !== "ALL") {
        searchParams.set("decision", params.decision);
    }

    const path = searchParams.toString()
        ? `/api/reviews/history?${searchParams.toString()}`
        : "/api/reviews/history";

    /**
     * 后端当前返回的是 List<ReviewHistoryResponse>，
     * 不是分页结构，所以这里先拿数组，再包装成前端仍在使用的 PagedResponse。
     */
    const records = await apiClient.get<ReviewHistoryRecord[]>(path);

    const filtered = filterAndSortReviewHistory(records, params);

    return buildPagedResponse(filtered, page, size);
}