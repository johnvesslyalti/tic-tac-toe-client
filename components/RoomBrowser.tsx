"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import client from "@/lib/nakama";
import { Session } from "@heroiclabs/nakama-js";

interface RoomBrowserProps {
  session: Session;
  onJoin: (matchId: string) => void;
  onCancel: () => void;
}

interface MatchResponse {
  matchId: string;
  authoritative: boolean;
  label: string;
  size: number;
  tickRate: number;
  handlerName: string;
}

export default function RoomBrowser({ session, onJoin, onCancel }: RoomBrowserProps) {
  const [matches, setMatches] = useState<MatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join by Match ID
  const [joinIdValue, setJoinIdValue] = useState("");
  const [joinIdError, setJoinIdError] = useState<string | null>(null);
  const joinIdInputRef = useRef<HTMLInputElement>(null);

  const handleJoinById = () => {
    const trimmed = joinIdValue.trim();
    if (!trimmed) {
      setJoinIdError("Please enter a Match ID.");
      joinIdInputRef.current?.focus();
      return;
    }
    setJoinIdError(null);
    onJoin(trimmed);
  };

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Using the backend RPC we created to list matches securely
      const response = await client.rpc(session, "list_matches", {});
      if (response.payload) {
        // Handle both snake_case and camelCase just in case
        const data = response.payload as { 
          matches?: Array<{
            matchId?: string;
            match_id?: string;
            label?: string;
            size?: number;
            authoritative?: boolean;
            tickRate?: number;
            tick_rate?: number;
            handlerName?: string;
            handler_name?: string;
          }> 
        };
        const processedMatches = (data.matches || []).map(m => ({
          matchId: m.matchId || m.match_id || "",
          label: m.label || "",
          size: m.size || 0,
          authoritative: m.authoritative || false,
          tickRate: m.tickRate || m.tick_rate || 0,
          handlerName: m.handlerName || m.handler_name || ""
        }));
        setMatches(processedMatches);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch matches:", err);
      setError("Could not load available games.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchMatches();
    // Refresh matches every 10 seconds while browsing
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const decodeLabel = (labelString: string) => {
    if (!labelString) return null;
    try {
      return JSON.parse(labelString);
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-lg p-6 bg-dark-surface/80 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
          Custom Games
          {loading && <div className="w-4 h-4 border-2 border-teal-game border-t-transparent rounded-full animate-spin" />}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchMatches}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button
            onClick={onCancel}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      <div className="min-h-[300px] flex flex-col gap-3">
        {error ? (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
            {error}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40 text-sm space-y-4">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
             <p>No open games found.</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {matches.map((match) => {
              const label = decodeLabel(match.label);
              if (!label || label.open !== 1) return null; // Only show waiting rooms
              
              const displayId = (match.matchId || "").split('.')[0] || "Unknown";
              
              return (
                <div key={match.matchId} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                  <div className="flex flex-col">
                    <span className="font-medium text-white/90">Tic-Tac-Toe Game</span>
                    <span className="text-xs font-mono text-white/40 uppercase tracking-wider truncate w-48">
                      {displayId}...
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-teal-game/50 border border-dark-surface z-10 flex items-center justify-center text-[10px] font-bold text-white">X</div>
                          <div className="w-6 h-6 rounded-full bg-white/10 border border-dark-surface border-dashed flex items-center justify-center text-[10px] font-bold text-white/40">?</div>
                       </div>
                       <span className="text-xs text-white/40 font-bold ml-1">1/2</span>
                    </div>
                    
                    <button
                      onClick={() => onJoin(match.matchId)}
                      className="px-4 py-2 bg-teal-game text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-teal-game/90 transition-transform active:scale-95 border border-teal-game/20"
                    >
                      Join
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Join by Match ID ── */}
      <div className="mt-5 pt-5 border-t border-white/5">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Join by Match ID</p>
        <div className="flex gap-2">
          <input
            ref={joinIdInputRef}
            id="join-match-id-input"
            type="text"
            value={joinIdValue}
            onChange={(e) => {
              setJoinIdValue(e.target.value);
              if (joinIdError) setJoinIdError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleJoinById()}
            placeholder="Paste a match ID…"
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-game/60 focus:bg-white/8 transition-colors font-mono"
          />
          <button
            id="join-match-id-btn"
            onClick={handleJoinById}
            className="px-5 py-2.5 bg-teal-game hover:bg-teal-game/90 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 whitespace-nowrap"
          >
            Join
          </button>
        </div>
        {joinIdError && (
          <p className="mt-2 text-xs text-red-400">{joinIdError}</p>
        )}
      </div>
    </div>
  );
}
