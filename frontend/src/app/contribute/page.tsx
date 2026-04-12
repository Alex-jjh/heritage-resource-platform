"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Send, RotateCcw, MessageSquare, Eye } from "lucide-react";
import type { ResourceResponse, ResourceStatus } from "@/types";

function ContributeDashboardContent() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: ["my-resources"],
    queryFn: () =>
      apiClient.get<ResourceResponse[]>("/api/resources/mine"),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/api/resources/${id}/submit`),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["my-resources"] });
      setSuccessMsg("Resource submitted for review!");
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err) => {
      setSuccessMsg(null);
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to submit resource for review.");
      }
    },
  });

  const reviseMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/api/resources/${id}/revise`),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["my-resources"] });
      setSuccessMsg("Resource moved back to draft for revision.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  return (
    <main><PageContainer>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold">My Resources</h1>
        <Link href="/contribute/new">
          <Button>
            <Plus className="mr-1.5 size-4" />
            New Resource
          </Button>
        </Link>
      </div>

      {successMsg && (
        <div role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {resourcesQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : resourcesQuery.isError ? (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          Failed to load your resources. Please try again.
        </div>
      ) : resourcesQuery.data && resourcesQuery.data.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">
            You haven&apos;t created any resources yet.
          </p>
          <Link href="/contribute/new" className="mt-3 inline-block">
            <Button variant="outline">Create your first resource</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {resourcesQuery.data?.map((resource) => (
            <ResourceListItem
              key={resource.id}
              resource={resource}
              onSubmit={() => submitMutation.mutate(resource.id)}
              onRevise={() => reviseMutation.mutate(resource.id)}
              isSubmitting={submitMutation.isPending}
              isRevising={reviseMutation.isPending}
            />
          ))}
        </div>
      )}
    </PageContainer></main>
  );
}

function ResourceListItem({
  resource,
  onSubmit,
  onRevise,
  isSubmitting,
  isRevising,
}: {
  resource: ResourceResponse;
  onSubmit: () => void;
  onRevise: () => void;
  isSubmitting: boolean;
  isRevising: boolean;
}) {
  const status = resource.status as ResourceStatus;
  const isDraft = status === "DRAFT";
  const isRejected = status === "REJECTED";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-serif">{resource.title}</CardTitle>
            <CardDescription>
              {resource.category.name}
              {resource.place && <> · {resource.place}</>}
              {" · "}
              Updated{" "}
              {new Date(resource.updatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/resources/${resource.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="mr-1 size-3.5" />
              View
            </Button>
          </Link>
          {isDraft && (
            <>
              <Link href={`/contribute/${resource.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-1 size-3.5" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="default"
                size="sm"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                <Send className="mr-1 size-3.5" />
                {isSubmitting ? "Submitting…" : "Submit for Review"}
              </Button>
            </>
          )}
          {isRejected && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevise}
              disabled={isRevising}
            >
              <RotateCcw className="mr-1 size-3.5" />
              {isRevising ? "Revising…" : "Revise"}
            </Button>
          )}
        </div>

        {/* Reviewer/Admin feedback for rejected or unpublished resources */}
        {(isRejected || isDraft) &&
          resource.reviewFeedbacks &&
          resource.reviewFeedbacks.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
                <MessageSquare className="size-4" />
                Admin / Reviewer Feedback
              </div>
              {resource.reviewFeedbacks.map((fb) => (
                <div key={fb.id} className="text-sm text-amber-700">
                  <p>{fb.comments}</p>
                  <p className="mt-1 text-xs text-amber-500">
                    {fb.decision} · {new Date(fb.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}

export default function ContributePage() {
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}>
      <ContributeDashboardContent />
    </ProtectedRoute>
  );
}
