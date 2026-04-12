"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfileAvatarPreview({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const initials = getInitials(displayName) || "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="h-20 w-20 rounded-full border object-cover"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted text-2xl font-semibold text-foreground">
      {initials}
    </div>
  );
}

function ProfileContent() {
  const { user, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [profilePublic, setProfilePublic] = useState(true);
  const [showEmail, setShowEmail] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
      setBio(user.bio ?? "");
      setProfilePublic(user.profilePublic ?? true);
      setShowEmail(user.showEmail ?? false);
    }
  }, [user]);

  if (!user) return null;

  const previewName = displayName.trim() || user.displayName || "User";
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put<User>("/api/users/me", {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        profilePublic,
        showEmail,
      });

      await refreshUser();
      setSuccess("Profile updated successfully.");
      setIsEditing(false);
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

  async function handleRequestContributor() {
    setError(null);
    setSuccess(null);
    setIsRequesting(true);

    try {
      await apiClient.post("/api/users/me/request-contributor");
      await refreshUser();
      setSuccess("Contributor application submitted.");
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | undefined;
        setError(body?.message || err.message || "Failed to request contributor status.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsRequesting(false);
    }
  }

  function handleCancel() {
    if (!user) return;

    setDisplayName(user.displayName ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
    setBio(user.bio ?? "");
    setProfilePublic(user.profilePublic ?? true);
    setShowEmail(user.showEmail ?? false);

    setError(null);
    setSuccess(null);
    setIsEditing(false);
  }

  return (
    <main className="px-6 py-8 sm:px-10 lg:px-20 xl:px-32">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>
              Manage your account details and public contributor profile.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-md bg-green-50 p-3 text-sm text-green-700"
              >
                {success}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <ProfileAvatarPreview
                displayName={previewName}
                avatarUrl={avatarUrl || user.avatarUrl}
              />

              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-lg font-semibold">{previewName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>Role: {roleLabel}</span>
                  <span>•</span>
                  <span>
                    Public profile: {profilePublic ? "Visible" : "Private"}
                  </span>
                  <span>•</span>
                  <span>Email display: {showEmail ? "Shown" : "Hidden"}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing || isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  placeholder="https://example.com/avatar.png"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={!isEditing || isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  This version uses an image URL. If you later add a real upload API,
                  this field can be replaced by an upload control.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Tell others a little about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing || isSaving}
                />
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Public contributor profile</p>
                    <p className="text-sm text-muted-foreground">
                      When enabled, other users can open your contributor page from
                      resources and comments.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profilePublic}
                    onChange={(e) => setProfilePublic(e.target.checked)}
                    disabled={!isEditing || isSaving}
                    className="mt-1 h-4 w-4"
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Show email on public profile</p>
                    <p className="text-sm text-muted-foreground">
                      Your email will only be shown if your public profile is visible.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    disabled={!isEditing || isSaving || !profilePublic}
                    className="mt-1 h-4 w-4"
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap justify-between gap-3">
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            {user.role === "REGISTERED_VIEWER" && !user.contributorRequested && (
              <Button
                variant="secondary"
                onClick={handleRequestContributor}
                disabled={isRequesting}
              >
                {isRequesting ? "Submitting..." : "Request Contributor Access"}
              </Button>
            )}

            {user.role === "REGISTERED_VIEWER" && user.contributorRequested && (
              <span className="text-sm text-muted-foreground">
                Contributor request pending review.
              </span>
            )}
          </CardFooter>
        </Card>
      </div>
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