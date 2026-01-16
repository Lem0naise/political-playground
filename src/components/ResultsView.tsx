import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { formatVotes } from '@/lib/gameEngine';
import { VALUES } from '@/types/game';
import { DESCRIPTORS, getIdeologyProfile } from '@/lib/ideologyProfiler';
import { CABINET_POSITIONS } from '@/types/game'; // <-- Add this import
import CabinetView from './CabinetView';
import PollingGraphModal from './PollingGraphModal';

export default function ResultsView() {
  const { state, actions } = useGame();
  const [showPollingGraph, setShowPollingGraph] = useState(false);

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
  
  // Check if coalition is needed
  const needsCoalition = winner.percentage <= 50;
  const canViewPollingGraph = state.pollingHistory.length > 0;

  // Calculate campaign changes from initial poll
  const campaignChanges = sortedResults.map(result => {
    const initialPercentage = state.initialPollResults[result.candidate.party] || result.percentage;
    return {
      ...result,
      campaignChange: result.percentage - initialPercentage
    };
  });

  // Government ideology calculation
  let governmentIdeology: number[] = [];
  let governmentDescriptors: { [key: string]: string | null } = {};

  // If coalitionState exists and is complete, use coalition partners and cabinet allocations; else use winner only
  const coalitionComplete = state.coalitionState && state.coalitionState.negotiationPhase === 'complete';
  const governmentPartners = coalitionComplete
    ? state.coalitionState?.coalitionPartners ?? []
    : [winner.candidate];

  // Debug: log coalition state and partners
  console.log('DEBUG coalitionState:', state.coalitionState);
  console.log('DEBUG coalitionComplete:', coalitionComplete);
  console.log('DEBUG governmentPartners:', governmentPartners);

  if (governmentPartners.length > 0) {
    // Cabinet-weighted ideology calculation if coalition is complete
    if (coalitionComplete) {
      // Calculate total importance for each party in coalition
      const allocations = state.coalitionState?.cabinetAllocations || {};
      const partyImportance: Record<string, number> = {};
      let totalImportance = 0;

      // Assign importance for each party based on cabinet posts
      for (const [position, parties] of Object.entries(allocations)) {
        const importance = CABINET_POSITIONS[position]?.importance || 10;
        parties.forEach(partyName => {
          const partner = governmentPartners.find(p => p.party === partyName);
          if (partner) {
            partyImportance[partner.id] = (partyImportance[partner.id] || 0) + importance;
            totalImportance += importance;
          }
        });
      }
      // Debug: log cabinet allocations and importance
      console.log('DEBUG cabinetAllocations:', allocations);
      console.log('DEBUG partyImportance:', partyImportance, 'totalImportance:', totalImportance);

      // Fallback: if no posts allocated, treat all partners equally
      if (totalImportance === 0) {
        governmentIdeology = VALUES.map((_, idx) => {
          const sum = governmentPartners.reduce((acc, partner) => acc + (partner.vals?.[idx] ?? 0), 0);
          return sum / governmentPartners.length;
        });
        console.log('DEBUG fallback governmentIdeology:', governmentIdeology);
      } else {
        // Weighted average
        governmentIdeology = VALUES.map((_, idx) => {
          let sum = 0;
          governmentPartners.forEach(partner => {
            const weight = partyImportance[partner.id] || 0;
            sum += (partner.vals?.[idx] ?? 0) * (weight / totalImportance);
          });
          return sum;
        });
        console.log('DEBUG weighted governmentIdeology:', governmentIdeology);
      }
    } else {
      // No coalition or not complete: average each value across government partners
      governmentIdeology = VALUES.map((_, idx) => {
        const sum = governmentPartners.reduce((acc, partner) => acc + (partner.vals?.[idx] ?? 0), 0);
        return sum / governmentPartners.length;
      });
      console.log('DEBUG simple average governmentIdeology:', governmentIdeology);
    }

    // Map to descriptors
    governmentDescriptors = {};
    VALUES.forEach((key, idx) => {
      const val = governmentIdeology[idx];
      const descMap = DESCRIPTORS[key];
      let best: string | null = null;
      let bestKey: number | null = null;
      for (const k in descMap) {
        if (descMap[k]) {
          const numK = Number(k);
          if (bestKey === null || Math.abs(val - numK) < Math.abs(val - bestKey)) {
            bestKey = numK;
            best = descMap[k];
          }
        }
      }
      governmentDescriptors[key] = best;
    });
    // Debug: log descriptors
    console.log('DEBUG governmentDescriptors:', governmentDescriptors);
  }

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  return (
    <div className="min-h-screen bg-black text-[var(--foreground)]">
      {/* Header */}
      <div className="bg-[var(--ink-black)] py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 newspaper-header text-white">FINAL ELECTION RESULTS</h1>
          <h2 className="text-xl sm:text-2xl mb-2 text-white">{state.country.toUpperCase()}</h2>
          <p className="text-base sm:text-lg text-blue-200">Election Day - All Votes Counted</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Winner Announcement */}
        <div className="rounded-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-center newspaper-header bg-[var(--paper-cream)] vintage-border shadow-lg">
          <h2 className={`text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 ${
            needsCoalition ? 'text-orange-900' : 'text-yellow-900'
          }`}>
            {coalitionComplete
              ? 'COALITION GOVERNMENT FORMED'
              : needsCoalition
                ? 'HUNG PARLIAMENT'
                : 'ELECTION WINNER'}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            
            <div 
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0 border-2 border-[var(--ink-black)]"
              style={{ backgroundColor: winner.candidate.colour }}
            ></div>
            <div className="text-center sm:text-left">
              <h3 className={`text-xl sm:text-2xl font-bold ${
                needsCoalition ? 'text-orange-900' : 'text-yellow-900'
              }`}>{winner.candidate.party}</h3>
              <p className={`text-base sm:text-lg ${
                needsCoalition ? 'text-orange-800' : 'text-yellow-800'
              }`}>Led by {winner.candidate.name}</p>
              <p className={`text-lg sm:text-xl font-bold ${
                needsCoalition ? 'text-orange-900' : 'text-yellow-900'
              }`}>{winner.percentage.toFixed(1)}% of the vote</p>
              {!coalitionComplete && needsCoalition && (
                <p className="text-orange-800 text-sm mt-1">Coalition needed to govern</p>
              )}
            </div>
          </div>
          {/* Coalition Government Block */}
        {(coalitionComplete || !needsCoalition) && (
          <div className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 mt-4 bg-[var(--newspaper-bg)] border border-[var(--ink-black)] shadow newspaper-header">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[var(--ink-black)]">
              {coalitionComplete ? "Coalition Government" : ""}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 font-mono">
              {state.coalitionState?.coalitionPartners.map((partner, idx) => {
                const result = sortedResults.find(r => r.candidate.id === partner.id);
                return (
                  <div key={partner.id} className="flex items-center space-x-3 p-3 bg-slate-100 border border-slate-300 rounded-lg">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-slate-600"
                      style={{ backgroundColor: partner.colour }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{partner.party}</div>
                      <div className="text-sm text-slate-700">{partner.name}</div>
                      <div className="text-xs text-slate-600">
                        {result?.percentage.toFixed(1)}% of vote
                        {idx === 0 && ' (Lead Party)'}
                        {partner.is_player && ' (You)'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mb-8 text-base sm:text-lg font-semibold">
                  {getIdeologyProfile(governmentIdeology)}
            </div>
            {state.coalitionState && (<CabinetView
              cabinetAllocations={state.coalitionState.cabinetAllocations}
              winningParty={sortedResults[0].candidate}
              candidates={state.candidates}
            />)}
          </div>
        )}

        </div>

        {/* Player Performance */}
        {playerResult && (
          <div className={`rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 newspaper-header shadow-lg vintage-border ${
            playerWon 
              ? 'bg-gradient-to-r from-green-100 to-green-50' 
              : playerPosition <= 3 
                ? 'bg-gradient-to-r from-blue-100 to-blue-50'
                : 'bg-gradient-to-r from-gray-100 to-gray-50'
          }`}>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[var(--ink-black)]">
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
            {canViewPollingGraph && (
            <button
              onClick={() => setShowPollingGraph(true)}
              className="px-6 sm:px-8 py-2 mt-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors duration-200"
            >
              View Polling Graph
            </button>
          )}
          </div>
          
        )}

        {/* Full Results Table */}
        <div className="bg-[var(--ink-black)] rounded-lg shadow-2xl overflow-hidden vintage-border">
          <div className="bg-gray-800 text-white px-4 sm:px-6 py-3 sm:py-4 newspaper-header">
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
                        isPlayer ? 'bg-blue-50' : 'bg-[var(--paper-cream)] hover:bg-gray-200'
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <span className="font-bold text-gray-700 text-sm sm:text-base">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div 
                            className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex-shrink-0 border border-[var(--ink-black)]"
                            style={{ backgroundColor: result.candidate.colour }}
                          ></div>
                          <span className={`font-semibold text-xs sm:text-sm ${isPlayer ? 'text-blue-800' : 'text-gray-800'}`}>
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
          <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 text-[var(--ink-black)] vintage-border shadow">
            <h3 className="text-base sm:text-lg font-bold mb-2">Voter Turnout</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{turnout.toFixed(1)}%</p>
            <p className="text-xs sm:text-sm text-gray-600">
              {formatVotes(totalVotes, state.countryData.scale)} of {formatVotes(state.countryData.pop, state.countryData.scale)} voters
            </p>
          </div>
          
          <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 text-[var(--ink-black)] vintage-border shadow">
            <h3 className="text-base sm:text-lg font-bold mb-2">Campaign Length</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{state.totalPolls}</p>
            <p className="text-xs sm:text-sm text-gray-600">weeks of campaigning</p>
          </div>
          
          <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 text-[var(--ink-black)] vintage-border shadow">
            <h3 className="text-base sm:text-lg font-bold mb-2">Competing Parties</h3>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{state.candidates.length}</p>
            <p className="text-xs sm:text-sm text-gray-600">political parties</p>
          </div>
        </div>

        {/* Post-Election Statistics */}
        {state.postElectionStats && (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center newspaper-header">
              CAMPAIGN ANALYSIS
            </h2>

            {/* Biggest Winners and Losers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Biggest Winners */}
              <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 vintage-border shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-green-700 mb-4 newspaper-header">
                  BIGGEST WINNERS
                </h3>
                <div className="space-y-2">
                  {state.postElectionStats.partySwings
                    .filter(swing => swing.swing > 0)
                    .sort((a, b) => b.swing - a.swing)
                    .map((swing, idx) => {
                      const candidate = state.candidates.find(c => c.party === swing.party);
                      return (
                        <div 
                          key={swing.party}
                          className="flex items-center justify-between p-2 sm:p-3 bg-white rounded border border-slate-300"
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <span className="text-lg sm:text-xl font-bold text-slate-600">#{idx + 1}</span>
                            <div 
                              className="w-4 h-4 rounded-full border border-[var(--ink-black)]"
                              style={{ backgroundColor: candidate?.colour || '#888' }}
                            ></div>
                            <span className="font-bold text-sm sm:text-base text-[var(--ink-black)]">
                              {swing.party}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-bold text-green-600">
                              +{swing.swing.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">
                              {swing.initialPercentage.toFixed(1)}% → {swing.finalPercentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {state.postElectionStats.partySwings.filter(s => s.swing > 0).length === 0 && (
                    <p className="text-slate-500 text-sm italic">No parties gained support</p>
                  )}
                </div>
              </div>

              {/* Biggest Losers */}
              <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 vintage-border shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-red-700 mb-4 newspaper-header">
                  BIGGEST LOSERS
                </h3>
                <div className="space-y-2">
                  {state.postElectionStats.partySwings
                    .filter(swing => swing.swing < 0)
                    .sort((a, b) => a.swing - b.swing)
                    .map((swing, idx) => {
                      const candidate = state.candidates.find(c => c.party === swing.party);
                      return (
                        <div 
                          key={swing.party}
                          className="flex items-center justify-between p-2 sm:p-3 bg-white rounded border border-slate-300"
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <span className="text-lg sm:text-xl font-bold text-slate-600">#{idx + 1}</span>
                            <div 
                              className="w-4 h-4 rounded-full border border-[var(--ink-black)]"
                              style={{ backgroundColor: candidate?.colour || '#888' }}
                            ></div>
                            <span className="font-bold text-sm sm:text-base text-[var(--ink-black)]">
                              {swing.party}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-bold text-red-600">
                              {swing.swing.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">
                              {swing.initialPercentage.toFixed(1)}% → {swing.finalPercentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {state.postElectionStats.partySwings.filter(s => s.swing < 0).length === 0 && (
                    <p className="text-slate-500 text-sm italic">No parties lost support</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bloc Swings */}
            {state.postElectionStats.blocSwings.length > 0 && (
              <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 vintage-border shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--ink-black)] mb-4 newspaper-header">
                  BIGGEST VOTER BLOC SHIFTS
                </h3>
                <div className="space-y-2">
                  {state.postElectionStats.blocSwings.slice(0, 5).map((swing, idx) => {
                    const candidate = state.candidates.find(c => c.party === swing.party);
                    return (
                      <div 
                        key={`${swing.blocId}-${swing.party}`}
                        className="p-2 sm:p-3 bg-white rounded border border-slate-300"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg sm:text-xl font-bold text-slate-600">#{idx + 1}</span>
                            <span className="font-bold text-sm sm:text-base text-blue-700">
                              {swing.blocName}
                            </span>
                          </div>
                          <div className={`text-base sm:text-lg font-bold ${
                            swing.swing > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {swing.swing > 0 ? '+' : ''}{swing.swing.toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full border border-[var(--ink-black)]"
                              style={{ backgroundColor: candidate?.colour || '#888' }}
                            ></div>
                            <span className="text-slate-700">{swing.party}</span>
                          </div>
                          <span className="text-slate-500">
                            {swing.initialPercentage.toFixed(1)}% → {swing.finalPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Party Bloc Support - Detailed View */}
            {state.postElectionStats.partyBlocSupport.length > 0 && state.blocStats && (
              <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 vintage-border shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--ink-black)] mb-4 newspaper-header">
                  PARTY PERFORMANCE BY VOTER BLOC
                </h3>
                <div className="space-y-4">
                  {sortedResults.map((result) => {
                    const candidate = result.candidate;
                    const support = state.postElectionStats?.partyBlocSupport.find(s => s.party === candidate.party);
                    
                    // Skip if strongest and weakest are the same
                    if (!support || support.strongestBloc === support.weakestBloc) return null;
                    
                    return (
                      <div 
                        key={candidate.party}
                        className="bg-white rounded-lg border border-slate-300 p-3 sm:p-4"
                      >
                        <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-200">
                          <div 
                            className="w-5 h-5 rounded-full border-2 border-[var(--ink-black)]"
                            style={{ backgroundColor: candidate.colour }}
                          ></div>
                          <span className="font-bold text-base sm:text-lg text-[var(--ink-black)]">
                            {candidate.party}
                          </span>
                          <span className="text-sm text-slate-500">
                            ({result.percentage.toFixed(1)}% overall)
                          </span>
                        </div>
                        
                        {/* Bloc performance bars */}
                        <div className="space-y-1.5">
                          {state.blocStats
                            ?.sort((a, b) => {
                              const aPercentage = a.percentages[candidate.party] || 0;
                              const bPercentage = b.percentages[candidate.party] || 0;
                              return bPercentage - aPercentage;
                            })
                            .map((bloc) => {
                              const percentage = bloc.percentages[candidate.party] || 0;
                              if (percentage < 0.5) return null;
                              
                              const isStrongest = bloc.blocId === support.strongestBloc;
                              const isWeakest = bloc.blocId === support.weakestBloc;
                              
                              return (
                                <div key={bloc.blocId} className="flex items-center gap-2">
                                  <div className="text-xs text-slate-600 w-24 sm:w-32 truncate">
                                    {bloc.blocName}
                                  </div>
                                  
                                  <div className="flex-1 bg-slate-200 rounded-full h-5 relative">
                                    <div 
                                      className="h-5 rounded-full transition-all duration-500"
                                      style={{ 
                                        backgroundColor: candidate.colour,
                                        width: `${Math.max(2, percentage)}%`
                                      }}
                                    ></div>
                                  </div>
                                  
                                  <div className={`text-sm w-12 text-right font-bold ${
                                    isStrongest ? 'text-green-600' : isWeakest ? 'text-red-600' : 'text-slate-700'
                                  }`}>
                                    {percentage.toFixed(1)}%
                                  </div>
                                  
                                  {isStrongest && (
                                    <span className="text-xs text-green-600 font-bold w-16">BEST</span>
                                  )}
                                  {isWeakest && (
                                    <span className="text-xs text-red-600 font-bold w-16">WORST</span>
                                  )}
                                  {!isStrongest && !isWeakest && (
                                    <span className="w-16"></span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Turnout Changes */}
            {(state.postElectionStats.biggestTurnoutIncrease || state.postElectionStats.biggestTurnoutDecrease) && (
              <div className="bg-[var(--paper-cream)] rounded-lg p-4 sm:p-6 vintage-border shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--ink-black)] mb-4 newspaper-header">
                  TURNOUT CHANGES
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {state.postElectionStats.biggestTurnoutIncrease && (
                    <div className="bg-green-50 p-3 sm:p-4 rounded border border-green-200">
                      <div className="font-bold text-green-700 mb-2 text-sm sm:text-base">
                        Biggest Increase
                      </div>
                      <div className="text-slate-700 font-bold mb-1">
                        {state.postElectionStats.biggestTurnoutIncrease.blocName}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600">
                        {(state.postElectionStats.biggestTurnoutIncrease.initialTurnout * 100).toFixed(1)}% → {(state.postElectionStats.biggestTurnoutIncrease.finalTurnout * 100).toFixed(1)}%
                      </div>
                      <div className="text-green-600 font-bold text-base sm:text-lg">
                        +{(state.postElectionStats.biggestTurnoutIncrease.increase * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {state.postElectionStats.biggestTurnoutDecrease && (
                    <div className="bg-red-50 p-3 sm:p-4 rounded border border-red-200">
                      <div className="font-bold text-red-700 mb-2 text-sm sm:text-base">
                        Biggest Decrease
                      </div>
                      <div className="text-slate-700 font-bold mb-1">
                        {state.postElectionStats.biggestTurnoutDecrease.blocName}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600">
                        {(state.postElectionStats.biggestTurnoutDecrease.initialTurnout * 100).toFixed(1)}% → {(state.postElectionStats.biggestTurnoutDecrease.finalTurnout * 100).toFixed(1)}%
                      </div>
                      <div className="text-red-600 font-bold text-base sm:text-lg">
                        -{(state.postElectionStats.biggestTurnoutDecrease.decrease * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center mt-6 sm:mt-8 space-y-4">
          {(needsCoalition && !coalitionComplete) && (
            <button
              onClick={actions.startCoalitionFormation}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors duration-200 mr-4"
            >
              🏛️ Form Coalition Government
            </button>
          )}
          <button
            onClick={actions.resetGame}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200"
          >
            Play Again
          </button>
          
        </div>

        <div className="text-center mt-6 sm:mt-8">
          <p className="text-gray-400 text-xs sm:text-sm px-4 mb-4">
            Thanks for playing! Created by <a href="https://indigo.spot" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors">Indigo Nolan</a>. Check out some of my other projects!
          </p>
          
        </div>
      </div>
      {showPollingGraph && (
        <PollingGraphModal
          open={showPollingGraph}
          onClose={() => setShowPollingGraph(false)}
          history={state.pollingHistory}
          candidates={state.candidates}
        />
      )}
    </div>
  );
}