"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  REGISTERED_VIEWER: "Registered Viewer",
  CONTRIBUTOR: "Contributor",
  REVIEWER: "Reviewer",
  ADMINISTRATOR: "Administrator",
};

function ProfileContent() {
  const { user, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  if (!user) return null;

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put<User>("/api/users/me", { displayName: displayName.trim() });
      setSuccess("Profile updated successfully.");
      setIsEditing(false);
      refreshUser();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | undefined;
        setError(body?.message || err.message || "Failed to update profile.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDisplayName(user!.displayName);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  }

  async function handleRequestContributor() {
    setError(null);
    setSuccess(null);
    setIsRequesting(true);
    try {
      await apiClient.post("/api/users/me/request-contributor");
      setSuccess("Contributor application submitted! An administrator will review your request.");
      refreshUser();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | undefined;
        setError(body?.message || err.message || "Failed to submit request.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
          <CardDescription>View and update your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            {isEditing ? (
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                autoFocus
              />
            ) : (
              <p id="displayName" className="text-sm">{user.displayName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>

          {user.role === "REGISTERED_VIEWER" && !user.contributorRequested && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-sm text-blue-800">
                Want to contribute heritage resources? Apply to become a Contributor.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestContributor}
                disabled={isRequesting}
              >
                {isRequesting ? "Submitting…" : "Apply to be Contributor"}
              </Button>
            </div>
          )}
          {user.role === "REGISTERED_VIEWER" && user.contributorRequested && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                Your contributor application is pending administrator approval.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => { setSuccess(null); setIsEditing(true); }}>
              Edit Profile
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
