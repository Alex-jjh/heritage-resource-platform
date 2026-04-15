"use client";

import type { ResourceStatus } from "@/types";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-300" },
  PENDING_REVIEW: { label: "Pending Review", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
  APPROVED: { label: "Approved", className: "bg-green-50 text-green-700 border-green-300" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-300" },
  ARCHIVED: { label: "Archived", className: "bg-gray-100 text-gray-500 border-gray-300" },
};

export function StatusBadge({ status }: { status: ResourceStatus | string }) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-700 border-gray-300" };
  return <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${config.className}`}>{config.label}</span>;
}
