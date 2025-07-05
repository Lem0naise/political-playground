'use client';

import { useGame } from '@/contexts/GameContext';
import { formatVotes } from '@/lib/gameEngine';

export default function PollResults() {
  const { state } = useGame();

  if (state.pollResults.length === 0) {
    return (
      <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 sm:p-3 text-white">
        <h2 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400 mb-2">POLLING STATUS</h2>
        <p className="text-slate-300 font-mono text-xs">AWAITING DATA... START CAMPAIGN TO INITIALIZE POLLING</p>
      </div>
    );
  }

  const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
  const totalVotes = state.pollResults.reduce((sum, result) => sum + result.votes, 0);
  const turnout = totalVotes > 0 ? ((totalVotes / state.countryData.pop) * 100) : 0;

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 sm:p-3 text-white">
      <h2 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400 mb-2">
        📊 LIVE POLLING DATA
        {state.currentPoll > 0 && (
          <span className="text-xs font-normal text-slate-300 ml-1 sm:ml-2 font-mono">
            (WAVE {state.currentPoll}/{state.totalPolls})
          </span>
        )}
      </h2>

      <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3">
        {sortedResults.map((result, index) => {
          const isPlayer = result.candidate.is_player;
          const change = result.change || 0;
          
          return (
            <div
              key={result.candidate.id}
              className={`p-1.5 sm:p-2 rounded-lg border relative overflow-hidden ${
                isPlayer 
                  ? 'border-yellow-400 bg-yellow-900/20' 
                  : 'border-slate-600 bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="flex items-center space-x-1">
                    <span className="campaign-status text-xs font-bold text-green-400">
                      #{index + 1}
                    </span>
                    <div 
                      className="w-3 h-3 rounded-full border border-white"
                      style={{ backgroundColor: result.candidate.colour }}
                    ></div>
                  </div>
                  <div>
                    <div className={`font-bold text-xs sm:text-sm ${isPlayer ? 'text-yellow-400' : 'text-white'}`}>
                      {result.candidate.party}
                      {isPlayer && ' ◄ YOU'}
                      {index === 0 && ' ★'}
                    </div>
                    <div className="text-xs text-slate-300 font-mono">{result.candidate.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="campaign-status text-xs sm:text-sm font-bold text-green-400">
                    {result.percentage.toFixed(1)}%
                  </div>
                  {Math.abs(change) > 0.05 && (
                    <div className={`text-xs font-mono ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {change > 0 ? '▲' : '▼'}{Math.abs(change).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
              
              <div className="w-full bg-slate-600 rounded-full h-1 mb-1">
                <div 
                  className="h-1 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ 
                    backgroundColor: result.candidate.colour,
                    width: `${Math.max(0.5, Math.min(100, result.percentage))}%`
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              
              <div className="text-xs text-slate-400 font-mono">
                {formatVotes(result.votes, state.countryData.scale)} VOTES
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-1 sm:pt-2 border-t border-slate-600">
        <div className="text-xs text-slate-300 font-mono">
          <div className="flex justify-between">
            <span>TURNOUT:</span>
            <span className="text-green-400 font-bold">{turnout.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {formatVotes(totalVotes, state.countryData.scale)} OF {state.countryData.pop.toLocaleString()} REGISTERED
          </div>
        </div>
      </div>

      {state.currentPoll === 2 && (
        <div className="mt-1 sm:mt-2 p-1.5 sm:p-2 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <p className="text-xs text-yellow-300 font-mono">
            📈 BASELINE ESTABLISHED - TRACKING MOMENTUM
          </p>
        </div>
      )}
    </div>
  );
}
