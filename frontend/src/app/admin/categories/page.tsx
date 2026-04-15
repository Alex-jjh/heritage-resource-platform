"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { AdminNav } from "@/components/admin-nav";
import type { Category } from "@/types";

function CategoriesContent() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<Category[]>("/api/categories"),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.post<Category>("/api/categories", { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setNewName(""); setError(null); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Failed to create category."); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.put<Category>(`/api/categories/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setEditingId(null); setError(null); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Failed to update category."); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/categories/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setError(null); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Failed to delete category."); },
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
        <input type="text" placeholder="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || !newName.trim()}>
          {createMutation.isPending ? "Creating..." : "+ Add"}
        </button>
      </form>

      {categoriesQuery.isLoading ? (
        <p>Loading...</p>
      ) : categoriesQuery.isError ? (
        <div className="error-msg">Failed to load categories.</div>
      ) : categoriesQuery.data && categoriesQuery.data.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: 20 }}>No categories yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {categoriesQuery.data?.map((cat) => (
              <tr key={cat.id}>
                <td>
                  {editingId === cat.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                    />
                  ) : (
                    cat.name
                  )}
                </td>
                <td>{new Date(cat.createdAt).toLocaleDateString()}</td>
                <td>
                  {editingId === cat.id ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-sm btn-primary" onClick={handleUpdate} disabled={updateMutation.isPending}>Save</button>
                      <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setError(null); }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteMutation.mutate(cat.id)} disabled={deleteMutation.isPending}>Delete</button>
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

export default function AdminCategoriesPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <CategoriesContent />
    </ProtectedRoute>
  );
}
