"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
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
import { ShieldCheck, ShieldOff, Search } from "lucide-react";
import type { User } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  REGISTERED_VIEWER: "Viewer",
  CONTRIBUTOR: "Contributor",
  REVIEWER: "Reviewer",
  ADMINISTRATOR: "Admin",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REGISTERED_VIEWER: "secondary",
  CONTRIBUTOR: "default",
  REVIEWER: "outline",
  ADMINISTRATOR: "destructive",
};

function UsersContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const allUsersQuery = useQuery({
    queryKey: ["all-users"],
    queryFn: () => apiClient.get<User[]>("/api/users/all"),
  });

  const grantMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/users/${userId}/grant-contributor`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/users/${userId}/revoke-contributor`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });

  const users = allUsersQuery.data ?? [];
  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold">User Management</h1>
        <span className="text-sm text-muted-foreground">
          {users.length} total users
        </span>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "ALL")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="REGISTERED_VIEWER">Viewer</SelectItem>
            <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
            <SelectItem value="REVIEWER">Reviewer</SelectItem>
            <SelectItem value="ADMINISTRATOR">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {allUsersQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : allUsersQuery.isError ? (
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load users.
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{user.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANTS[user.role] ?? "secondary"}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.contributorRequested && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Pending Request
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {user.role === "CONTRIBUTOR" ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeMutation.mutate(user.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <ShieldOff className="mr-1 size-3.5" />
                        Revoke
                      </Button>
                    ) : user.role === "REGISTERED_VIEWER" ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => grantMutation.mutate(user.id)}
                        disabled={grantMutation.isPending}
                      >
                        <ShieldCheck className="mr-1 size-3.5" />
                        Grant Contributor
                      </Button>
                    ) : null}
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
