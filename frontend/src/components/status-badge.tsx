"use client";

import { Badge } from "@/components/ui/badge";
import type { ResourceStatus } from "@/types";

const STATUS_CONFIG: Record<ResourceStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  PENDING_REVIEW: {
    label: "Pending Review",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  IN_REVIEW: {
    label: "In Review",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  APPROVED: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  ARCHIVED: {
    label: "Archived",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

export function StatusBadge({ status }: { status: ResourceStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "" };
  return (
    <Badge
      variant="outline"
      className={`tracking-[0.1em] uppercase hover:bg-inherit ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
