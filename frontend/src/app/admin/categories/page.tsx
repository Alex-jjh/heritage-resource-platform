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
    <main className="max-w-5xl mx-auto px-5 py-5">
      <AdminNav />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">{error}</div>}

      <form onSubmit={handleCreate} className="flex gap-2 mb-5">
        <input type="text" placeholder="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50" disabled={createMutation.isPending || !newName.trim()}>
          {createMutation.isPending ? "Creating..." : "+ Add"}
        </button>
      </form>

      {categoriesQuery.isLoading ? (
        <p>Loading...</p>
      ) : categoriesQuery.isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Failed to load categories.</div>
      ) : categoriesQuery.data && categoriesQuery.data.length === 0 ? (
        <p className="text-center text-gray-400 py-5">No categories yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Name</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Created</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categoriesQuery.data?.map((cat) => (
              <tr key={cat.id}>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  {editingId === cat.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    cat.name
                  )}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{new Date(cat.createdAt).toLocaleDateString()}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  {editingId === cat.id ? (
                    <div className="flex gap-1">
                      <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50" onClick={handleUpdate} disabled={updateMutation.isPending}>Save</button>
                      <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setError(null); }}>Edit</button>
                      <button className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50" onClick={() => deleteMutation.mutate(cat.id)} disabled={deleteMutation.isPending}>Delete</button>
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
