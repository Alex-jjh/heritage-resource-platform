"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import type { Category, Tag, ResourceResponse, Page } from "@/types";

function BrowseContent() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [searchParams, setSearchParams] = useState({ q: "", categoryId: "", tagId: "" });

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
      return apiClient.get<Page<ResourceResponse>>(`/api/search/resources?${params.toString()}`);
    },
    enabled: isAuthenticated,
  });

  function handleSearch() {
    setPage(0);
    setSearchParams({ q: query, categoryId, tagId });
  }

  function handleClear() {
    setQuery("");
    setCategoryId("");
    setTagId("");
    setPage(0);
    setSearchParams({ q: "", categoryId: "", tagId: "" });
  }

  const data = resourcesQuery.data;
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  return (
    <main className="max-w-5xl mx-auto px-5 py-5">
      <h1>Browse Heritage Resources</h1>

      {/* Search bar */}
      <div className="flex gap-2 flex-wrap mb-5">
        <input
          type="search"
          placeholder="Search by title, description, or tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 min-w-[200px] border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-[180px] border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="w-[180px] border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700" onClick={handleSearch}>Search</button>
        <button className="bg-white border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50" onClick={handleClear}>Clear</button>
      </div>

      {/* Results */}
      {resourcesQuery.isLoading ? (
        <p>Loading...</p>
      ) : resourcesQuery.isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Failed to load resources. Please try again.</div>
      ) : data && data.content.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No resources found. Try adjusting your search.</p>
      ) : data ? (
        <>
          <p className="text-sm text-gray-400 mb-3">
            {data.totalElements} result{data.totalElements !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
            {data.content.map((resource) => (
              <Link key={resource.id} href={`/resources/${resource.id}`} className="no-underline text-inherit">
                <div className="bg-white border border-gray-200 rounded p-4 mb-3 h-full">
                  <div className="bg-gray-100 h-[150px] flex items-center justify-center rounded mb-2.5 overflow-hidden">
                    {resource.thumbnailUrl ? (
                      <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-400">No image</span>
                    )}
                  </div>
                  <h3 className="m-0 mb-1 text-base">{resource.title}</h3>
                  <p className="m-0 text-[13px] text-gray-500">{resource.category.name}</p>
                  {resource.tags.length > 0 && (
                    <div className="mt-1.5 flex gap-1 flex-wrap">
                      {resource.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id} className="bg-gray-200 px-1.5 py-0.5 rounded-lg text-[11px]">{tag.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2.5 mt-5">
              <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </button>
              <span className="text-sm">Page {data.number + 1} of {data.totalPages}</span>
              <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" disabled={data.last} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}

export default function BrowsePage() {
  return (
    <ProtectedRoute>
      <BrowseContent />
    </ProtectedRoute>
  );
}
