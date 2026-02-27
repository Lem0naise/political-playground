
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

  // Helper to convert bloc ID to display name
  const convertBlocName = (id: string): string =>
    id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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

          <div className="space-y-2">
            {(() => {
              const maxBlocWeight = Math.max(...state.blocStats.map(b => b.weight));

              return state.blocStats
                .sort((a, b) => (b.turnout * b.weight) - (a.turnout * a.weight))
                .map((bloc) => {
                  const blocPopulation = Math.round(state.countryData.pop * bloc.weight);
                  const previousBloc = state.previousBlocStats?.find(b => b.blocId === bloc.blocId);

                  const turnoutPct = bloc.turnout * 100;
                  const previousTurnoutPct = previousBloc ? previousBloc.turnout * 100 : turnoutPct;
                  const turnoutChange = turnoutPct - previousTurnoutPct;
                  const hasTurnoutChange = Math.abs(turnoutChange) > 0.5;
                  const turnoutColor = turnoutPct >= 70 ? 'text-green-400' :
                    turnoutPct >= 50 ? 'text-yellow-400' : 'text-red-400';

                  const proportionalWidth = (bloc.weight / maxBlocWeight) * 100;
                  const isTargeted = state.targetedBlocId === bloc.blocId;

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
                              className={`text-xs px-1.5 py-0.5 rounded transition-all ${isTargeted
                                  ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-600 font-bold'
                                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500'
                                }`}
                              title={isTargeted ? 'Stop analysing this bloc' : 'Analyse this voter bloc'}
                            >
                              {isTargeted ? '✓ ANALYSING' : '+ ANALYSE'}
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

                      {/* Mini bar chart */}
                      <div className="space-y-0.5 mt-1.5">
                        {Object.entries(bloc.percentages)
                          .sort(([, a], [, b]) => b - a)
                          .map(([party, pct]) => {
                            const candidate = sortedResults.find(r => r.candidate.party === party);
                            if (!candidate || pct < 0.5) return null;

                            const previousPct = previousBloc?.percentages[party] || pct;
                            const change = pct - previousPct;
                            const hasChange = Math.abs(change) > 0.5;

                            return (
                              <div key={party} className="flex items-center gap-1">
                                <div className="text-xs text-slate-400 w-16 truncate flex items-center pr-1 gap-0.5">
                                  <span className="truncate">{party}</span>
                                  {state.incumbentGovernment?.includes(party) && (
                                    <span className="px-0.5 text-[8px] bg-slate-600/50 text-slate-300 border border-slate-500 rounded align-middle" title="Incumbent Government">G</span>
                                  )}
                                </div>

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

      {/* Player Ideology Profile + Analyst Intel */}
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

          {/* Analyst intel panel — shown while actively targeting a bloc */}
          {state.targetedBlocId && state.countryData.blocs && (() => {
            const targetedBloc = state.countryData.blocs.find(b => b.id === state.targetedBlocId);
            const playerResult = sortedResults.find(r => r.candidate.is_player);
            if (!targetedBloc || !playerResult) return null;

            const weeksActive = state.targetingWeeksActive ?? 0;

            // Before first reveal: show progress bar
            if (weeksActive < 3) {
              const weeksUntil = 3 - weeksActive;
              return (
                <div className="mt-2 bg-slate-800/50 border border-yellow-500/20 rounded-lg p-2">
                  <div className="text-xs text-yellow-500/80 font-mono mb-1.5 font-bold">
                    ANALYSTS ON '{convertBlocName(targetedBloc.id).toUpperCase()}':
                  </div>
                  <div className="text-xs text-slate-400 font-mono italic">
                    Preparing report... {weeksUntil} week{weeksUntil !== 1 ? 's' : ''} until first findings.
                  </div>
                  <div className="mt-1.5 w-full bg-slate-700 rounded-full h-1">
                    <div
                      className="bg-yellow-500/60 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${(weeksActive / 3) * 100}%` }}
                    />
                  </div>
                </div>
              );
            }

            // Week 3+: compute how many descriptors to reveal.
            // Reveal 1 at week 3, then +1 every 2 weeks (week 5, 7, 9 …)
            const allComparisons = getComparativeDescriptors(playerResult.candidate.vals, targetedBloc.center);
            const revealCount = Math.min(
              allComparisons.length,
              1 + Math.floor((weeksActive - 3) / 2)
            );
            const visible = allComparisons.slice(0, revealCount);

            // Next unlock info
            const nextUnlockWeek = 3 + revealCount * 2; // approximate for display
            const weeksUntilNext = revealCount < allComparisons.length
              ? nextUnlockWeek - weeksActive
              : null;

            if (allComparisons.length === 0) {
              return (
                <div className="mt-2 bg-slate-800/50 border border-blue-500/30 rounded-lg p-2">
                  <div className="text-xs text-blue-400 font-mono mb-1.5 font-bold">
                    ANALYST REPORT — '{convertBlocName(targetedBloc.id).toUpperCase()}':
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
                  ANALYST REPORT — '{convertBlocName(targetedBloc.id).toUpperCase()}' FINDS YOU:
                </div>
                <div className="space-y-1">
                  {visible.map((comparison, idx) => {
                    const fontSizes = ['text-sm', 'text-xs', 'text-xs', 'text-xs', 'text-xs', 'text-xs', 'text-xs'];
                    const fontWeights = ['font-bold', 'font-semibold', 'font-medium', 'font-normal', 'font-normal', 'font-normal', 'font-normal'];

                    return (
                      <div
                        key={comparison.key}
                        className={`${fontSizes[idx] ?? 'text-xs'} ${fontWeights[idx] ?? 'font-normal'} text-slate-200 uppercase tracking-wide`}
                      >
                        {comparison.desc}
                      </div>
                    );
                  })}
                </div>
                {weeksUntilNext !== null && weeksUntilNext > 0 && (
                  <div className="text-[10px] text-slate-500 font-mono mt-1.5 italic">
                    Further findings in {weeksUntilNext} week{weeksUntilNext !== 1 ? 's' : ''}.
                  </div>
                )}
                {revealCount >= allComparisons.length && (
                  <div className="text-[10px] text-green-600/70 font-mono mt-1.5 italic">
                    Full analysis complete.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
