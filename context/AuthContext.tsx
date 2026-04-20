"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@heroiclabs/nakama-js";

interface AuthContextType {
  session: Session | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
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

export class AuthApiError extends Error {
  status: number;
  isExpected: boolean;

  constructor(message: string, status: number, isExpected = false) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.isExpected = isExpected;
  }
}

const ACCESS_TOKEN_KEY = "nakama_access_token";
const REFRESH_TOKEN_KEY = "nakama_refresh_token";

function getAuthBaseUrl(): string {
  // Use the explicitly defined API URL from environment variables
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback for development if no env var is set
  if (typeof window !== "undefined") {
    // If we're on localhost, assume the dev server is on port 5000
    if (window.location.hostname === "localhost") {
      return `http://localhost:5000`;
    }
    // In production, we should default to the current origin if no API URL is provided,
    // as Caddy usually handles routing on the same domain.
    return window.location.origin;
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
      "x-server-key": process.env.NEXT_PUBLIC_NAKAMA_SERVER_KEY ?? "",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as
    | AuthSessionPayload
    | { error?: string; message?: string };

  if (!response.ok) {
    const message =
      ("message" in payload && payload.message) ||
      ("error" in payload && payload.error) ||
      `Authentication failed (${response.status})`;

    const normalizedMessage = message.toLowerCase();
    const isExpectedAuthFailure =
      response.status === 401 ||
      response.status === 404 ||
      normalizedMessage.includes("user not found") ||
      normalizedMessage.includes("invalid credential") ||
      normalizedMessage.includes("invalid email") ||
      normalizedMessage.includes("invalid password");

    throw new AuthApiError(message, response.status, isExpectedAuthFailure);
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
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        let restoredSession = Session.restore(accessToken, refreshToken ?? "");

        if (restoredSession.isexpired(Date.now() / 1000 + 5)) {
          if (restoredSession.refresh_token) {
            try {
              const { default: client } = await import("@/lib/nakama");
              restoredSession = await client.sessionRefresh(restoredSession);
              localStorage.setItem(ACCESS_TOKEN_KEY, restoredSession.token);
              if (restoredSession.refresh_token) {
                localStorage.setItem(REFRESH_TOKEN_KEY, restoredSession.refresh_token);
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              throw new Error("Stored session expired and refresh failed: " + message);
            }
          } else {
            throw new Error("Stored session has expired without a refresh token.");
          }
        }

        setSession(restoredSession);
      } catch (error) {
        if (error instanceof Error) {
          console.debug("Session restoration skipped:", error.message);
        } else {
          console.error("Failed to restore session (Internal error):", error);
        }

        // Clean up invalid tokens
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Proactively refresh the token in the background before it expires
  useEffect(() => {
    if (!session || !session.expires_at || !session.refresh_token) return;

    // Calculate time until expiration in milliseconds, minus a 30s buffer
    const expiresInMs = session.expires_at * 1000 - Date.now() - 30000;

    if (expiresInMs <= 0) return;

    const timer = setTimeout(async () => {
      try {
        const { default: client } = await import("@/lib/nakama");
        const refreshedSession = await client.sessionRefresh(session);
        
        setSession(refreshedSession);
        localStorage.setItem(ACCESS_TOKEN_KEY, refreshedSession.token);
        if (refreshedSession.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshedSession.refresh_token);
        }
      } catch (error) {
        console.error("Background token refresh failed:", error);
        setSession(null);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }, expiresInMs);

    return () => clearTimeout(timer);
  }, [session]);

  const login = async (email: string, pass: string) => {
    const newSession = await authenticateViaApi("/auth/login", {
      email,
      password: pass,
    });
    setSession(newSession);
    localStorage.setItem(ACCESS_TOKEN_KEY, newSession.token);
    if (newSession.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newSession.refresh_token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  };

  const signup = async (email: string, pass: string, username: string) => {
    const newSession = await authenticateViaApi("/auth/register", {
      email,
      password: pass,
      username,
    });
    setSession(newSession);
    localStorage.setItem(ACCESS_TOKEN_KEY, newSession.token);
    if (newSession.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newSession.refresh_token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ session, setSession, isLoading, login, signup, logout }}>
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
