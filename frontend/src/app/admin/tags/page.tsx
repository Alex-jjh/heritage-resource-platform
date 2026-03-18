"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
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
    mutationFn: (name: string) =>
      apiClient.post<Tag>("/api/tags", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewName("");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to create tag.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.put<Tag>(`/api/tags/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setEditingId(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to update tag.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to delete tag.");
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setError(null);
  }

  function handleUpdate() {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim() });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav />
      <h1 className="font-serif text-3xl font-bold mb-6">Tag Management</h1>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-6 flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="new-tag">New Tag</Label>
          <Input
            id="new-tag"
            placeholder="Tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
          <Plus className="mr-1 size-4" />
          {createMutation.isPending ? "Creating…" : "Add"}
        </Button>
      </form>

      {/* List */}
      {tagsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : tagsQuery.isError ? (
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load tags.
        </div>
      ) : tagsQuery.data && tagsQuery.data.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No tags yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tagsQuery.data?.map((tag) => (
                <tr key={tag.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {editingId === tag.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="font-medium">{tag.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(tag.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {editingId === tag.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                          <Check className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(tag)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(tag.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
