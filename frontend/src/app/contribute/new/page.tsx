"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { ResourceForm, type ResourceFormData } from "@/components/resource-form";
import Link from "next/link";
import type { ResourceResponse } from "@/types";

function CreateResourceContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: ResourceFormData) => apiClient.post<ResourceResponse>("/api/resources", data),
    onSuccess: (resource) => { router.push(`/contribute/${resource.id}/edit`); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Failed to create resource."); },
  });

  async function handleSubmit(data: ResourceFormData) {
    setError(null);
    createMutation.mutate(data);
  }

  return (
    <main className="container-narrow">
      <Link href="/contribute">← Back to my resources</Link>
      <h1 style={{ marginTop: 12 }}>Create New Resource</h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>
        Fill in the details below to create a draft resource. You can upload files after saving.
      </p>
      <ResourceForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} submitLabel="Create Draft" error={error} />
    </main>
  );
}

export default function CreateResourcePage() {
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"]}>
      <CreateResourceContent />
    </ProtectedRoute>
  );
}
