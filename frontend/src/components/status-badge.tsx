"use client";

import { Badge } from "@/components/ui/badge";
import type { ResourceStatus } from "@/types";

const STATUS_CONFIG: Record<ResourceStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-700 hover:bg-slate-100" },
  PENDING_REVIEW: { label: "Pending Review", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  IN_REVIEW: { label: "In Review", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  ARCHIVED: { label: "Archived", className: "bg-gray-100 text-gray-600 hover:bg-gray-100" },
};

export function StatusBadge({ status }: { status: ResourceStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "" };
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
