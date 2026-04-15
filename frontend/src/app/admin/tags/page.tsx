"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { AdminNav } from "@/components/admin-nav";
import type { Tag } from "@/types";

function TagsContent() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient.get<Tag[]>("/api/tags"),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.post<Tag>("/api/tags", { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); setNewName(""); setError(null); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Failed to create tag."); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.put<Tag>(`/api/tags/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); setEditingId(null); setError(null); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Failed to update tag."); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/tags/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); setError(null); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Failed to delete tag."); },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  }

  function handleUpdate() {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim() });
  }

  return (
    <main className="container">
      <AdminNav />

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input type="text" placeholder="New tag name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || !newName.trim()}>
          {createMutation.isPending ? "Creating..." : "+ Add"}
        </button>
      </form>

      {tagsQuery.isLoading ? (
        <p>Loading...</p>
      ) : tagsQuery.isError ? (
        <div className="error-msg">Failed to load tags.</div>
      ) : tagsQuery.data && tagsQuery.data.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: 20 }}>No tags yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {tagsQuery.data?.map((tag) => (
              <tr key={tag.id}>
                <td>
                  {editingId === tag.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                    />
                  ) : (
                    tag.name
                  )}
                </td>
                <td>{new Date(tag.createdAt).toLocaleDateString()}</td>
                <td>
                  {editingId === tag.id ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-sm btn-primary" onClick={handleUpdate} disabled={updateMutation.isPending}>Save</button>
                      <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => { setEditingId(tag.id); setEditName(tag.name); setError(null); }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteMutation.mutate(tag.id)} disabled={deleteMutation.isPending}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default function AdminTagsPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <TagsContent />
    </ProtectedRoute>
  );
}
