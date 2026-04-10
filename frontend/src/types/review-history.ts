export type ReviewDecision = "APPROVED" | "REJECTED";

export interface ReviewHistoryRecord {
    id: string;
    resourceId: string;
    resourceTitle: string;
    reviewerId: string;
    reviewerName: string;
    decision: ReviewDecision;
    comments: string;
    createdAt: string; // ISO string from backend
}

export interface ReviewHistoryQueryParams {
    q?: string;
    reviewerId?: string;
    decision?: "ALL" | ReviewDecision;
    page?: number;
    size?: number;
    sort?: string; // e.g. createdAt,desc
}

export interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}