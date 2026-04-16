"use client";

import React, { useState } from "react";

interface WaitingRoomViewProps {
  onCancel: () => void;
  matchId?: string | null;
}

export default function WaitingRoomView({ onCancel, matchId }: WaitingRoomViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (matchId) {
      navigator.clipboard.writeText(matchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col items-center space-y-4">
        <h2 className="text-2xl font-medium text-white/90">
          Waiting for opponent...
        </h2>
        <p className="text-white/40 text-sm">
          Share the Room ID below or let them find it in Browse Rooms.
        </p>
      </div>

      {matchId && (
        <div className="flex flex-col items-center space-y-2">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Room ID</p>
          <div 
            onClick={handleCopy}
            className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border border-white/5"
          >
            <span className="font-mono text-white/80 text-sm">{matchId}</span>
            {copied ? (
              <span className="text-teal-400 text-xs font-bold">COPIED</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Pulsating Indicator */}
      <div className="relative flex items-center justify-center mt-4">
        <div className="absolute w-24 h-24 bg-teal-game/20 rounded-full animate-ping"></div>
        <div className="absolute w-16 h-16 bg-teal-game/30 rounded-full animate-pulse"></div>
        <div className="relative w-8 h-8 bg-teal-game rounded-full shadow-[0_0_20px_rgba(38,184,163,0.5)]"></div>
      </div>

      <button
        onClick={onCancel}
        className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium border border-white/10 transition-colors mt-8"
      >
        Cancel
      </button>
    </div>
  );
}
