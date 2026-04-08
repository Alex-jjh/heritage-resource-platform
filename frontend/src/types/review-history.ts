export type ReviewDecision = "APPROVED" | "REJECTED";

export interface ReviewHistoryRecord {
  id: string;
  resourceId: string;
  resourceTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  reviewerEmployeeId: string;
  decision: ReviewDecision;
  comments: string;
  reviewedAt: string; // ISO string
}

export interface ReviewHistoryQueryParams {
  q?: string;
  reviewerEmployeeId?: string;
  decision?: "ALL" | ReviewDecision;
  page?: number;
  size?: number;
  sort?: string; // e.g. reviewedAt,desc
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