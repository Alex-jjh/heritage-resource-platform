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
    return <div className="container-narrow"><p>Loading...</p></div>;
  }

  if (resourceQuery.isError) {
    return (
      <div className="container-narrow">
        <div className="error-msg">Resource not found or you don&apos;t have permission to edit it.</div>
        <Link href="/contribute">← Back to my resources</Link>
      </div>
    );
  }

  const resource = resourceQuery.data!;

  if (resource.status !== "DRAFT") {
    return (
      <div className="container-narrow">
        <div className="warning-msg">
          Only draft resources can be edited. This resource is currently <strong>{resource.status.toLowerCase().replace("_", " ")}</strong>.
        </div>
        <Link href="/contribute">← Back to my resources</Link>
      </div>
    );
  }

  return (
    <main className="container-narrow">
      <Link href="/contribute">← Back to my resources</Link>
      <h1 style={{ marginTop: 12 }}>Edit Resource</h1>
      {updateMutation.isSuccess && (
        <div className="success-msg">Resource saved successfully.</div>
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
