
import { useGame } from '@/contexts/GameContext';
import { formatVotes } from '@/lib/gameEngine';
import { getIdeologyDescriptors, getComparativeDescriptors } from '@/lib/ideologyProfiler';

interface PollResultsProps {
  onViewGraph: () => void;
  canViewGraph: boolean;
}

export default function PollResults({ onViewGraph, canViewGraph }: PollResultsProps) {
  const { state, actions } = useGame();

  if (state.pollResults.length === 0) {
    return (
      <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 sm:p-3 text-white relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400">
            POLLING STATUS
          </h2>
          <button
            type="button"
            className="text-[10px] sm:text-xs font-semibold text-slate-300 border border-slate-500 rounded px-2 py-1 opacity-60 cursor-not-allowed"
            disabled
          >
            View graph
          </button>
        </div>
        <p className="text-slate-300 font-mono text-xs">AWAITING DATA... START CAMPAIGN TO INITIALIZE POLLING</p>
      </div>
    );
  }

  const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
  const totalVotes = state.pollResults.reduce((sum, result) => sum + result.votes, 0);
  const turnout = totalVotes > 0 ? ((totalVotes / state.countryData.pop) * 100) : 0;

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 sm:p-3 text-white relative">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
        <h2 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400 flex items-center">
          LIVE POLLING DATA

        </h2>
        <button
          type="button"
          onClick={onViewGraph}
          disabled={!canViewGraph}
          className={`text-[10px] sm:text-xs font-semibold rounded px-2 py-1 border transition-colors ${canViewGraph
              ? 'border-slate-400 text-slate-100 hover:bg-slate-600/60'
              : 'border-slate-600 text-slate-400 opacity-60 cursor-not-allowed'
            }`}
        >
          View graph
        </button>
      </div>

      <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3">
        {sortedResults.map((result, index) => {
          const isPlayer = result.candidate.is_player;
          const change = result.change || 0;

          return (
            <div
              key={result.candidate.id}
              className={`p-1.5 sm:p-2 rounded-lg border relative overflow-hidden ${isPlayer
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
                      {state.incumbentGovernment?.includes(result.candidate.party) && (
                        <span className="ml-1.5 px-1 py-0.5 text-[8px] sm:text-[9px] bg-slate-600/50 text-slate-300 border border-slate-500 rounded align-middle" title="Incumbent Government">GOV</span>
                      )}
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
            <span>ESTIMATED TURNOUT:</span>
            <span className="text-green-400 font-bold">{turnout.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {formatVotes(totalVotes, state.countryData.scale)} OF {formatVotes(state.countryData.pop, state.countryData.scale)} REGISTERED
          </div>
        </div>
      </div>

      {/* Voter Bloc Analysis */}
      {state.blocStats && state.blocStats.length > 0 && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-600">
          <h3 className="campaign-status text-xs sm:text-sm font-bold text-blue-400 mb-2">
            VOTER BLOC ANALYSIS
          </h3>

          {/* Cooldown warning */}
          {state.targetingCooldownUntil !== null && state.targetingCooldownUntil !== undefined && state.currentPoll < state.targetingCooldownUntil && (
            <div className="mb-2 bg-red-900/30 border border-red-500 rounded p-2 text-xs text-red-300">
              {state.targetingCooldownUntil - state.currentPoll} weeks until your political analysts can target again.
            </div>
          )}

          <div className="space-y-2">
            {(() => {
              // Find the largest bloc weight to use as the scaling reference
              const maxBlocWeight = Math.max(...state.blocStats.map(b => b.weight));

              // Check if in cooldown
              const inCooldown = state.targetingCooldownUntil !== null &&
                state.targetingCooldownUntil !== undefined &&
                state.currentPoll < state.targetingCooldownUntil;

              return state.blocStats
                .sort((a, b) => (b.turnout * b.weight) - (a.turnout * a.weight)) // Sort by weight descending
                .map((bloc) => {
                  const leadingCandidate = sortedResults.find(r => r.candidate.party === bloc.leadingParty);
                  const leadingColor = leadingCandidate?.candidate.colour || '#888';
                  const blocPopulation = Math.round(state.countryData.pop * bloc.weight);

                  // Find previous bloc stats for this bloc
                  const previousBloc = state.previousBlocStats?.find(b => b.blocId === bloc.blocId);

                  // Turnout percentage and styling
                  const turnoutPct = bloc.turnout * 100;
                  const previousTurnoutPct = previousBloc ? previousBloc.turnout * 100 : turnoutPct;
                  const turnoutChange = turnoutPct - previousTurnoutPct;
                  const hasTurnoutChange = Math.abs(turnoutChange) > 0.5;
                  const turnoutColor = turnoutPct >= 70 ? 'text-green-400' :
                    turnoutPct >= 50 ? 'text-yellow-400' : 'text-red-400';

                  // Calculate proportional width relative to the largest bloc
                  const proportionalWidth = (bloc.weight / maxBlocWeight) * 100;

                  const isTargeted = state.targetedBlocId === bloc.blocId;

                  // Calculate weeks remaining if targeting this bloc
                  let weeksRemaining = 0;
                  if (isTargeted && state.targetingStartWeek !== null && state.targetingStartWeek !== undefined) {
                    const weeksTargeting = state.currentPoll - state.targetingStartWeek;
                    weeksRemaining = Math.max(0, 6 - weeksTargeting);
                  }

                  return (
                    <div
                      key={bloc.blocId}
                      className={`bg-slate-800/50 border rounded-lg p-2 ${isTargeted ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-slate-600'}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-xs text-white">
                              {bloc.blocName}
                            </div>
                            <button
                              onClick={() => actions.setTargetedBloc(isTargeted ? null : bloc.blocId)}
                              disabled={inCooldown && !isTargeted}
                              className={`text-xs px-1.5 py-0.5 rounded transition-all ${isTargeted
                                  ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-600 font-bold'
                                  : inCooldown
                                    ? 'bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed opacity-50'
                                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500'
                                }`}
                              title={
                                inCooldown && !isTargeted
                                  ? 'Targeting on cooldown'
                                  : isTargeted
                                    ? 'Stop targeting this bloc'
                                    : 'Target this voter bloc'
                              }
                            >
                              {isTargeted ? `✓ ${weeksRemaining}W LEFT` : '+ TARGET'}
                            </button>
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {(bloc.weight * 100).toFixed(1)}% of electorate • {formatVotes(blocPopulation, state.countryData.scale)} voters
                          </div>

                          <div className={`text-xs font-mono font-bold mt-0.5 flex items-center gap-1 ${turnoutColor}`}>
                            <span>{turnoutPct.toFixed(1)}% turnout</span>
                            {hasTurnoutChange && (
                              <span className={turnoutChange > 0 ? 'text-green-400' : 'text-red-400'}>
                                {turnoutChange > 0 ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Mini bar chart showing top parties, scaled by bloc size */}
                      <div className="space-y-0.5 mt-1.5">
                        {Object.entries(bloc.percentages)
                          .sort(([, a], [, b]) => b - a)
                          .map(([party, pct]) => {
                            const candidate = sortedResults.find(r => r.candidate.party === party);
                            if (!candidate || pct < 0.5) return null;

                            // Calculate change from previous poll
                            const previousPct = previousBloc?.percentages[party] || pct;
                            const change = pct - previousPct;
                            const hasChange = Math.abs(change) > 0.5;

                            // Calculate proportional width relative to the largest bloc
                            const proportionalWidth = (bloc.weight / maxBlocWeight) * 100;

                            return (
                              <div key={party} className="flex items-center gap-1">
                                <div className="text-xs text-slate-400 w-16 truncate flex items-center pr-1 gap-0.5">
                                  <span className="truncate">{party}</span>
                                  {state.incumbentGovernment?.includes(party) && (
                                    <span className="px-0.5 text-[8px] bg-slate-600/50 text-slate-300 border border-slate-500 rounded align-middle" title="Incumbent Government">G</span>
                                  )}
                                </div>

                                {/* Container that represents the bloc's proportion of the whole electorate */}
                                <div className="flex-1 flex items-center">
                                  <div
                                    className="bg-slate-700 rounded-full h-1.5 relative"
                                    style={{ width: `${proportionalWidth}%` }}
                                  >
                                    <div
                                      className="h-1.5 rounded-full absolute"
                                      style={{
                                        backgroundColor: candidate.candidate.colour,
                                        width: `${Math.max(2, pct)}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>

                                <div className="text-xs text-slate-300 w-10 text-right font-mono">
                                  {pct.toFixed(1)}%
                                </div>
                                {hasChange && (
                                  <div className={`text-xs font-mono w-3 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {change > 0 ? '▲' : '▼'}
                                  </div>
                                )}
                                {!hasChange && <div className="w-3"></div>}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        </div>
      )}


      {/* Player Ideology Profile */}
      {sortedResults.some(r => r.candidate.is_player) && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-600">
          <h3 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400 mb-2">
            YOUR ANALYSTS SAY
          </h3>
          {sortedResults.map((result) => {
            if (!result.candidate.is_player) return null;

            return (
              <div key={result.candidate.id} className="bg-slate-800/50 border border-yellow-500/30 rounded-lg p-2">
                <div className="text-xs text-yellow-400 font-mono mb-1.5 font-bold">
                  OVERALL VIEW OF {result.candidate.party.toUpperCase()}
                </div>
                <div className="space-y-1">
                  {getIdeologyDescriptors(result.candidate.vals)
                    .slice(0, 4)
                    .map((descriptor, idx) => {
                      // Font sizes for descending importance
                      const fontSizes = ['text-sm', 'text-xs', 'text-xs', 'text-xs'];
                      const fontWeights = ['font-bold', 'font-semibold', 'font-medium', 'font-normal'];

                      return (
                        <div
                          key={descriptor.key}
                          className={`${fontSizes[idx]} ${fontWeights[idx]} text-slate-200 uppercase tracking-wide`}
                        >
                          {descriptor.desc}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}

          {/* Target Bloc Perception */}
          {state.targetedBlocId && state.countryData.blocs && sortedResults.some(r => r.candidate.is_player) && (() => {
            const targetedBloc = state.countryData.blocs.find(b => b.id === state.targetedBlocId);
            const playerResult = sortedResults.find(r => r.candidate.is_player);

            if (!targetedBloc || !playerResult) return null;

            const comparisons = getComparativeDescriptors(playerResult.candidate.vals, targetedBloc.center);

            // Convert bloc ID to display name (e.g., "urban_progressives" -> "Urban Progressives")
            const convertBlocName = (id: string): string => {
              return id.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            };



            // If no meaningful differences, show aligned message
            if (comparisons.length === 0) {
              return (
                <div className="mt-2 bg-slate-800/50 border border-blue-500/30 rounded-lg p-2">
                  <div className="text-xs text-blue-400 font-mono mb-1.5 font-bold">
                    YOUR TARGET BLOC '{convertBlocName(targetedBloc.id).toUpperCase()}' FINDS YOU:
                  </div>
                  <div className="text-xs text-green-400 uppercase tracking-wide font-semibold">
                    WELL ALIGNED WITH THEIR VALUES
                  </div>
                </div>
              );
            }



            return (
              <div className="mt-2 bg-slate-800/50 border border-blue-500/30 rounded-lg p-2">
                <div className="text-xs text-blue-400 font-mono mb-1.5 font-bold">
                  YOUR TARGET BLOC '{convertBlocName(targetedBloc.id).toUpperCase()}' FINDS YOU:
                </div>
                <div className="space-y-1">
                  {comparisons.slice(0, 4).map((comparison, idx) => {
                    const fontSizes = ['text-sm', 'text-xs', 'text-xs', 'text-xs'];
                    const fontWeights = ['font-bold', 'font-semibold', 'font-medium', 'font-normal'];

                    return (
                      <div
                        key={comparison.key}
                        className={`${fontSizes[idx]} ${fontWeights[idx]} text-slate-200 uppercase tracking-wide`}
                      >
                        {comparison.desc}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}



    </div>
  );
}
