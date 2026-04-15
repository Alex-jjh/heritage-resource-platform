"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import type { Page, ResourceResponse } from "@/types";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const featuredQuery = useQuery({
    queryKey: ["featured-resources"],
    queryFn: () =>
      isAuthenticated
        ? apiClient.get<Page<ResourceResponse>>(
            `/api/search/resources?page=0&size=8`
          )
        : apiClient.get<ResourceResponse[]>("/api/search/featured", { skipAuth: true }).then(
            (items) => ({ content: items, totalElements: items.length } as Page<ResourceResponse>)
          ),
  });

  const resources = featuredQuery.data?.content ?? [];

  return (
    <main>
      {/* Hero */}
      <div style={{ background: "#2c3e50", color: "white", padding: "60px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Discover & Preserve Cultural Heritage</h1>
        <p style={{ fontSize: 16, color: "#ccc", marginBottom: 24 }}>
          A community platform for sharing images, stories, traditions, places, and educational materials.
        </p>
        {isAuthenticated ? (
          <Link href="/browse" className="btn btn-primary">Browse Resources</Link>
        ) : (
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/register" className="btn btn-primary">Get Started</Link>
            <Link href="/login" className="btn">Sign In</Link>
          </div>
        )}
      </div>

      {/* Featured Resources */}
      <div className="container" style={{ marginTop: 30 }}>
        <h2>Featured Resources</h2>

        {featuredQuery.isLoading || authLoading ? (
          <p>Loading...</p>
        ) : featuredQuery.isError ? (
          <div className="error-msg">Unable to load featured resources.</div>
        ) : resources.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: 40 }}>No approved resources yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, marginTop: 16 }}>
            {resources.map((resource) => (
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
                  {resource.place && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#999" }}>{resource.place}</p>}
                  {resource.tags.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {resource.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id} style={{ background: "#e8e8e8", padding: "1px 6px", borderRadius: 8, fontSize: 11 }}>{tag.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isAuthenticated && resources.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link href="/login" className="btn">Sign in to view more →</Link>
          </div>
        )}
      </div>

      {/* Info section */}
      {!authLoading && !isAuthenticated && (
        <div className="container" style={{ marginTop: 30, paddingBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 32 }}>📸</div>
              <h3>Share</h3>
              <p style={{ fontSize: 14, color: "#666" }}>Upload images, stories, and materials that preserve cultural heritage.</p>
            </div>
            <div>
              <div style={{ fontSize: 32 }}>✅</div>
              <h3>Curate</h3>
              <p style={{ fontSize: 14, color: "#666" }}>Community reviewers ensure quality and accuracy before publishing.</p>
            </div>
            <div>
              <div style={{ fontSize: 32 }}>🔍</div>
              <h3>Discover</h3>
              <p style={{ fontSize: 14, color: "#666" }}>Browse and search a growing collection organized by category and tags.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
