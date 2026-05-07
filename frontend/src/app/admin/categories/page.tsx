"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminNav } from "@/components/admin-nav";
import { PageContainer } from "@/components/page-container";
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
    mutationFn: (name: string) =>
      apiClient.post<Category>("/api/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to create category.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.put<Category>(`/api/categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to update category.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to delete category.");
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setError(null);
  }

  function handleUpdate() {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim() });
  }

  return (
    <main>
      <PageContainer
        wide
        eyebrow="Administration"
        title="Admin Panel"
        lede="Manage users, categories, tags, and archived resources."
      >
        <AdminNav />
        <div className="rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-heritage-card)]">
          <h2 className="mb-6 font-serif text-[1.6rem] font-medium">Category Management</h2>

          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="mb-6 flex items-end gap-3 rounded-2xl border border-border bg-secondary/20 p-4">
            <div className="flex-1">
              <Label htmlFor="new-category">New Category</Label>
              <Input
                id="new-category"
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
              <Plus className="size-4" />
              {createMutation.isPending ? "Creating..." : "Add"}
            </Button>
          </form>

          {categoriesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-2xl" />
              ))}
            </div>
          ) : categoriesQuery.isError ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Failed to load categories.
            </div>
          ) : categoriesQuery.data && categoriesQuery.data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No categories yet.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-12 border-b border-border bg-secondary/40 px-6 py-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <div style={{ gridColumn: "span 6 / span 6" }}>Name</div>
                <div style={{ gridColumn: "span 3 / span 3" }}>Created</div>
                <div className="text-right" style={{ gridColumn: "span 3 / span 3" }}>Actions</div>
              </div>
              {categoriesQuery.data?.map((cat) => (
                <div key={cat.id} className="grid grid-cols-12 items-center border-b border-border px-6 py-4 text-sm last:border-0 hover:bg-secondary/30">
                  <div style={{ gridColumn: "span 6 / span 6" }}>
                    {editingId === cat.id ? (
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
                      <span className="font-serif text-base font-medium">{cat.name}</span>
                    )}
                  </div>
                  <div className="text-muted-foreground" style={{ gridColumn: "span 3 / span 3" }}>
                    {new Date(cat.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex justify-end gap-1" style={{ gridColumn: "span 3 / span 3" }}>
                    {editingId === cat.id ? (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                          <Check className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => startEdit(cat)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                          onClick={() => deleteMutation.mutate(cat.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
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
