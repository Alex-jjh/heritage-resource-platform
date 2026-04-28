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

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const isLoggingIn = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(() => {
    if (isLoggingIn.current) return;

    clearTokens();
    setUser(null);

    queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setOnUnauthorized(clearSession);
  }, [clearSession]);

  useEffect(() => {
    if (!hasStoredToken()) {
      setIsLoading(false);
      return;
    }

    apiClient
      .get<User>("/api/users/me")
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [clearSession]);

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

    events.forEach((eventName) =>
      window.addEventListener(eventName, resetTimer, { passive: true })
    );

    resetTimer();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);

      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetTimer)
      );
    };
  }, [user, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      queryClient.cancelQueries();
      queryClient.clear();

      isLoggingIn.current = true;

      try {
        const tokens = await apiClient.post<AuthResponse>(
          "/api/auth/login",
          { email, password },
          { skipAuth: true }
        );

        storeTokens(tokens);

        const profile = await apiClient.get<User>("/api/users/me");
        setUser(profile);
      } finally {
        isLoggingIn.current = false;
      }
    },
    [queryClient]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      await apiClient.post(
        "/api/auth/register",
        { email, password, displayName },
        { skipAuth: true }
      );
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
      // keep existing user state if refresh fails
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