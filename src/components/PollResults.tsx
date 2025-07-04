'use client';

import { useGame } from '@/contexts/GameContext';
import { formatVotes } from '@/lib/gameEngine';

export default function PollResults() {
  const { state } = useGame();

  if (state.pollResults.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Polling</h2>
        <p className="text-gray-500">No polling data available yet. Start the campaign to see results.</p>
      </div>
    );
  }

  const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
  const totalVotes = state.pollResults.reduce((sum, result) => sum + result.votes, 0);
  const turnout = totalVotes > 0 ? ((totalVotes / state.countryData.pop) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        📊 Current Polling
        {state.currentPoll > 0 && (
          <span className="text-sm font-normal text-gray-600 ml-2">
            (Poll {state.currentPoll}/{state.totalPolls})
          </span>
        )}
      </h2>

      <div className="space-y-3 mb-6">
        {sortedResults.map((result, index) => {
          const isPlayer = result.candidate.is_player;
          const change = result.change || 0;
          
          return (
            <div
              key={result.candidate.id}
              className={`p-3 rounded-lg border-2 ${
                isPlayer 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-700">
                      {index + 1}.
                    </span>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: result.candidate.colour }}
                    ></div>
                  </div>
                  <div>
                    <div className={`font-semibold ${isPlayer ? 'text-blue-800' : 'text-gray-800'}`}>
                      {result.candidate.party}
                      {isPlayer && ' ◄ YOU'}
                      {index === 0 && ' ★'}
                    </div>
                    <div className="text-sm text-gray-600">{result.candidate.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">
                    {result.percentage.toFixed(1)}%
                  </div>
                  {Math.abs(change) > 0.05 && (
                    <div className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: result.candidate.colour,
                    width: `${Math.max(0.5, Math.min(100, result.percentage))}%`
                  }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                {formatVotes(result.votes, state.countryData.scale)} votes
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div>Estimated Turnout: {turnout.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatVotes(totalVotes, state.countryData.scale)} of {state.countryData.pop.toLocaleString()} voters
          </div>
        </div>
      </div>

      {state.currentPoll === 2 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            📈 Initial baseline established! Changes from this point will be tracked throughout the campaign.
          </p>
        </div>
      )}
    </div>
  );
}
