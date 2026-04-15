"use client";

import Link from "next/link";
import type { ResourceResponse } from "@/types";

export function ResourceCard({ resource }: { resource: ResourceResponse }) {
  return (
    <Link href={`/resources/${resource.id}`} style={{ textDecoration: "none", color: "inherit" }}>
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
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {resource.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} style={{ background: "#e8e8e8", padding: "1px 6px", borderRadius: 8, fontSize: 11 }}>{tag.name}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
