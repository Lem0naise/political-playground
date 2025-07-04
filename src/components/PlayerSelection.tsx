'use client';

import { useGame } from '@/contexts/GameContext';

export default function PlayerSelection() {
  const { state, actions } = useGame();

  const handlePlayerSelect = (candidateId: number) => {
    actions.setPlayerCandidate(candidateId);
    actions.startCampaign();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Party
          </h1>
          <p className="text-lg text-purple-200">
            Select which party you want to lead to victory in {state.country}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {state.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:transform hover:scale-105"
              onClick={() => handlePlayerSelect(candidate.id)}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: candidate.colour }}
                ></div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{candidate.party}</h3>
                  <p className="text-gray-600">Led by {candidate.name}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  Current Support: {candidate.party_pop >= 1 ? `${candidate.party_pop.toFixed(1)}%` : `${(candidate.party_pop * 100).toFixed(1)}%`}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: candidate.colour,
                      width: `${Math.max(5, Math.min(100, candidate.party_pop > 1 ? candidate.party_pop * 2 : candidate.party_pop * 200))}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <h4 className="font-semibold text-gray-800">Political Positions:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Social:</span>
                    <span className={candidate.vals[0] > 20 ? 'text-red-600' : candidate.vals[0] < -20 ? 'text-blue-600' : 'text-gray-600'}>
                      {candidate.vals[0] > 20 ? 'Conservative' : candidate.vals[0] < -20 ? 'Progressive' : 'Moderate'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Economic:</span>
                    <span className={candidate.vals[3] > 20 ? 'text-green-600' : candidate.vals[3] < -20 ? 'text-red-600' : 'text-gray-600'}>
                      {candidate.vals[3] > 20 ? 'Capitalist' : candidate.vals[3] < -20 ? 'Socialist' : 'Mixed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Foreign:</span>
                    <span className={candidate.vals[1] > 20 ? 'text-blue-600' : candidate.vals[1] < -20 ? 'text-red-600' : 'text-gray-600'}>
                      {candidate.vals[1] > 20 ? 'Globalist' : candidate.vals[1] < -20 ? 'Nationalist' : 'Balanced'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span className={candidate.vals[2] < -20 ? 'text-green-600' : candidate.vals[2] > 20 ? 'text-brown-600' : 'text-gray-600'}>
                      {candidate.vals[2] < -20 ? 'Green' : candidate.vals[2] > 20 ? 'Pro-Business' : 'Moderate'}
                    </span>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200">
                Play as {candidate.party}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => actions.resetGame()}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Back to Setup
          </button>
        </div>
      </div>
    </div>
  );
}
