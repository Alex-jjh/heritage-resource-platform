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
    <main className="max-w-5xl mx-auto px-5 py-5">
      <AdminNav />

      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-400 text-sm">{users.length} users</span>
        <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700" onClick={() => setShowAdd(!showAdd)}>+ Add User</button>
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h3 className="mt-0">Add New User</h3>
          {addError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">{addError}</div>}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="text" placeholder="Display Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
            <input type="email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
            <input type="password" placeholder="Password (min 8)" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50" onClick={() => addUser.mutate()} disabled={addUser.isPending || !newEmail || !newName || !newPass}>
              {addUser.isPending ? "Creating..." : "Create"}
            </button>
            <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={() => { setShowAdd(false); setAddError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input type="search" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-[150px] border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="ALL">All Roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {usersQ.isLoading ? (
        <p>Loading...</p>
      ) : usersQ.isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">Failed to load users.</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No users found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Name</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Email</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Role</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm bg-gray-50 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td className="border border-gray-200 px-3 py-2 text-sm">{user.displayName}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">{user.email}</td>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  <select
                    value={user.role}
                    onChange={(e) => { if (e.target.value !== user.role) changeRole.mutate({ id: user.id, role: e.target.value }); }}
                    className="w-[130px] border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="border border-gray-200 px-3 py-2 text-sm">
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
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
