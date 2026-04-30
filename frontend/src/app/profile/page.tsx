"use client";

import { useEffect, useRef, useState } from "react";
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

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  const [password, setPassword] = useState("");

  const [profilePublic, setProfilePublic] = useState(true);
  const [showEmail, setShowEmail] = useState(false);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );
  const [selectedAvatarPreviewUrl, setSelectedAvatarPreviewUrl] = useState<
    string | null
  >(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
      setBio(user.bio ?? "");
      setPassword("");
      setProfilePublic(user.profilePublic ?? true);
      setShowEmail(user.showEmail ?? false);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (selectedAvatarPreviewUrl) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
      }
    };
  }, [selectedAvatarPreviewUrl]);

  if (!user) return null;

  const previewName = displayName.trim() || user.displayName || "User";
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  const avatarPreviewToShow =
    selectedAvatarPreviewUrl || avatarUrl || user.avatarUrl || null;

  function clearSelectedAvatar() {
    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
    }

    setSelectedAvatarFile(null);
    setSelectedAvatarPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);

    const file = e.target.files?.[0];

    if (!file) {
      clearSelectedAvatar();
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed for avatars.");
      clearSelectedAvatar();
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Avatar image must be smaller than 5MB.");
      clearSelectedAvatar();
      return;
    }

    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedAvatarFile(file);
    setSelectedAvatarPreviewUrl(previewUrl);
  }

  async function uploadAvatarFile(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.uploadForm<User>("/api/users/me/avatar", formData);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    if (password && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSaving(true);

    try {
      await apiClient.put<User>("/api/users/me", {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        password: password || undefined,
        profilePublic,
        showEmail,
      });

      if (selectedAvatarFile) {
        setIsUploadingAvatar(true);

        const uploadedProfile = await uploadAvatarFile(selectedAvatarFile);

        setAvatarUrl(uploadedProfile.avatarUrl ?? "");
        clearSelectedAvatar();

        setIsUploadingAvatar(false);
      }

      await refreshUser();

      setPassword("");
      setSuccess("Profile updated successfully.");
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | undefined;
        setError(body?.message || err.message || "Failed to update profile.");
      } else if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
      setIsUploadingAvatar(false);
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
        setError(
          body?.message || err.message || "Failed to request contributor status."
        );
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
    setPassword("");
    setProfilePublic(user.profilePublic ?? true);
    setShowEmail(user.showEmail ?? false);

    clearSelectedAvatar();

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
                avatarUrl={avatarPreviewToShow}
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

                {selectedAvatarFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected avatar: {selectedAvatarFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing || isSaving || isUploadingAvatar}
                />
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="space-y-2">
                  <Label htmlFor="avatar-file">Upload Avatar Image</Label>

                  <input
                    id="avatar-file"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    disabled={!isEditing || isSaving || isUploadingAvatar}
                    className="hidden"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!isEditing || isSaving || isUploadingAvatar}
                    >
                      Choose File
                    </Button>

                    <span className="text-sm text-muted-foreground">
                      {selectedAvatarFile
                        ? `Selected: ${selectedAvatarFile.name}`
                        : "No file selected"}
                    </span>

                    {selectedAvatarFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearSelectedAvatar}
                        disabled={!isEditing || isSaving || isUploadingAvatar}
                      >
                        Remove Selection
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Choose a JPG, PNG, or WEBP image from your computer. Maximum
                    size: 5MB.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar-url">Avatar URL (optional)</Label>
                  <Input
                    id="avatar-url"
                    placeholder="https://example.com/avatar.png"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    disabled={!isEditing || isSaving || isUploadingAvatar}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can still set an avatar by URL. If you also choose a
                    local file, the uploaded file will take precedence when you
                    save.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!isEditing || isSaving || isUploadingAvatar}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters.
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
                  disabled={!isEditing || isSaving || isUploadingAvatar}
                />
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Public contributor profile</p>
                    <p className="text-sm text-muted-foreground">
                      When enabled, other users can open your contributor page
                      from resources and comments.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profilePublic}
                    onChange={(e) => setProfilePublic(e.target.checked)}
                    disabled={!isEditing || isSaving || isUploadingAvatar}
                    className="mt-1 h-4 w-4"
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Show email on public profile</p>
                    <p className="text-sm text-muted-foreground">
                      Your email will only be shown if your public profile is
                      visible.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    disabled={
                      !isEditing ||
                      isSaving ||
                      isUploadingAvatar ||
                      !profilePublic
                    }
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
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isUploadingAvatar}
                  >
                    {isSaving || isUploadingAvatar
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving || isUploadingAvatar}
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
                disabled={isRequesting || isSaving || isUploadingAvatar}
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