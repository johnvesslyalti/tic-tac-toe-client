"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import client, { getNakamaSocketUrl, nakamaConfig } from "@/lib/nakama";
import { GameState, OpCode } from "@/types/game";
import MatchmakingView from "@/components/MatchmakingView";
import GameBoard from "@/components/GameBoard";
import ResultsView from "@/components/ResultsView";
import RoomBrowser from "@/components/RoomBrowser";
import WaitingRoomView from "@/components/WaitingRoomView";
import { Socket } from "@heroiclabs/nakama-js";

type ViewState = "lobby" | "matchmaking" | "playing" | "results" | "waiting_room" | "browsing";

export default function Home() {
  const { session, setSession, isLoading, logout } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<ViewState>("lobby");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchmakerTicket, setMatchmakerTicket] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  // Auto-clear error message
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const connectSocket = useCallback(async () => {
    if (!session) return null;

    // Proactively refresh the token if it's expired or about to expire (within 10s).
    // An expired token causes a 401 on the WebSocket handshake, which looks like a
    // connection failure rather than an auth error.
    let activeSession = session;
    if (activeSession.isexpired(Date.now() / 1000 + 10)) {
      try {
        activeSession = await client.sessionRefresh(activeSession);
        const ACCESS_TOKEN_KEY = "nakama_access_token";
        const REFRESH_TOKEN_KEY = "nakama_refresh_token";
        localStorage.setItem(ACCESS_TOKEN_KEY, activeSession.token);
        if (activeSession.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, activeSession.refresh_token);
        }
        // Sync updated session into React state
        const { Session } = await import("@heroiclabs/nakama-js");
        const refreshed = Session.restore(activeSession.token, activeSession.refresh_token);
        setSession(refreshed);
        activeSession = refreshed;
      } catch (refreshError) {
        throw new Error("Your session has expired. Please log in again.");
      }
    }

    const newSocket = client.createSocket(nakamaConfig.useSSL, false);

    try {
      await newSocket.connect(activeSession, true);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "isTrusted" in error &&
        (error as { isTrusted?: boolean }).isTrusted
      ) {
        throw new Error(
          `Could not connect to Nakama. The server may be unreachable at ${getNakamaSocketUrl()}, or your session is invalid. Try logging out and back in.`,
        );
      }
      throw error;
    }

    setSocket(newSocket);
    socketRef.current = newSocket;
    return newSocket;
  }, [session]);

  const setupMatchListeners = (activeSocket: Socket) => {
    activeSocket.onmatchdata = (result) => {
      const payload = JSON.parse(new TextDecoder().decode(result.data));
      if (result.op_code === OpCode.UPDATE) {
        setGameState(payload);
        if (payload.gameStarted) setView("playing");
        if (payload.winner) setView("results");
      }
    };
  };

  const handleCreateRoom = async () => {
    setView("waiting_room");
    try {
      const response = await client.rpc(session!, "create_match", {});
      if (!response.payload) throw new Error("No match ID returned");
      const { match_id } = response.payload as { match_id: string };
      
      const activeSocket = await connectSocket();
      if (!activeSocket) throw new Error("Could not connect socket");

      setupMatchListeners(activeSocket);
      
      await activeSocket.joinMatch(match_id);
      setMatchId(match_id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create room");
      setView("lobby");
      console.error("Failed to create room:", err);
    }
  };

  const handleJoinRoom = async (targetMatchId: string) => {
    setView("matchmaking"); // generic loading state
    try {
      const activeSocket = await connectSocket();
      if (!activeSocket) throw new Error("Could not connect socket");

      setupMatchListeners(activeSocket);

      await activeSocket.joinMatch(targetMatchId);
      setMatchId(targetMatchId);
    } catch (err: any) {
      const isMatchFull = err.message?.includes("Match already full") || err.message?.includes("match full");
      
      let msg = "Could not join room";
      if (isMatchFull) {
        msg = "This room is already full (max 2 players).";
        console.warn("Join attempt rejected: Match already full");
      } else {
        msg = err.message || msg;
        console.error("Failed to join room:", err);
      }
      
      setErrorMessage(msg);
      setView("lobby");
    }
  };

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
      setupMatchListeners(activeSocket);

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
        } catch (e: any) {
          isJoiningMatchRef.current = false;
          const isMatchFull = e.message?.includes("Match already full") || e.message?.includes("match full");
          
          if (isMatchFull) {
            setErrorMessage("This room is already full (max 2 players).");
            console.warn("Matchmaker join rejected: Match already full");
          } else {
            console.error("Failed to join match after matchmaking:", e);
            setErrorMessage(e.message || "Failed to join match");
          }
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
      {/* Error Notification */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </div>
            <p className="text-sm font-bold text-red-100/90 leading-tight">
              {errorMessage}
            </p>
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-auto p-1 hover:bg-white/5 rounded-lg text-white/40 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}

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
                className="group relative py-4 bg-teal-game hover:bg-teal-game/90 text-white font-black rounded-xl shadow-[0_10px_20px_rgba(38,184,163,0.2)] transition-all hover:scale-[1.03] active:scale-95 text-sm uppercase tracking-widest overflow-hidden"
              >
                <span className="relative z-10">Quick Match</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleCreateRoom}
                  className="py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all hover:scale-[1.03] active:scale-95 text-xs border border-white/5 uppercase tracking-wider"
                >
                  Create Room
                </button>
                <button 
                  onClick={() => setView("browsing")}
                  className="py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all hover:scale-[1.03] active:scale-95 text-xs border border-white/5 uppercase tracking-wider"
                >
                  Browse Rooms
                </button>
              </div>
              
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

      {view === "browsing" && (
        <RoomBrowser 
          session={session} 
          onJoin={handleJoinRoom} 
          onCancel={() => setView("lobby")} 
        />
      )}

      {view === "waiting_room" && (
        <WaitingRoomView 
          matchId={matchId} 
          onCancel={handleLeave} 
        />
      )}

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
