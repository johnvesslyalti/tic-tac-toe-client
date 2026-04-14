"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!username) {
          throw new Error("Username is required for signup");
        }
        await signup(email, password, username);
      }
      router.push("/");
    } catch (err: unknown) {
      // Handle Nakama Response errors
      if (err instanceof Response || (err && typeof err === "object" && "status" in err)) {
        const response = err as Response;
        try {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || `Authentication failed (${response.status})`;
          console.error(`Auth error (API ${response.status}):`, message);
          setError(message);
        } catch {
          console.error(`Auth error (API ${response.status}):`, response.statusText);
          setError(`Authentication error: ${response.statusText}`);
        }
      } else {
        console.error("Auth error:", err);
        setError(err.message || "An authentication error occurred. Please check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-900 dark:via-black dark:to-zinc-950 p-6">
      <div className="w-full max-w-md">
        {/* Logo / Title Area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black dark:bg-zinc-50 mb-4 shadow-2xl">
            <span className="text-3xl font-bold text-white dark:text-black">X</span>
            <span className="text-3xl font-bold text-white dark:text-black translate-x-1 outline-1">O</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-black dark:text-white sm:text-5xl">
            TIC-TAC-TOE
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium tracking-wide uppercase text-xs">
            Server-Authoritative Multiplayer
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-zinc-800/50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {isLogin ? "Welcome back" : "Join the game"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {isLogin 
                ? "Enter your credentials to access your account" 
                : "Create an account to start playing with others"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.0">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase ml-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-zinc-100 dark:bg-black border-2 border-transparent focus:border-black dark:focus:border-white outline-none transition-all duration-200 text-zinc-900 dark:text-white font-medium"
                  placeholder="legendaryplayer"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-zinc-100 dark:bg-black border-2 border-transparent focus:border-black dark:focus:border-white outline-none transition-all duration-200 text-zinc-900 dark:text-white font-medium"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-zinc-100 dark:bg-black border-2 border-transparent focus:border-black dark:focus:border-white outline-none transition-all duration-200 text-zinc-900 dark:text-white font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm font-semibold text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
