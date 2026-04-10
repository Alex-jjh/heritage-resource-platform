export type UserRole =
  | "REGISTERED_VIEWER"
  | "CONTRIBUTOR"
  | "REVIEWER"
  | "ADMINISTRATOR";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  contributorRequested: boolean;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface UpdateProfileRequest {
  displayName: string;
}

// Resource types

export type ResourceStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface FileReferenceDto {
  id: string;
  s3Key: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  downloadUrl?: string;
}

export interface ExternalLinkDto {
  id: string;
  url: string;
  label: string;
}

export interface ResourceResponse {
  id: string;
  title: string;
  category: Category;
  place: string;
  description: string;
  copyrightDeclaration: string;
  status: ResourceStatus;
  tags: Tag[];
  fileReferences: FileReferenceDto[];
  externalLinks: ExternalLinkDto[];
  contributorName: string;
  contributorId: string;
  thumbnailS3Key: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  reviewFeedbacks?: ReviewFeedbackResponse[];
}

export interface CommentResponse {
  id: string;
  resourceId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

// Spring Data Page response
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ReviewFeedbackResponse {
  id: string;
  resourceId: string;
  reviewerId: string;
  comments: string;
  decision: string;
  createdAt: string;
}

export interface CreateResourceRequest {
  title: string;
  categoryId: string;
  place?: string;
  description?: string;
  copyrightDeclaration: string;
  tagIds?: string[];
  externalLinks?: { url: string; label: string }[];
}

export interface UpdateResourceRequest {
  title: string;
  categoryId: string;
  place?: string;
  description?: string;
  copyrightDeclaration: string;
  tagIds?: string[];
  externalLinks?: { url: string; label: string }[];
}
