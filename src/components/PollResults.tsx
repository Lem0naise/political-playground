
import { useGame } from '@/contexts/GameContext';
import { formatVotes } from '@/lib/gameEngine';

interface PollResultsProps {
  onViewGraph: () => void;
  canViewGraph: boolean;
}

export default function PollResults({ onViewGraph, canViewGraph }: PollResultsProps) {
  const { state } = useGame();

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
          className={`text-[10px] sm:text-xs font-semibold rounded px-2 py-1 border transition-colors ${
            canViewGraph
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
            {state.blocStats
              .sort((a, b) => b.weight - a.weight) // Sort by weight descending
              .map((bloc) => {
                const leadingCandidate = sortedResults.find(r => r.candidate.party === bloc.leadingParty);
                const leadingColor = leadingCandidate?.candidate.colour || '#888';
                const blocPopulation = Math.round(state.countryData.pop * bloc.weight);
                
                // Find previous bloc stats for this bloc
                const previousBloc = state.previousBlocStats?.find(b => b.blocId === bloc.blocId);
                
                return (
                  <div 
                    key={bloc.blocId}
                    className="bg-slate-800/50 border border-slate-600 rounded-lg p-2"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="font-bold text-xs text-white">
                          {bloc.blocName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {(bloc.weight * 100).toFixed(1)}% of electorate • {formatVotes(blocPopulation, state.countryData.scale)} voters
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div 
                          className="px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-1"
                          style={{ backgroundColor: leadingColor + '40', color: leadingColor }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: leadingColor }}
                          ></div>
                          <span className="text-white">{bloc.leadingPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {bloc.leadingParty}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mini bar chart showing top 3 parties in this bloc */}
                    <div className="space-y-0.5 mt-1.5">
                      {Object.entries(bloc.percentages)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([party, pct]) => {
                          const candidate = sortedResults.find(r => r.candidate.party === party);
                          if (!candidate || pct < 0.5) return null;
                          
                          // Calculate change from previous poll
                          const previousPct = previousBloc?.percentages[party] || pct;
                          const change = pct - previousPct;
                          const hasChange = Math.abs(change) > 0.5;
                          
                          return (
                            <div key={party} className="flex items-center gap-1">
                              <div className="text-xs text-slate-400 w-16 truncate">{party}</div>
                              <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                                <div 
                                  className="h-1.5 rounded-full"
                                  style={{ 
                                    backgroundColor: candidate.candidate.colour,
                                    width: `${Math.max(2, pct)}%`
                                  }}
                                ></div>
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
              })}
          </div>
        </div>
      )}

      {state.currentPoll === 2 && (
        <div className="mt-1 sm:mt-2 p-1.5 sm:p-2 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <p className="text-xs text-yellow-300 font-mono">
            BASELINE ESTABLISHED - TRACKING MOMENTUM
          </p>
        </div>
      )}
    </div>
  );
}
