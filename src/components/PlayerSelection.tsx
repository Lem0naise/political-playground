'use client';

import { useGame } from '@/contexts/GameContext';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';

export default function PlayerSelection() {
  const { state, actions } = useGame();

  const handlePlayerSelect = (candidateId: number) => {
    actions.setPlayerCandidate(candidateId);
    actions.startCampaign();
  };

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="newspaper-header text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            CANDIDATE SELECTION
          </h1>
          <div className="border-t-2 border-b-2 border-red-500 py-2 sm:py-3 my-3 sm:my-4">
            <p className="campaign-status text-base sm:text-lg text-red-200">
              CHOOSE YOUR PARTY BANNER • {state.country}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {state.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="vintage-border p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:border-yellow-400 hover:bg-yellow-900/10 transform hover:scale-105"
              style={{ background: 'var(--newspaper-bg)' }}
              onClick={() => handlePlayerSelect(candidate.id)}
            >
              <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                <div 
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-slate-800 flex-shrink-0"
                  style={{ backgroundColor: candidate.colour }}
                ></div>
                <div className="flex-1 min-w-0">
                  <h3 className="newspaper-header text-lg sm:text-xl font-bold text-slate-900 truncate">{candidate.party}</h3>
                  <p className="text-slate-700 font-medium text-sm truncate">Led by {candidate.name}</p>
                </div>
              </div>

              <div className="mb-3 sm:mb-4">
                <div className="text-xs sm:text-sm text-slate-600 mb-2 font-mono">
                  SUPPORT LEVEL: {candidate.party_pop >= 1 ? `${candidate.party_pop.toFixed(1)}` : `${(candidate.party_pop * 100).toFixed(1)}`}
                </div>
                <div className="w-full bg-slate-300 rounded-full h-2 sm:h-3 border border-slate-400">
                  <div 
                    className="h-2 sm:h-3 rounded-full relative overflow-hidden"
                    style={{ 
                      backgroundColor: candidate.colour,
                      width: `${Math.max(5, Math.min(100, candidate.party_pop > 1 ? candidate.party_pop * 2 : candidate.party_pop * 200))}%`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <span className="font-semibold text-slate-700 text-xs">Ideology: </span>
                {getIdeologyProfile(candidate.vals)}
              </div>

              <button className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status text-sm sm:text-base">
                🚀 CAMPAIGN AS {candidate.party.toUpperCase()}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => actions.resetGame()}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status"
          >
            ◄ RETURN TO SETUP
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-slate-300 text-xs">
            Created by <a href="https://indigonolan.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline transition-colors">Indigo Nolan</a>
          </p>
        </div>
      </div>
    </div>
  );
}
