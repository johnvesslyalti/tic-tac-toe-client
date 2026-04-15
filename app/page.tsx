"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import client, { getNakamaSocketUrl, nakamaConfig } from "@/lib/nakama";
import { GameState, OpCode } from "@/types/game";
import MatchmakingView from "@/components/MatchmakingView";
import GameBoard from "@/components/GameBoard";
import ResultsView from "@/components/ResultsView";
import { Socket } from "@heroiclabs/nakama-js";

type ViewState = "lobby" | "matchmaking" | "playing" | "results";

export default function Home() {
  const { session, isLoading, logout } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<ViewState>("lobby");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchmakerTicket, setMatchmakerTicket] = useState<string | null>(null);
  const isJoiningMatchRef = useRef(false);
  const isMatchmakingClickRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login");
    }
  }, [session, isLoading, router]);

  // Socket Cleanup
  useEffect(() => {
    return () => {
      socket?.disconnect(true);
    };
  }, [socket]);

  const connectSocket = useCallback(async () => {
    if (!session) return null;
    const newSocket = client.createSocket(nakamaConfig.useSSL, false);

    try {
      await newSocket.connect(session, true);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "isTrusted" in error &&
        (error as { isTrusted?: boolean }).isTrusted
      ) {
        throw new Error(
          `Could not connect to Nakama WebSocket at ${getNakamaSocketUrl()}. Make sure the Nakama server is running and reachable from the browser.`,
        );
      }

      throw error;
    }

    setSocket(newSocket);
    socketRef.current = newSocket;
    return newSocket;
  }, [session]);

  const handleFindMatch = async () => {
    isMatchmakingClickRef.current = true;
    setView("matchmaking");
    try {
      const activeSocket = await connectSocket();
      if (!activeSocket) throw new Error("Could not connect socket");

      // Abort if the user cancelled while socket was connecting
      if (!isMatchmakingClickRef.current) {
        try { activeSocket.disconnect(false); } catch(e) {}
        return;
      }

      // Set up listeners first
      activeSocket.onmatchdata = (result) => {
        const payload = JSON.parse(new TextDecoder().decode(result.data));
        if (result.op_code === OpCode.UPDATE) {
          setGameState(payload);
          if (payload.gameStarted) setView("playing");
          if (payload.winner) setView("results");
        }
      };

      // Listen for the matchmaker finding an opponent
      activeSocket.onmatchmakermatched = async (matched) => {
        if (isJoiningMatchRef.current) {
          return;
        }

        isJoiningMatchRef.current = true;
        console.log("Matchmaker found a match!", matched);
        try {
          const joinedMatch = matched.match_id
            ? await activeSocket.joinMatch(matched.match_id)
            : matched.token
              ? await activeSocket.joinMatch(undefined, matched.token)
              : null;

          if (!joinedMatch) {
            throw new Error("Matchmaker response did not include a match target");
          }

          setMatchId(joinedMatch.match_id);
          setMatchmakerTicket(null);
        } catch (e) {
          isJoiningMatchRef.current = false;
          console.error("Failed to join match after matchmaking:", e);
          setView("lobby");
        }
      };

      activeSocket.ondisconnect = () => {
        isJoiningMatchRef.current = false;
        setMatchmakerTicket(null);
      };

      const ticket = await activeSocket.addMatchmaker("*", 2, 2);
      
      // Abort if user cancelled while matchmaker was being added
      if (!isMatchmakingClickRef.current) {
        activeSocket.removeMatchmaker(ticket.ticket).catch(() => {});
        try { activeSocket.disconnect(false); } catch(e) {}
        return;
      }

      setMatchmakerTicket(ticket.ticket);
    } catch (err: unknown) {
      if (err instanceof Response || (err && typeof err === "object" && "status" in err)) {
        const response = err as Response;
        try {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Matchmaking error (API ${response.status}):`, errorData.message || errorData);
        } catch {
          console.error(`Matchmaking error (API ${response.status}):`, response.statusText);
        }
      } else {
        console.error("Matchmaking error details:", err instanceof Error ? err.stack || err.message : JSON.stringify(err));
      }

      isJoiningMatchRef.current = false;
      setMatchmakerTicket(null);
      setView("lobby");
    }
  };

  const handleMove = (index: number) => {
    if (!socket || !matchId) return;
    const data = JSON.stringify({ index });
    socket.sendMatchState(matchId, OpCode.MOVE, data);
  };

  const handleLeave = () => {
    isMatchmakingClickRef.current = false;
    isJoiningMatchRef.current = false;
    
    // Update the UI immediately for a snappy feel
    setView("lobby");

    // Capture the current socket and ticket to clean up safely
    const currentSocket = socketRef.current || socket;
    const currentTicket = matchmakerTicket;

    // Clear state
    setSocket(null);
    socketRef.current = null;
    setMatchId(null);
    setGameState(null);
    setMatchmakerTicket(null);

    // Completely decouple network cleanup from UI
    if (currentSocket) {
      if (currentTicket) {
        currentSocket.removeMatchmaker(currentTicket).catch((error) => {
          console.warn("Failed to remove matchmaker ticket during leave:", error);
        });
      }
      try { 
        currentSocket.disconnect(false); 
      } catch (e) {
        console.warn("Socket disconnect logic threw an error", e);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-teal-game border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 font-sans overflow-hidden">
      {view === "lobby" && (
        <div className="relative w-full max-w-md">
          {/* Background Glow */}
          <div className="absolute -inset-4 bg-teal-game/20 blur-3xl rounded-full opacity-50 animate-pulse" />
          
          <div className="relative bg-dark-surface/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl border border-white/5 text-center space-y-8 animate-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white mb-2 shadow-[0_20px_50px_rgba(255,255,255,0.15)] transform hover:rotate-6 transition-transform duration-500">
              <span className="text-5xl font-black text-black italic tracking-tighter">XO</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">
                Tic Tac Toe
              </h1>
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 rounded-full w-fit mx-auto border border-white/5">
                <div className="w-2 h-2 rounded-full bg-teal-game animate-pulse" />
                <p className="text-white/60 text-xs font-bold tracking-widest uppercase">
                  Logged in as <span className="text-white">{session.username}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col space-y-4 pt-6">
              <button 
                onClick={handleFindMatch}
                className="group relative py-6 bg-teal-game hover:bg-teal-game/90 text-white font-black rounded-2xl shadow-[0_15px_40px_rgba(38,184,163,0.3)] transition-all hover:scale-[1.03] active:scale-95 text-lg uppercase tracking-[0.2em] overflow-hidden"
              >
                <span className="relative z-10">Find Match</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
              
              <button 
                onClick={logout}
                className="py-4 text-white/20 hover:text-red-400 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em]"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "matchmaking" && <MatchmakingView onCancel={handleLeave} />}

      {view === "playing" && gameState && (
        <GameBoard 
          state={gameState} 
          userId={session.user_id!} 
          onMove={handleMove} 
          onLeave={handleLeave} 
        />
      )}

      {view === "results" && gameState && (
        <ResultsView 
          state={gameState} 
          userId={session.user_id!} 
          onPlayAgain={handleLeave} 
        />
      )}
    </div>
  );
}
