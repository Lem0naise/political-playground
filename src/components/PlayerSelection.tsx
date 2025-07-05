'use client';

import { useGame } from '@/contexts/GameContext';

export default function PlayerSelection() {
  const { state, actions } = useGame();

  const handlePlayerSelect = (candidateId: number) => {
    actions.setPlayerCandidate(candidateId);
    actions.startCampaign();
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="newspaper-header text-5xl font-black text-white mb-4">
            CANDIDATE SELECTION
          </h1>
          <div className="border-t-2 border-b-2 border-red-500 py-3 my-4">
            <p className="campaign-status text-lg text-red-200">
              CHOOSE YOUR PARTY BANNER • {state.country}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {state.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="vintage-border p-6 cursor-pointer transition-all duration-200 hover:border-yellow-400 hover:bg-yellow-900/10 transform hover:scale-105"
              style={{ background: 'var(--newspaper-bg)' }}
              onClick={() => handlePlayerSelect(candidate.id)}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div 
                  className="w-16 h-16 rounded-full border-4 border-slate-800"
                  style={{ backgroundColor: candidate.colour }}
                ></div>
                <div className="flex-1">
                  <h3 className="newspaper-header text-xl font-bold text-slate-900">{candidate.party}</h3>
                  <p className="text-slate-700 font-medium">Led by {candidate.name}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-slate-600 mb-2 font-mono">
                  CURRENT SUPPORT: {candidate.party_pop >= 1 ? `${candidate.party_pop.toFixed(1)}%` : `${(candidate.party_pop * 100).toFixed(1)}%`}
                </div>
                <div className="w-full bg-slate-300 rounded-full h-3 border border-slate-400">
                  <div 
                    className="h-3 rounded-full relative overflow-hidden"
                    style={{ 
                      backgroundColor: candidate.colour,
                      width: `${Math.max(5, Math.min(100, candidate.party_pop > 1 ? candidate.party_pop * 2 : candidate.party_pop * 200))}%`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <h4 className="campaign-status font-bold text-slate-800 border-b border-slate-400 pb-1">POLITICAL PROFILE:</h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="flex justify-between bg-slate-200 p-2 rounded">
                    <span>SOCIAL:</span>
                    <span className={`font-bold ${candidate.vals[0] > 20 ? 'text-red-700' : candidate.vals[0] < -20 ? 'text-blue-700' : 'text-slate-700'}`}>
                      {candidate.vals[0] > 20 ? 'CONSERVATIVE' : candidate.vals[0] < -20 ? 'PROGRESSIVE' : 'MODERATE'}
                    </span>
                  </div>
                  <div className="flex justify-between bg-slate-200 p-2 rounded">
                    <span>ECONOMIC:</span>
                    <span className={`font-bold ${candidate.vals[3] > 20 ? 'text-green-700' : candidate.vals[3] < -20 ? 'text-red-700' : 'text-slate-700'}`}>
                      {candidate.vals[3] > 20 ? 'CAPITALIST' : candidate.vals[3] < -20 ? 'SOCIALIST' : 'MIXED'}
                    </span>
                  </div>
                  <div className="flex justify-between bg-slate-200 p-2 rounded">
                    <span>FOREIGN:</span>
                    <span className={`font-bold ${candidate.vals[1] > 20 ? 'text-blue-700' : candidate.vals[1] < -20 ? 'text-red-700' : 'text-slate-700'}`}>
                      {candidate.vals[1] > 20 ? 'GLOBALIST' : candidate.vals[1] < -20 ? 'NATIONALIST' : 'BALANCED'}
                    </span>
                  </div>
                  <div className="flex justify-between bg-slate-200 p-2 rounded">
                    <span>ENVIRONMENT:</span>
                    <span className={`font-bold ${candidate.vals[2] < -20 ? 'text-green-700' : candidate.vals[2] > 20 ? 'text-amber-700' : 'text-slate-700'}`}>
                      {candidate.vals[2] < -20 ? 'GREEN' : candidate.vals[2] > 20 ? 'PRO-BUSINESS' : 'MODERATE'}
                    </span>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status">
                🚀 CAMPAIGN AS {candidate.party.toUpperCase()}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => actions.resetGame()}
            className="px-8 py-4 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status"
          >
            ◄ RETURN TO SETUP
          </button>
        </div>
      </div>
    </div>
  );
}
