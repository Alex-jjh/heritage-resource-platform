"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { AdminNav } from "@/components/admin-nav";
import type { User } from "@/types";

const ROLES = [
  { value: "REGISTERED_VIEWER", label: "Viewer" },
  { value: "CONTRIBUTOR", label: "Contributor" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "ADMINISTRATOR", label: "Admin" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

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
    mutationFn: ({ id, role }: { id: string; role: string }) => apiClient.put(`/api/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });

  const addUser = useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/auth/register", { email: newEmail, password: newPass, displayName: newName }, { skipAuth: true });
      if (newRole !== "REGISTERED_VIEWER") {
        const users = await apiClient.get<User[]>("/api/users/all");
        const created = users.find((u) => u.email === newEmail);
        if (created) await apiClient.put(`/api/users/${created.id}/role`, { role: newRole });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-users"] });
      setShowAdd(false); setNewEmail(""); setNewName(""); setNewPass(""); setNewRole("REGISTERED_VIEWER"); setAddError(null);
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
    <main className="container">
      <AdminNav />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: "#888", fontSize: 14 }}>{users.length} users</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>+ Add User</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Add New User</h3>
          {addError && <div className="error-msg">{addError}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input type="text" placeholder="Display Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input type="email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <input type="password" placeholder="Password (min 8)" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => addUser.mutate()} disabled={addUser.isPending || !newEmail || !newName || !newPass}>
              {addUser.isPending ? "Creating..." : "Create"}
            </button>
            <button className="btn btn-sm" onClick={() => { setShowAdd(false); setAddError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input type="search" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: 150 }}>
          <option value="ALL">All Roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {usersQ.isLoading ? (
        <p>Loading...</p>
      ) : usersQ.isError ? (
        <div className="error-msg">Failed to load users.</div>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: 40 }}>No users found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td>{user.displayName}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => { if (e.target.value !== user.role) changeRole.mutate({ id: user.id, role: e.target.value }); }}
                    style={{ width: 130 }}
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => { if (confirm(`Delete user ${user.email}?`)) deleteUser.mutate(user.id); }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
