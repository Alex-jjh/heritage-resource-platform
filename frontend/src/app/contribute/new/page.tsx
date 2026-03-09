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
    mutationFn: (data: ResourceFormData) =>
      apiClient.post<ResourceResponse>("/api/resources", data),
    onSuccess: (resource) => {
      // Redirect to edit page so user can upload files
      router.push(`/contribute/${resource.id}/edit`);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create resource.");
      }
    },
  });

  async function handleSubmit(data: ResourceFormData) {
    setError(null);
    createMutation.mutate(data);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/contribute"
        className="text-sm text-accent hover:underline"
      >
        ← Back to my resources
      </Link>
      <h1 className="font-serif text-3xl font-bold mt-4 mb-6">
        Create New Resource
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Fill in the details below to create a draft resource. You can upload
        files after saving.
      </p>
      <ResourceForm
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Create Draft"
        error={error}
      />
    </main>
  );
}

export default function CreateResourcePage() {
  return (
    <ProtectedRoute requiredRoles={["CONTRIBUTOR"]}>
      <CreateResourceContent />
    </ProtectedRoute>
  );
}
