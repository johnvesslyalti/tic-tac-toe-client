"use client";

import React from "react";
import { GameState } from "@/types/game";

interface GameBoardProps {
  state: GameState;
  userId: string;
  onMove: (index: number) => void;
  onLeave: () => void;
}

export default function GameBoard({ state, userId, onMove, onLeave }: GameBoardProps) {
  const isMyTurn = state.players[userId] === state.currentPlayer;
  const board = state.board;

  return (
    <div className="fixed inset-0 bg-teal-game flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      {/* Turn Indicator */}
      <div className="flex flex-col items-center space-y-2 text-white mb-12">
         <div className="flex items-center space-x-12">
            <div className={`flex flex-col items-center transition-opacity ${state.currentPlayer === 'X' ? 'opacity-100' : 'opacity-30'}`}>
                <span className="text-sm font-bold tracking-widest uppercase">X PLAYER</span>
                <span className="text-xs opacity-60">{state.players[userId] === 'X' ? '(you)' : '(opp)'}</span>
            </div>
            <div className={`flex flex-col items-center transition-opacity ${state.currentPlayer === 'O' ? 'opacity-100' : 'opacity-30'}`}>
                <span className="text-sm font-bold tracking-widest uppercase">O PLAYER</span>
                <span className="text-xs opacity-60">{state.players[userId] === 'O' ? '(you)' : '(opp)'}</span>
            </div>
         </div>
         
         <div className="pt-4 flex flex-col items-center">
            <span className="text-5xl font-light mb-1">
                {state.currentPlayer}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Turn</span>
         </div>
      </div>

      {/* Grid */}
      <div className="relative w-full max-w-[320px] aspect-square grid grid-cols-3 grid-rows-3 mb-12">
        {/* Horizontal Lines */}
        <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/20"></div>
        <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white/20"></div>
        
        {/* Vertical Lines */}
        <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/20"></div>
        <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white/20"></div>

        {board.map((cell, i) => (
          <button
            key={i}
            disabled={!isMyTurn || cell !== null}
            onClick={() => onMove(i)}
            className={`flex items-center justify-center text-6xl font-extralight transition-all duration-300 ${
              !cell && isMyTurn ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
            }`}
          >
            {cell && (
              <span className={`animate-in zoom-in-50 duration-300 ${cell === 'X' ? 'text-white' : 'text-white/80'}`}>
                {cell}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="absolute bottom-12">
        <button
          onClick={onLeave}
          className="px-8 py-3 rounded-full bg-black/10 hover:bg-black/20 text-white/70 text-xs font-bold uppercase tracking-widest transition-all border border-black/5"
        >
          Leave Match
        </button>
      </div>
    </div>
  );
}
