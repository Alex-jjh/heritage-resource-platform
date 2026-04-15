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
    <main className="container">
      <h1>Browse Heritage Resources</h1>

      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          type="search"
          placeholder="Search by title, description, or tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: 180 }}>
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select value={tagId} onChange={(e) => setTagId(e.target.value)} style={{ width: 180 }}>
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={handleSearch}>Search</button>
        <button className="btn" onClick={handleClear}>Clear</button>
      </div>

      {/* Results */}
      {resourcesQuery.isLoading ? (
        <p>Loading...</p>
      ) : resourcesQuery.isError ? (
        <div className="error-msg">Failed to load resources. Please try again.</div>
      ) : data && data.content.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: 40 }}>No resources found. Try adjusting your search.</p>
      ) : data ? (
        <>
          <p style={{ fontSize: 14, color: "#888", marginBottom: 12 }}>
            {data.totalElements} result{data.totalElements !== 1 ? "s" : ""} found
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
            {data.content.map((resource) => (
              <Link key={resource.id} href={`/resources/${resource.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="card" style={{ height: "100%" }}>
                  <div style={{ background: "#eee", height: 150, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
                    {resource.thumbnailUrl ? (
                      <img src={resource.thumbnailUrl} alt={resource.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 40 }}>🏛️</span>
                    )}
                  </div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{resource.title}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{resource.category.name}</p>
                  {resource.tags.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {resource.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id} style={{ background: "#e8e8e8", padding: "1px 6px", borderRadius: 8, fontSize: 11 }}>{tag.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 20 }}>
              <button className="btn btn-sm" disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                ← Previous
              </button>
              <span style={{ fontSize: 14 }}>Page {data.number + 1} of {data.totalPages}</span>
              <button className="btn btn-sm" disabled={data.last} onClick={() => setPage((p) => p + 1)}>
                Next →
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
