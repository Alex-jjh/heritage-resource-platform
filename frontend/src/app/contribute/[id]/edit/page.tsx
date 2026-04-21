"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import {
  ResourceForm,
  type ResourceFormData,
} from "@/components/resource-form";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
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
      <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (resourceQuery.isError) {
    return (
      <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32 max-w-4xl">
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          Resource not found or you don&apos;t have permission to edit it.
        </div>
        <Link
          href="/contribute"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          ← Back to my resources
        </Link>
      </main>
    );
  }

  const resource = resourceQuery.data!;

  if (resource.status !== "DRAFT") {
    return (
      <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32 max-w-4xl">
        <div
          role="alert"
          className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800"
        >
          Only draft resources can be edited. This resource is currently{" "}
          <strong>{resource.status.toLowerCase().replace("_", " ")}</strong>.
        </div>
        <Link
          href="/contribute"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          ← Back to my resources
        </Link>
      </main>
    );
  }

  return (
    <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32 max-w-4xl">
      <Link
        href="/contribute"
        className="text-sm text-accent hover:underline"
      >
        ← Back to my resources
      </Link>
      <h1 className="font-serif text-3xl font-bold mt-4 mb-6">
        Edit Resource
      </h1>
      {updateMutation.isSuccess && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
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
