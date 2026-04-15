"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { ResourceForm, type ResourceFormData } from "@/components/resource-form";
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
    mutationFn: (data: ResourceFormData) => apiClient.put<ResourceResponse>(`/api/resources/${id}`, data),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to update resource.");
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
    return <div className="max-w-xl mx-auto px-5 py-5"><p>Loading...</p></div>;
  }

  if (resourceQuery.isError) {
    return (
      <div className="max-w-xl mx-auto px-5 py-5">
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Resource not found or you don&apos;t have permission to edit it.</div>
        <Link href="/contribute">← Back to my resources</Link>
      </div>
    );
  }

  const resource = resourceQuery.data!;

  if (resource.status !== "DRAFT") {
    return (
      <div className="max-w-xl mx-auto px-5 py-5">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded text-sm mb-3">
          Only draft resources can be edited. This resource is currently <strong>{resource.status.toLowerCase().replace("_", " ")}</strong>.
        </div>
        <Link href="/contribute">← Back to my resources</Link>
      </div>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-5 py-5">
      <Link href="/contribute">← Back to my resources</Link>
      <h1 className="mt-3">Edit Resource</h1>
      {updateMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded text-sm mb-3">Resource saved successfully.</div>
      )}
      <ResourceForm
        resource={resource}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        submitLabel="Save Changes"
        error={error}
        resourceId={id}
        onFilesChange={handleFilesChange}
      />
    </main>
  );
}

export default function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}>
      <EditResourceContent id={id} />
    </ProtectedRoute>
  );
}
