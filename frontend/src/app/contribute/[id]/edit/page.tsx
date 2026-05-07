"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import {
  ResourceForm,
  type ResourceFormData,
} from "@/components/resource-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceResponse } from "@/types";

function EditResourceContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiClient.get<ResourceResponse>(`/api/resources/${id}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ResourceFormData) =>
      apiClient.put<ResourceResponse>(`/api/resources/${id}`, data),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update resource.");
      }
    },
  });

  async function handleSubmit(data: ResourceFormData) {
    setError(null);
    updateMutation.mutate(data);
  }

  function handleFilesChange() {
    queryClient.invalidateQueries({ queryKey: ["resource", id] });
  }

  if (resourceQuery.isLoading) {
    return (
      <main className="mx-auto max-w-[1100px] space-y-4 px-6 py-10 lg:px-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </main>
    );
  }

  if (resourceQuery.isError) {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Resource not found or you don&apos;t have permission to edit it.
        </div>
        <Link
          href="/contribute"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Back to My Resources
        </Link>
      </main>
    );
  }

  const resource = resourceQuery.data!;

  if (resource.status !== "DRAFT") {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Only draft resources can be edited. This resource is currently{" "}
          <strong>{resource.status.toLowerCase().replace("_", " ")}</strong>.
        </div>
        <Link
          href="/contribute"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Back to My Resources
        </Link>
      </main>
    );
  }

  return (
    <main>
      <PageContainer
        narrow
        eyebrow="Edit Resource"
        title={resource.title || "Untitled Draft"}
        lede="Revise the archive record, manage file attachments, and save changes before resubmission."
      >
        <Link
          href="/contribute"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Back to My Resources
        </Link>

        {updateMutation.isSuccess && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Resource saved successfully.
          </div>
        )}

        <ResourceForm
          key={resource.id}
          resource={resource}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          submitLabel="Save Changes"
          error={error}
          resourceId={resource.id}
          onFilesChange={handleFilesChange}
        />
      </PageContainer>
    </main>
  );
}

export default function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}>
      <EditResourceContent id={id} />
    </ProtectedRoute>
  );
}
