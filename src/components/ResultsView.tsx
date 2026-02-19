import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { formatVotes } from '@/lib/gameEngine';
import { VALUES } from '@/types/game';
import { DESCRIPTORS, getIdeologyProfile } from '@/lib/ideologyProfiler';
import { CABINET_POSITIONS } from '@/types/game';
import CabinetView from './CabinetView';
import PollingGraphModal from './PollingGraphModal';

export default function ResultsView() {
  const { state, actions } = useGame();
  const [showPollingGraph, setShowPollingGraph] = useState(false);

  if (state.pollResults.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
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

  const needsCoalition = winner.percentage <= 50;
  const canViewPollingGraph = state.pollingHistory.length > 0;

  const campaignChanges = sortedResults.map(result => {
    const initialPercentage = state.initialPollResults[result.candidate.party] || result.percentage;
    return {
      ...result,
      campaignChange: result.percentage - initialPercentage
    };
  });

  const coalitionComplete = state.coalitionState && state.coalitionState.negotiationPhase === 'complete';

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 sm:p-6 text-center">
          <h1 className="campaign-status text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-2">
            FINAL ELECTION RESULTS
          </h1>
          <h2 className="text-lg sm:text-xl text-white mb-1">{state.country.toUpperCase()}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-300 mt-2">
            <span>TURNOUT: <span className="text-green-400 font-bold">{turnout.toFixed(1)}%</span></span>
            <span>•</span>
            <span>{formatVotes(totalVotes, state.countryData.scale)} VOTES CAST</span>
          </div>
        </div>

        {/* Winner Announcement */}
        <div className={`bg-slate-800 border rounded-lg p-4 sm:p-6 ${needsCoalition ? 'border-orange-500' : 'border-yellow-500'
          }`}>
          <div className="text-center">
            <h2 className={`campaign-status text-xl sm:text-2xl font-bold mb-3 ${needsCoalition ? 'text-orange-400' : 'text-yellow-400'
              }`}>
              {coalitionComplete ? 'COALITION GOVERNMENT' : needsCoalition ? 'HUNG PARLIAMENT' : 'ELECTION WINNER'}
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div
                className="w-16 h-16 rounded-full border-2 border-white"
                style={{ backgroundColor: winner.candidate.colour }}
              ></div>
              <div className="text-center sm:text-left">
                <div className={`text-2xl font-bold ${needsCoalition ? 'text-orange-400' : 'text-yellow-400'}`}>
                  {winner.candidate.party}
                </div>
                <div className="text-slate-300">{winner.candidate.name}</div>
                <div className="text-lg font-bold text-white">{winner.percentage.toFixed(1)}% of vote</div>
              </div>
            </div>
            {!coalitionComplete && needsCoalition && (
              <p className="text-orange-400 text-sm mt-2">Coalition needed to form government</p>
            )}
          </div>

          {/* Coalition Partners */}
          {coalitionComplete && state.coalitionState && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {state.coalitionState.coalitionPartners.map((partner, idx) => {
                  const result = sortedResults.find(r => r.candidate.id === partner.id);
                  return (
                    <div key={partner.id} className="bg-slate-700/50 border border-slate-600 rounded p-2 flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border border-white"
                        style={{ backgroundColor: partner.colour }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white truncate">{partner.party}</div>
                        <div className="text-xs text-slate-300">
                          {result?.percentage.toFixed(1)}%
                          {idx === 0 && ' (Lead)'}
                          {partner.is_player && ' (You)'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coalition Ideology Descriptor */}
              {(() => {
                // Calculate average ideology of coalition
                const coalitionValues: number[] = new Array(VALUES.length).fill(0);
                let totalWeight = 0;

                state.coalitionState.coalitionPartners.forEach(partner => {
                  const result = sortedResults.find(r => r.candidate.id === partner.id);
                  const weight = result?.percentage || 0;
                  totalWeight += weight;

                  VALUES.forEach((_, index) => {
                    coalitionValues[index] += (partner.vals[index] || 50) * weight;
                  });
                });

                // Normalize by total weight
                VALUES.forEach((_, index) => {
                  coalitionValues[index] = coalitionValues[index] / totalWeight;
                });

                return (
                  <div className="mt-3 p-2 bg-slate-700/30 border border-slate-600 rounded">
                    <div className="text-xs text-slate-400 mb-1">Coalition Ideology:</div>
                    {getIdeologyProfile(coalitionValues)}
                  </div>
                );
              })()}

              <CabinetView
                cabinetAllocations={state.coalitionState.cabinetAllocations}
                winningParty={sortedResults[0].candidate}
                candidates={state.candidates}
              />
            </div>
          )}
        </div>

        {/* Player Performance */}
        {playerResult && (
          <div className={`bg-slate-800 border rounded-lg p-4 ${playerWon
            ? 'border-green-500'
            : playerPosition <= 3
              ? 'border-blue-500'
              : 'border-slate-600'
            }`}>
            <h3 className={`campaign-status text-lg font-bold mb-2 ${playerWon ? 'text-green-400' : playerPosition <= 3 ? 'text-blue-400' : 'text-slate-400'
              }`}>
              {playerWon ? 'VICTORY!' : playerPosition <= 3 ? 'STRONG CAMPAIGN' : 'CAMPAIGN COMPLETE'}
            </h3>
            <div className="text-sm text-slate-300">
              {playerWon
                ? `You won as ${playerResult.candidate.party}!`
                : `You finished ${playerPosition}${getOrdinalSuffix(playerPosition)} as ${playerResult.candidate.party}`
              }
            </div>
            {canViewPollingGraph && (
              <button
                onClick={() => setShowPollingGraph(true)}
                className="mt-2 text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded transition-colors"
              >
                View Polling Graph
              </button>
            )}
          </div>
        )}

        {/* Main Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Final Results */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
            <h3 className="campaign-status text-sm sm:text-base font-bold text-yellow-400 mb-3">
              FINAL STANDINGS
            </h3>
            <div className="space-y-1">
              {sortedResults.map((result, index) => {
                const initialPct = state.initialPollResults[result.candidate.party] || result.percentage;
                const change = result.percentage - initialPct;

                return (
                  <div
                    key={result.candidate.id}
                    className={`p-2 rounded border ${result.candidate.is_player
                      ? 'border-yellow-500 bg-yellow-900/20'
                      : 'border-slate-600 bg-slate-700/30'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-400 w-2">{index + 1}</span>
                      <div
                        className="w-4 h-4 rounded-full border border-white flex-shrink-0"
                        style={{ backgroundColor: result.candidate.colour }}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold ${result.candidate.is_player ? 'text-yellow-400' : 'text-white'
                          }`}>
                          {result.candidate.party}
                          {result.candidate.is_player && ' ◄'}
                        </div>

                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-400 font-mono">
                          {formatVotes(result.votes, state.countryData.scale)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {Math.abs(change) > 0.1 ? (
                          <div className={`text-xs font-bold ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)}%
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">—</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campaign Analysis - Winners/Losers */}
          {state.postElectionStats && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
              <h3 className="campaign-status text-sm sm:text-base font-bold text-yellow-400 mb-3">
                CAMPAIGN SWINGS
              </h3>
              <div className="space-y-3">

                {/* Winners */}
                {state.postElectionStats.partySwings.filter(s => s.swing > 0).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-green-400 mb-1.5">BIGGEST WINNERS</h4>
                    <div className="space-y-1">
                      {state.postElectionStats.partySwings
                        .filter(swing => swing.swing > 0)
                        .sort((a, b) => b.swing - a.swing)
                        .slice(0, 5)
                        .map((swing) => {
                          const candidate = state.candidates.find(c => c.party === swing.party);
                          return (
                            <div key={swing.party} className="flex items-center justify-between bg-slate-700/30 rounded p-1.5">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-3 h-3 rounded-full border border-white flex-shrink-0"
                                  style={{ backgroundColor: candidate?.colour || '#888' }}
                                ></div>
                                <span className="text-xs text-white truncate">{swing.party}</span>
                              </div>
                              <span className="text-xs text-slate-400 ml-0">   {swing.initialPercentage.toFixed(1)}% → {swing.finalPercentage.toFixed(1)}%</span>
                              <span className="text-xs font-bold text-green-400 ml-5">+{swing.swing.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Losers */}
                {state.postElectionStats.partySwings.filter(s => s.swing < 0).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-red-400 mb-1.5">BIGGEST LOSERS</h4>
                    <div className="space-y-1">
                      {state.postElectionStats.partySwings
                        .filter(swing => swing.swing < 0)
                        .sort((a, b) => a.swing - b.swing)
                        .slice(0, 5)
                        .map((swing) => {
                          const candidate = state.candidates.find(c => c.party === swing.party);
                          return (
                            <div key={swing.party} className="flex items-center justify-between bg-slate-700/30 rounded p-1.5">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-3 h-3 rounded-full border border-white flex-shrink-0"
                                  style={{ backgroundColor: candidate?.colour || '#888' }}
                                ></div>
                                <span className="text-xs text-white truncate">{swing.party}</span>
                              </div>
                              <span className="text-xs text-slate-400 ml-0">   {swing.initialPercentage.toFixed(1)}% → {swing.finalPercentage.toFixed(1)}%</span>

                              <span className="text-xs font-bold text-red-400 ml-5">{swing.swing.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Analysis Sections */}
        {state.postElectionStats && state.blocStats && (
          <div className="space-y-4">

            {/* Party Performance by Voter Bloc */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
              <h3 className="campaign-status text-sm sm:text-base font-bold text-blue-400 mb-3">
                PARTY PERFORMANCE BY VOTER BLOC
              </h3>
              <div className="space-y-3">
                {sortedResults.slice(0, 6).map((result) => {
                  const candidate = result.candidate;
                  const support = state.postElectionStats?.partyBlocSupport.find(s => s.party === candidate.party);

                  if (!support) return null;

                  return (
                    <div key={candidate.party} className="bg-slate-700/30 border border-slate-600 rounded-lg p-2 sm:p-3">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                        <div
                          className="w-4 h-4 rounded-full border border-white"
                          style={{ backgroundColor: candidate.colour }}
                        ></div>
                        <span className="font-bold text-sm text-white">{candidate.party}</span>
                        <span className="text-xs text-slate-400">({result.percentage.toFixed(1)}% overall)</span>
                      </div>

                      <div className="space-y-1">
                        {state.blocStats
                          ?.sort((a, b) => {
                            const aPercentage = a.percentages[candidate.party] || 0;
                            const bPercentage = b.percentages[candidate.party] || 0;
                            return bPercentage - aPercentage;
                          })
                          .map((bloc) => {
                            const percentage = bloc.percentages[candidate.party] || 0;
                            if (percentage < 0.1) return null;

                            return (
                              <div key={bloc.blocId} className="flex items-center gap-2">
                                <div className="text-xs text-slate-400 w-20 sm:w-28 truncate">
                                  {bloc.blocName}
                                </div>

                                <div className="flex-1 bg-slate-600 rounded-full h-4 relative overflow-hidden">
                                  <div
                                    className="h-4 rounded-full transition-all duration-500"
                                    style={{
                                      backgroundColor: candidate.colour,
                                      width: `${Math.max(2, percentage)}%`
                                    }}
                                  ></div>
                                </div>

                                <div className="text-xs text-slate-200 w-12 text-right font-mono">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voter Bloc Performance by Party */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
              <h3 className="campaign-status text-sm sm:text-base font-bold text-blue-400 mb-3">
                VOTER BLOC BREAKDOWN
              </h3>
              <div className="space-y-3">
                {state.blocStats
                  ?.sort((a, b) => b.weight - a.weight)
                  .map((bloc) => {
                    const blocPopulation = Math.round(state.countryData.pop * bloc.weight);

                    return (
                      <div key={bloc.blocId} className="bg-slate-700/30 border border-slate-600 rounded-lg p-2 sm:p-3">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-600">
                          <div>
                            <span className="font-bold text-sm text-white">{bloc.blocName}</span>
                            <div className="text-xs text-slate-400">
                              {(bloc.weight * 100).toFixed(1)}% • {formatVotes(blocPopulation, state.countryData.scale)} voters
                            </div>
                          </div>
                          <div className="text-xs text-slate-300">
                            {(bloc.turnout * 100).toFixed(1)}% turnout
                          </div>
                        </div>

                        <div className="space-y-1">
                          {Object.entries(bloc.percentages)
                            .sort(([, a], [, b]) => b - a)
                            .map(([party, pct]) => {
                              const candidate = sortedResults.find(r => r.candidate.party === party);
                              if (!candidate || pct < 0.5) return null;

                              return (
                                <div key={party} className="flex items-center gap-2">
                                  <div className="text-xs text-slate-400 w-20 sm:w-28 truncate">{party}</div>

                                  <div className="flex-1 bg-slate-600 rounded-full h-4 relative overflow-hidden">
                                    <div
                                      className="h-4 rounded-full transition-all duration-500"
                                      style={{
                                        backgroundColor: candidate.candidate.colour,
                                        width: `${Math.max(2, pct)}%`
                                      }}
                                    ></div>
                                  </div>

                                  <div className="text-xs text-slate-200 w-12 text-right font-mono">
                                    {pct.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Bloc Swings */}
            {state.postElectionStats.blocSwings.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
                <h3 className="campaign-status text-sm sm:text-base font-bold text-purple-400 mb-3">
                  BIGGEST VOTER BLOC SHIFTS
                </h3>
                <div className="space-y-2">
                  {state.postElectionStats.blocSwings.slice(0, 5).map((swing, idx) => {
                    const candidate = state.candidates.find(c => c.party === swing.party);
                    return (
                      <div
                        key={`${swing.blocId}-${swing.party}`}
                        className="bg-slate-700/30 border border-slate-600 rounded p-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-green-400">#{idx + 1}</span>
                            <span className="text-sm font-bold text-blue-400">{swing.blocName}</span>
                          </div>
                          <div className={`text-sm font-bold ${swing.swing > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {swing.swing > 0 ? '+' : ''}{swing.swing.toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border border-white"
                              style={{ backgroundColor: candidate?.colour || '#888' }}
                            ></div>
                            <span className="text-slate-300">{swing.party}</span>
                          </div>
                          <span className="text-slate-400">
                            {swing.initialPercentage.toFixed(1)}% → {swing.finalPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Turnout Changes */}
            {(state.postElectionStats.biggestTurnoutIncrease || state.postElectionStats.biggestTurnoutDecrease) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {state.postElectionStats.biggestTurnoutIncrease && (
                  <div className="bg-slate-800 border border-green-600 rounded-lg p-3">
                    <h4 className="text-sm font-bold text-green-400 mb-2">
                      BIGGEST TURNOUT INCREASE
                    </h4>
                    <div className="text-white font-bold mb-1">
                      {state.postElectionStats.biggestTurnoutIncrease.blocName}
                    </div>
                    <div className="text-xs text-slate-300 mb-1">
                      {(state.postElectionStats.biggestTurnoutIncrease.initialTurnout * 100).toFixed(1)}% → {(state.postElectionStats.biggestTurnoutIncrease.finalTurnout * 100).toFixed(1)}%
                    </div>
                    <div className="text-lg font-bold text-green-400">
                      +{(state.postElectionStats.biggestTurnoutIncrease.increase * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
                {state.postElectionStats.biggestTurnoutDecrease && (
                  <div className="bg-slate-800 border border-red-600 rounded-lg p-3">
                    <h4 className="text-sm font-bold text-red-400 mb-2">
                      BIGGEST TURNOUT DECREASE
                    </h4>
                    <div className="text-white font-bold mb-1">
                      {state.postElectionStats.biggestTurnoutDecrease.blocName}
                    </div>
                    <div className="text-xs text-slate-300 mb-1">
                      {(state.postElectionStats.biggestTurnoutDecrease.initialTurnout * 100).toFixed(1)}% → {(state.postElectionStats.biggestTurnoutDecrease.finalTurnout * 100).toFixed(1)}%
                    </div>
                    <div className="text-lg font-bold text-red-400">
                      -{(state.postElectionStats.biggestTurnoutDecrease.decrease * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Voter Transfer Flows */}
            {state.postElectionStats?.voterTransfers && state.postElectionStats.voterTransfers.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
                <h3 className="campaign-status text-sm sm:text-base font-bold text-amber-400 mb-1">
                  VOTER TRANSFER FLOWS
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Significant voter movements from the start to the end of the campaign (≥2% of electorate).
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-1 pr-2 text-slate-400 font-semibold">FROM</th>
                        <th className="text-left py-1 px-2 text-slate-400 font-semibold">TO</th>
                        <th className="text-right py-1 pl-2 text-slate-400 font-semibold">SHARE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {state.postElectionStats.voterTransfers.slice(0, 12).map((t, i) => {
                        const fromCandidate = state.candidates.find(c => c.party === t.from);
                        const toCandidate = state.candidates.find(c => c.party === t.to);
                        const isSwitched = t.from !== t.to;
                        return (
                          <tr key={i} className={isSwitched ? 'bg-amber-900/10' : ''}>
                            <td className="py-1.5 pr-2">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-2.5 h-2.5 rounded-full border border-white/50 flex-shrink-0"
                                  style={{ backgroundColor: fromCandidate?.colour || '#888' }}
                                />
                                <span className={`truncate max-w-[7rem] font-medium ${isSwitched ? 'text-slate-300' : 'text-slate-400'
                                  }`}>{t.from}</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-2">
                              <div className="flex items-center gap-1.5">
                                {isSwitched && <span className="text-amber-400 font-bold">→</span>}
                                {!isSwitched && <span className="text-slate-600">→</span>}
                                <div
                                  className="w-2.5 h-2.5 rounded-full border border-white/50 flex-shrink-0"
                                  style={{ backgroundColor: toCandidate?.colour || '#888' }}
                                />
                                <span className={`truncate max-w-[7rem] font-medium ${isSwitched ? 'text-amber-300' : 'text-slate-400'
                                  }`}>{t.to}</span>
                              </div>
                            </td>
                            <td className="py-1.5 pl-2 text-right">
                              <span className={`font-mono font-bold ${isSwitched ? 'text-amber-400' : 'text-slate-500'
                                }`}>
                                {t.percentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4">
          {(needsCoalition && !coalitionComplete) && (
            <button
              onClick={actions.startCoalitionFormation}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 border border-orange-500 text-white font-bold rounded-lg transition-colors"
            >
              Form Coalition Government
            </button>
          )}
          <button
            onClick={actions.resetGame}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white font-bold rounded-lg transition-colors"
          >
            Play Again
          </button>
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