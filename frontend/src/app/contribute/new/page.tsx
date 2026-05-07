"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { ResourceForm, type ResourceFormData } from "@/components/resource-form";
import type { ResourceResponse } from "@/types";

function CreateResourceContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: ResourceFormData) =>
      apiClient.post<ResourceResponse>("/api/resources", data),
    onSuccess: (resource) => {
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
    <main>
      <PageContainer
        narrow
        eyebrow="New Resource"
        title="Create New Resource"
        lede="Create a draft archive record. You can upload files after saving."
      >
        <Link
          href="/contribute"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Back to My Resources
        </Link>
        <ResourceForm
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          submitLabel="Create Draft"
          error={error}
        />
      </PageContainer>
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
