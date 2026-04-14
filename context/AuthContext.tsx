"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@heroiclabs/nakama-js";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthSessionPayload {
  token: string;
  refresh_token?: string;
}

function getAuthBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return "http://localhost:5000";
}

async function authenticateViaApi(
  path: "/auth/login" | "/auth/register",
  body: Record<string, string>,
): Promise<Session> {
  const response = await fetch(`${getAuthBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as
    | AuthSessionPayload
    | { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(
      ("message" in payload && payload.message) ||
        ("error" in payload && payload.error) ||
        `Authentication failed (${response.status})`,
    );
  }

  if (!("token" in payload) || !payload.token) {
    throw new Error("Authentication response did not include a session token");
  }

  return Session.restore(payload.token, payload.refresh_token || "");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem("nakama_access_token");
      const refreshToken = localStorage.getItem("nakama_refresh_token");

      if (!accessToken || !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const restoredSession = Session.restore(accessToken, refreshToken);

        if (restoredSession.isexpired(Date.now() / 1000 + 60)) {
          throw new Error("Stored session has expired");
        }

        setSession(restoredSession);
      } catch (error) {
        if (error instanceof Error) {
          console.debug("Session restoration skipped:", error.message);
        } else {
          console.error("Failed to restore session (Internal error):", error);
        }

        // Clean up invalid tokens
        localStorage.removeItem("nakama_access_token");
        localStorage.removeItem("nakama_refresh_token");
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, pass: string) => {
    const newSession = await authenticateViaApi("/auth/login", {
      email,
      password: pass,
    });
    setSession(newSession);
    localStorage.setItem("nakama_access_token", newSession.token);
    localStorage.setItem("nakama_refresh_token", newSession.refresh_token || "");
  };

  const signup = async (email: string, pass: string, username: string) => {
    const newSession = await authenticateViaApi("/auth/register", {
      email,
      password: pass,
      username,
    });
    setSession(newSession);
    localStorage.setItem("nakama_access_token", newSession.token);
    localStorage.setItem("nakama_refresh_token", newSession.refresh_token || "");
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("nakama_access_token");
    localStorage.removeItem("nakama_refresh_token");
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
