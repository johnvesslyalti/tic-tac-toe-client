"use client";

import React from "react";
import { GameState } from "@/types/game";

interface ResultsViewProps {
  state: GameState;
  userId: string;
  onPlayAgain: () => void;
}

export default function ResultsView({ state, userId, onPlayAgain }: ResultsViewProps) {
  const isWinner = state.winner === state.players[userId];
  const isDraw = state.winner === "draw";

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-12 animate-in slide-in-from-bottom-12 duration-700">
      {/* Symbol Display */}
      <div className="flex flex-col items-center">
        <span className="text-[120px] font-extralight text-white leading-none mb-6">
          {isDraw ? "XO" : state.winner}
        </span>
        
        <div className="flex flex-col items-center space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-teal-game italic">
                {isDraw ? "DRAW!" : (isWinner ? "WINNER!" : "DEFEAT!")}
            </h2>
            {isWinner && (
                <span className="text-white/60 font-bold text-sm tracking-widest">+200 pts</span>
            )}
        </div>
      </div>

      {/* Leaderboard Mockup (Matching Screenshot) */}
      <div className="w-full max-w-[280px] space-y-6">
        <div className="flex items-center space-x-2 text-teal-game/70">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16h-1.1c.1-.3.1-.6.1-.9V10c0-1.1-.9-2-2-2h-1c-1.1 0-2 .9-2 2v1H9v-1c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v5.1c0 .3 0 .6.1.9H3c-1.1 0-2 .9-2 2v1h22v-1c0-1.1-.9-2-2-2zM9 13V10h6v3H9zm9-3v3h-1v-3h1zM6 10h1v3H6v-3z"/></svg>
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">Leaderboard</span>
        </div>

        <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
                <span className="text-white/90">1. Ace (you)</span>
                <div className="flex space-x-4 font-mono text-white/40">
                    <span className="text-teal-game">10/2/1</span>
                    <span>2100</span>
                </div>
            </div>
            <div className="flex justify-between items-center text-xs opacity-50">
                <span className="text-white/90">2. Boo</span>
                <div className="flex space-x-4 font-mono">
                    <span className="text-red-400">3/10/1</span>
                    <span>500</span>
                </div>
            </div>
        </div>
      </div>

      <button
        onClick={onPlayAgain}
        className="px-10 py-3 rounded-full border border-white/20 hover:bg-white/10 text-white font-bold transition-all text-sm"
      >
        Play Again
      </button>
    </div>
  );
}
