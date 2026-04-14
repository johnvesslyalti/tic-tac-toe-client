"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@heroiclabs/nakama-js";
import client from "@/lib/nakama";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        let restoredSession = Session.restore(accessToken, refreshToken);
        
        // Check if session is expired or close to expiring (within 60 seconds)
        if (restoredSession.isexpired(Date.now() / 1000 + 60)) {
          // Refresh the session
          restoredSession = await client.sessionRefresh(restoredSession);
          localStorage.setItem("nakama_access_token", restoredSession.token);
          localStorage.setItem("nakama_refresh_token", restoredSession.refresh_token || "");
        }
        
        setSession(restoredSession);
      } catch (error) {
        // Handle Nakama Response errors (nakama-js throws Response objects on failure)
        if (error instanceof Response || (error && typeof error === "object" && "status" in error)) {
          const response = error as Response;
          if (response.status === 401) {
            // Expected if session is gone/expired, no need to log a disruptive error
            console.debug("Session restoration skipped: Tokens are invalid or expired.");
          } else {
            try {
              const errorData = await response.json().catch(() => ({}));
              console.error(`Failed to restore session (API ${response.status}):`, errorData.message || errorData);
            } catch {
              console.error(`Failed to restore session (API ${response.status}):`, response.statusText);
            }
          }
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
    const newSession = await client.authenticateEmail(email, pass, false);
    setSession(newSession);
    localStorage.setItem("nakama_access_token", newSession.token);
    localStorage.setItem("nakama_refresh_token", newSession.refresh_token || "");
  };

  const signup = async (email: string, pass: string, username: string) => {
    const newSession = await client.authenticateEmail(email, pass, true, username);
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
