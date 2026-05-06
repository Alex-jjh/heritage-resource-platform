"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminNav } from "@/components/admin-nav";
import { PageContainer } from "@/components/page-container";
import type { User } from "@/types";

const ROLES = [
  { value: "REGISTERED_VIEWER", label: "Viewer" },
  { value: "CONTRIBUTOR", label: "Contributor" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "ADMINISTRATOR", label: "Admin" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
);

function UsersContent() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState("REGISTERED_VIEWER");
  const [addError, setAddError] = useState<string | null>(null);

  const usersQ = useQuery({
    queryKey: ["all-users"],
    queryFn: () => apiClient.get<User[]>("/api/users/all"),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiClient.put(`/api/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });

  const addUser = useMutation({
    mutationFn: async () => {
      await apiClient.post(
        "/api/auth/register",
        {
          email: newEmail,
          password: newPass,
          displayName: newName,
        },
        { skipAuth: true }
      );
      if (newRole !== "REGISTERED_VIEWER") {
        const users = await apiClient.get<User[]>("/api/users/all");
        const created = users.find((u) => u.email === newEmail);
        if (created) {
          await apiClient.put(`/api/users/${created.id}/role`, { role: newRole });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-users"] });
      setShowAdd(false);
      setNewEmail("");
      setNewName("");
      setNewPass("");
      setNewRole("REGISTERED_VIEWER");
      setAddError(null);
    },
    onError: (err: Error) => setAddError(err.message),
  });

  const users = usersQ.data ?? [];
  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      u.displayName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s);
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-[1.6rem] font-medium">User Management</h2>
              <p className="mt-1 text-sm text-muted-foreground">{users.length} users</p>
            </div>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <UserPlus className="size-4" />
              Add User
            </Button>
          </div>

          {showAdd && (
            <div className="mb-6 space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
              <h3 className="font-serif text-[1.25rem] font-medium">Add New User</h3>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input placeholder="Display Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Input placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <Input placeholder="Password (min 8, A-z, 0-9)" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                <Select value={newRole} onValueChange={(v) => setNewRole(v ?? "REGISTERED_VIEWER")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addUser.mutate()} disabled={addUser.isPending || !newEmail || !newName || !newPass}>
                  {addUser.isPending ? "Creating..." : "Create"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setAddError(null); }}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="mb-6 grid gap-3 md:grid-cols-12">
            <div className="relative md:col-span-9">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="md:col-span-3">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "ALL")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{roleFilter === "ALL" ? "All Roles" : ROLE_LABEL[roleFilter]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {usersQ.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
          ) : usersQ.isError ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Failed to load users.</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center"><p className="text-lg text-muted-foreground">No users found.</p></div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-12 border-b border-border bg-secondary/40 px-6 py-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <div style={{ gridColumn: "span 3 / span 3" }}>Name</div>
                <div style={{ gridColumn: "span 4 / span 4" }}>Email</div>
                <div style={{ gridColumn: "span 3 / span 3" }}>Role</div>
                <div className="text-right" style={{ gridColumn: "span 2 / span 2" }}>Actions</div>
              </div>
              {filtered.map((user) => (
                <div key={user.id} className="grid grid-cols-12 items-center border-b border-border px-6 py-4 text-sm last:border-0 hover:bg-secondary/30">
                  <div className="font-serif text-base font-medium" style={{ gridColumn: "span 3 / span 3" }}>{user.displayName}</div>
                  <div className="text-muted-foreground" style={{ gridColumn: "span 4 / span 4" }}>{user.email}</div>
                  <div style={{ gridColumn: "span 3 / span 3" }}>
                    <Select
                      value={user.role}
                      onValueChange={(v) => {
                        if (v && v !== user.role) changeRole.mutate({ id: user.id, role: v });
                      }}
                    >
                      <SelectTrigger className="h-8 w-[150px]">
                        <SelectValue>{ROLE_LABEL[user.role] ?? user.role}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end" style={{ gridColumn: "span 2 / span 2" }}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                      onClick={() => {
                        if (confirm(`Delete user ${user.email}?`)) deleteUser.mutate(user.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <UsersContent />
    </ProtectedRoute>
  );
}
