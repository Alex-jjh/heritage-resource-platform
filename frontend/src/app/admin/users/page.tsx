"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Trash2, Search, UserPlus } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
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

const ROLE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REGISTERED_VIEWER: "secondary",
  CONTRIBUTOR: "default",
  REVIEWER: "outline",
  ADMINISTRATOR: "destructive",
};

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
      // Register via public endpoint then change role if needed
      await apiClient.post("/api/auth/register", {
        email: newEmail, password: newPass, displayName: newName,
      }, { skipAuth: true });
      if (newRole !== "REGISTERED_VIEWER") {
        // Refetch to get the new user's ID
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
      setNewEmail(""); setNewName(""); setNewPass(""); setNewRole("REGISTERED_VIEWER");
      setAddError(null);
    },
    onError: (err: Error) => setAddError(err.message),
  });

  const users = usersQ.data ?? [];
  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const matchSearch = !s || u.displayName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <main className="px-6 py-8 sm:px-12 lg:px-16">
      <AdminNav />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold">User Management</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{users.length} users</span>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <UserPlus className="mr-1 size-4" /> Add User
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-6 rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">Add New User</h2>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input placeholder="Display Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Input placeholder="Password (min 8, A-z, 0-9)" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            <Select value={newRole} onValueChange={(v) => setNewRole(v ?? "REGISTERED_VIEWER")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addUser.mutate()} disabled={addUser.isPending || !newEmail || !newName || !newPass}>
              {addUser.isPending ? "Creating…" : "Create"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setAddError(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "ALL")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue>{roleFilter === "ALL" ? "All Roles" : ROLE_LABEL[roleFilter]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {usersQ.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}</div>
      ) : usersQ.isError ? (
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">Failed to load users.</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><p className="text-lg text-muted-foreground">No users found.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{user.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.role}
                      onValueChange={(v) => { if (v && v !== user.role) changeRole.mutate({ id: user.id, role: v }); }}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue>{ROLE_LABEL[user.role] ?? user.role}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(`Delete user ${user.email}?`)) deleteUser.mutate(user.id); }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <UsersContent />
    </ProtectedRoute>
  );
}
