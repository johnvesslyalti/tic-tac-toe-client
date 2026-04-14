"use client";

import React from "react";

interface MatchmakingViewProps {
  onCancel: () => void;
}

export default function MatchmakingView({ onCancel }: MatchmakingViewProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col items-center space-y-4">
        <h2 className="text-2xl font-medium text-white/90">
          Finding a random player...
        </h2>
        <p className="text-white/40 text-sm">
          It usually takes 30 seconds.
        </p>
      </div>

      {/* Pulsating Indicator */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 bg-teal-game/20 rounded-full animate-ping"></div>
        <div className="absolute w-16 h-16 bg-teal-game/30 rounded-full animate-pulse"></div>
        <div className="relative w-8 h-8 bg-teal-game rounded-full shadow-[0_0_20px_rgba(38,184,163,0.5)]"></div>
      </div>

      <button
        onClick={onCancel}
        className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium border border-white/10 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
