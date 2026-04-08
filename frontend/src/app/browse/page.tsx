"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { PageContainer } from "@/components/page-container";
import { SearchBar } from "@/components/search-bar";
import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, Tag, ResourceResponse, Page } from "@/types";

const DEFAULT_PAGE_SIZE = 20;

function BrowseContent() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  // Committed search params (applied on search click or enter)
  const [searchParams, setSearchParams] = useState({
    q: "",
    categoryId: "",
    tagId: "",
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<Category[]>("/api/categories"),
    enabled: isAuthenticated,
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient.get<Tag[]>("/api/tags"),
    enabled: isAuthenticated,
  });

  const resourcesQuery = useQuery({
    queryKey: ["search-resources", searchParams, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchParams.q) params.set("q", searchParams.q);
      if (searchParams.categoryId) params.set("categoryId", searchParams.categoryId);
      if (searchParams.tagId) params.set("tagId", searchParams.tagId);
      params.set("page", String(page));
      params.set("size", String(pageSize));
      return apiClient.get<Page<ResourceResponse>>(
        `/api/search/resources?${params.toString()}`
      );
    },
    enabled: isAuthenticated,
  });

  function handleSearch() {
    setPage(0);
    setSearchParams({
      q: query,
      categoryId: categoryId === "all" ? "" : categoryId,
      tagId: tagId === "all" ? "" : tagId,
    });
  }

  function handleClear() {
    setQuery("");
    setCategoryId("");
    setTagId("");
    setPage(0);
    setSearchParams({ q: "", categoryId: "", tagId: "" });
  }

  const data = resourcesQuery.data;

  return (
    <main><PageContainer>
      <h1 className="text-3xl font-bold mb-6">Browse Heritage Resources</h1>

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        tagId={tagId}
        onTagChange={setTagId}
        categories={categoriesQuery.data ?? []}
        tags={tagsQuery.data ?? []}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <div className="mt-8">
        {resourcesQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-md" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : resourcesQuery.isError ? (
          <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load resources. Please try again.
          </div>
        ) : data && data.content.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">No resources found.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : data ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {data.totalElements} result{data.totalElements !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.content.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <nav aria-label="Search results pagination" className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.first}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {data.number + 1} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.last}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        ) : null}
      </div>
    </PageContainer></main>
  );
}

export default function BrowsePage() {
  return (
    <ProtectedRoute>
      <BrowseContent />
    </ProtectedRoute>
  );
}
