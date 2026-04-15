"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/protected-route";
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
    if (user) setDisplayName(user.displayName);
  }, [user]);

  if (!user) return null;

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (!displayName.trim()) { setError("Display name is required."); return; }
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
    <main className="flex justify-center p-10">
      <div className="bg-white border border-gray-200 rounded p-4 mb-3 w-full max-w-md">
        <h1>My Profile</h1>
        <p className="text-gray-400 text-sm mb-4">View and update your account details</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded text-sm mb-3">{success}</div>}

        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Display Name</label>
          {isEditing ? (
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          ) : (
            <p className="m-0">{user.displayName}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Email</label>
          <p className="m-0 text-gray-500">{user.email}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Role</label>
          <p className="m-0 text-gray-500">{ROLE_LABELS[user.role] ?? user.role}</p>
        </div>

        {user.role === "REGISTERED_VIEWER" && !user.contributorRequested && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded text-sm mb-3">
            <p className="m-0 mb-2">Want to contribute heritage resources? Apply to become a Contributor.</p>
            <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" onClick={handleRequestContributor} disabled={isRequesting}>
              {isRequesting ? "Submitting..." : "Apply to be Contributor"}
            </button>
          </div>
        )}
        {user.role === "REGISTERED_VIEWER" && user.contributorRequested && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded text-sm mb-3">Your contributor application is pending administrator approval.</div>
        )}

        <div className="mt-4 flex gap-2">
          {isEditing ? (
            <>
              <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button className="bg-white border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50 disabled:opacity-50" onClick={handleCancel} disabled={isSaving}>Cancel</button>
            </>
          ) : (
            <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700" onClick={() => { setSuccess(null); setIsEditing(true); }}>
              Edit Profile
            </button>
          )}
        </div>
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
