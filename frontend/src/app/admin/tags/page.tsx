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
    <main className="max-w-5xl mx-auto px-5 py-5">
      <AdminNav />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">{error}</div>}

      <form onSubmit={handleCreate} className="flex gap-2 mb-5">
        <input type="text" placeholder="New tag name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50" disabled={createMutation.isPending || !newName.trim()}>
          {createMutation.isPending ? "Creating..." : "+ Add"}
        </button>
      </form>

      {tagsQuery.isLoading ? (
        <p>Loading...</p>
      ) : tagsQuery.isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Failed to load tags.</div>
      ) : tagsQuery.data && tagsQuery.data.length === 0 ? (
        <p className="text-center text-gray-400 py-5">No tags yet.</p>
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
            {tagsQuery.data?.map((tag) => (
              <tr key={tag.id}>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  {editingId === tag.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    tag.name
                  )}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{new Date(tag.createdAt).toLocaleDateString()}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  {editingId === tag.id ? (
                    <div className="flex gap-1">
                      <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50" onClick={handleUpdate} disabled={updateMutation.isPending}>Save</button>
                      <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={() => { setEditingId(tag.id); setEditName(tag.name); setError(null); }}>Edit</button>
                      <button className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50" onClick={() => deleteMutation.mutate(tag.id)} disabled={deleteMutation.isPending}>Delete</button>
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
