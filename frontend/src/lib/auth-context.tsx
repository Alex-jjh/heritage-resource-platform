"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthResponse, User } from "@/types";
import { apiClient, setOnUnauthorized } from "@/lib/api-client";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function storeTokens(tokens: AuthResponse) {
  localStorage.setItem("accessToken", tokens.accessToken);
}

function clearTokens() {
  localStorage.removeItem("accessToken");
}

function hasStoredToken(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("accessToken");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Guard: ignore 401-triggered clearSession while a login is in progress
  const isLoggingIn = useRef(false);

  const clearSession = useCallback(() => {
    // Don't clear session if we're in the middle of logging in —
    // a stale 401 from a previous session's in-flight request must not
    // wipe out the freshly stored token.
    if (isLoggingIn.current) return;

    clearTokens();
    setUser(null);
    // Purge all cached query data so the next user doesn't see stale results
    queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  // Wire up the 401 handler so any API call that gets a 401 clears the session
  useEffect(() => {
    setOnUnauthorized(clearSession);
  }, [clearSession]);

  // On mount, try to fetch the current user if we have a stored token
  useEffect(() => {
    if (!hasStoredToken()) {
      setIsLoading(false);
      return;
    }

    apiClient
      .get<User>("/api/users/me")
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, [clearSession]);

  // Auto-logout after 30 minutes of inactivity
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    function resetTimer() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        clearSession();
        window.location.href = "/login?reason=idle";
      }, IDLE_TIMEOUT_MS);
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user, clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    // Cancel any in-flight queries from the previous session so their
    // potential 401 responses don't trigger onUnauthorized and wipe
    // the token we're about to store.
    queryClient.cancelQueries();
    queryClient.clear();

    isLoggingIn.current = true;
    try {
      const tokens = await apiClient.post<AuthResponse>("/api/auth/login", {
        email,
        password,
      }, { skipAuth: true });
      storeTokens(tokens);
      const profile = await apiClient.get<User>("/api/users/me");
      setUser(profile);
    } finally {
      isLoggingIn.current = false;
    }
  }, [queryClient]);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      await apiClient.post("/api/auth/register", {
        email,
        password,
        displayName,
      }, { skipAuth: true });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await apiClient.get<User>("/api/users/me");
      setUser(profile);
    } catch {
      // ignore — user state stays as-is
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
