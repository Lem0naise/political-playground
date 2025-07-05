'use client';

import { useGame } from '@/contexts/GameContext';
import { formatVotes } from '@/lib/gameEngine';

export default function ResultsView() {
  const { state, actions } = useGame();

  if (state.pollResults.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center px-4">
        <div className="text-white text-center">
          <h1 className="text-2xl sm:text-4xl font-bold mb-4">No Results Available</h1>
          <button
            onClick={actions.resetGame}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
          >
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
  const totalVotes = state.pollResults.reduce((sum, result) => sum + result.votes, 0);
  const turnout = totalVotes > 0 ? ((totalVotes / state.countryData.pop) * 100) : 0;
  
  const winner = sortedResults[0];
  const playerResult = sortedResults.find(r => r.candidate.is_player);
  const playerPosition = sortedResults.findIndex(r => r.candidate.is_player) + 1;
  const playerWon = playerResult?.candidate === winner.candidate;

  // Calculate campaign changes from initial poll
  const campaignChanges = sortedResults.map(result => {
    const initialPercentage = state.initialPollResults[result.candidate.party] || result.percentage;
    return {
      ...result,
      campaignChange: result.percentage - initialPercentage
    };
  });

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">FINAL ELECTION RESULTS</h1>
          <h2 className="text-xl sm:text-2xl mb-2">{state.country.toUpperCase()}</h2>
          <p className="text-base sm:text-lg text-blue-200">Election Day - All Votes Counted</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Winner Announcement */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-900 mb-3 sm:mb-4">
            ELECTION WINNER
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div 
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0"
              style={{ backgroundColor: winner.candidate.colour }}
            ></div>
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-900">{winner.candidate.party}</h3>
              <p className="text-base sm:text-lg text-yellow-800">Led by {winner.candidate.name}</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-900">{winner.percentage.toFixed(1)}% of the vote</p>
            </div>
          </div>
        </div>

        {/* Player Performance */}
        {playerResult && (
          <div className={`rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 ${
            playerWon 
              ? 'bg-gradient-to-r from-green-600 to-green-500' 
              : playerPosition <= 3 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                : 'bg-gradient-to-r from-gray-600 to-gray-500'
          }`}>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              {playerWon ? 'CONGRATULATIONS!' : playerPosition <= 3 ? 'Good Campaign!' : 'Better Luck Next Time'}
            </h2>
            <div className="text-base sm:text-lg">
              {playerWon 
                ? `You won the election as ${playerResult.candidate.party}!`
                : `You finished in ${playerPosition}${getOrdinalSuffix(playerPosition)} place as ${playerResult.candidate.party}.`
              }
            </div>
            <div className="text-sm sm:text-base mt-2">
              Final result: {playerResult.percentage.toFixed(1)}% of the vote
            </div>
          </div>
        )}

        {/* Full Results Table */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gray-800 text-white px-4 sm:px-6 py-3 sm:py-4">
            <h2 className="text-lg sm:text-xl font-bold">Complete Election Results</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr className="text-gray-700">
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-sm sm:text-base">#</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-sm sm:text-base">Party</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-sm sm:text-base hidden sm:table-cell">Leader</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-sm sm:text-base">%</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-sm sm:text-base">Votes</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-sm sm:text-base">Change</th>
                </tr>
              </thead>
              <tbody>
                {campaignChanges.map((result, index) => {
                  const isPlayer = result.candidate.is_player;
                  const isWinner = index === 0;
                  
                  return (
                    <tr 
                      key={result.candidate.id}
                      className={`border-b ${
                        isPlayer ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <span className="font-bold text-gray-700 text-sm sm:text-base">{index + 1}</span>
                          {isWinner && <span className="text-yellow-500 text-xs sm:text-sm">⭐</span>}
                          {isPlayer && <span className="text-blue-500 text-xs sm:text-sm">👤</span>}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div 
                            className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
                            style={{ backgroundColor: result.candidate.colour }}
                          ></div>
                          <span className={`font-semibold text-xs sm:text-sm ${isPlayer ? 'text-blue-800' : 'text-gray-800'} truncate`}>
                            {result.candidate.party}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">
                        {result.candidate.name}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-bold text-gray-900 text-sm sm:text-base">
                        {result.percentage.toFixed(1)}%
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-gray-700 text-xs sm:text-sm">
                        {formatVotes(result.votes, state.countryData.scale)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <span className={`font-semibold text-xs sm:text-sm ${
                          result.campaignChange > 0.5 ? 'text-green-600' : 
                          result.campaignChange < -0.5 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {result.campaignChange > 0 ? '+' : ''}{result.campaignChange.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Election Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <div className="bg-white rounded-lg p-4 sm:p-6 text-gray-800">
            <h3 className="text-base sm:text-lg font-bold mb-2">Voter Turnout</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{turnout.toFixed(1)}%</p>
            <p className="text-xs sm:text-sm text-gray-600">
              {formatVotes(totalVotes, state.countryData.scale)} of {state.countryData.pop.toLocaleString()} voters
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 sm:p-6 text-gray-800">
            <h3 className="text-base sm:text-lg font-bold mb-2">Campaign Length</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{state.totalPolls}</p>
            <p className="text-xs sm:text-sm text-gray-600">weeks of campaigning</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 sm:p-6 text-gray-800">
            <h3 className="text-base sm:text-lg font-bold mb-2">Competing Parties</h3>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{state.candidates.length}</p>
            <p className="text-xs sm:text-sm text-gray-600">political parties</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center mt-6 sm:mt-8">
          <button
            onClick={actions.resetGame}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200"
          >
            Play Again
          </button>
        </div>

        <div className="text-center mt-6 sm:mt-8">
          <p className="text-gray-400 text-xs sm:text-sm px-4">
            Thanks for playing! Change from initial polling is calculated from Poll 2 baseline.
          </p>
        </div>
      </div>
    </div>
  );
}
