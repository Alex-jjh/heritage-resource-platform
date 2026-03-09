"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldOff } from "lucide-react";
import type { User } from "@/types";

function UsersContent() {
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: ["pending-contributors"],
    queryFn: () =>
      apiClient.get<User[]>("/api/users/pending-contributors"),
  });

  const grantMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/users/${userId}/grant-contributor`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-contributors"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/users/${userId}/revoke-contributor`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-contributors"] });
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl font-bold mb-6">User Management</h1>

      <h2 className="text-lg font-semibold mb-4">Pending Contributor Requests</h2>

      {pendingQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : pendingQuery.isError ? (
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load pending contributor requests.
        </div>
      ) : pendingQuery.data && pendingQuery.data.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">No pending contributor requests.</p>
        </div>
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
              {pendingQuery.data?.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{user.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{user.role.replace("_", " ")}</Badge>
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
                        {revokeMutation.isPending ? "Revoking…" : "Revoke"}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => grantMutation.mutate(user.id)}
                        disabled={grantMutation.isPending}
                      >
                        <ShieldCheck className="mr-1 size-3.5" />
                        {grantMutation.isPending ? "Granting…" : "Grant Contributor"}
                      </Button>
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

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRoles={["ADMINISTRATOR"]}>
      <UsersContent />
    </ProtectedRoute>
  );
}
