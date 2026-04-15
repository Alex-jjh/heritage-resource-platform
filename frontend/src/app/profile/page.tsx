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
    <main style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div className="card" style={{ width: "100%", maxWidth: 450 }}>
        <h1>My Profile</h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>View and update your account details</p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <div className="form-group">
          <label>Display Name</label>
          {isEditing ? (
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
          ) : (
            <p style={{ margin: 0 }}>{user.displayName}</p>
          )}
        </div>

        <div className="form-group">
          <label>Email</label>
          <p style={{ margin: 0, color: "#666" }}>{user.email}</p>
        </div>

        <div className="form-group">
          <label>Role</label>
          <p style={{ margin: 0, color: "#666" }}>{ROLE_LABELS[user.role] ?? user.role}</p>
        </div>

        {user.role === "REGISTERED_VIEWER" && !user.contributorRequested && (
          <div className="warning-msg">
            <p style={{ margin: "0 0 8px" }}>Want to contribute heritage resources? Apply to become a Contributor.</p>
            <button className="btn btn-sm" onClick={handleRequestContributor} disabled={isRequesting}>
              {isRequesting ? "Submitting..." : "Apply to be Contributor"}
            </button>
          </div>
        )}
        {user.role === "REGISTERED_VIEWER" && user.contributorRequested && (
          <div className="warning-msg">Your contributor application is pending administrator approval.</div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          {isEditing ? (
            <>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button className="btn" onClick={handleCancel} disabled={isSaving}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => { setSuccess(null); setIsEditing(true); }}>
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
