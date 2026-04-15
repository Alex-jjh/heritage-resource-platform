"use client";

import type { ResourceStatus } from "@/types";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "badge-draft" },
  PENDING_REVIEW: { label: "Pending Review", className: "badge-pending" },
  APPROVED: { label: "Approved", className: "badge-approved" },
  REJECTED: { label: "Rejected", className: "badge-rejected" },
  ARCHIVED: { label: "Archived", className: "badge-archived" },
};

export function StatusBadge({ status }: { status: ResourceStatus | string }) {
  const config = STATUS_MAP[status] ?? { label: status, className: "" };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
