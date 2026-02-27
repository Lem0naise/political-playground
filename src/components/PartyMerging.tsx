import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { findMergeCandidates, mergeParties, generateMergedPartyNames, type Party, type MergeCandidate } from '@/lib/partyMerger';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';
import { VERSION } from '@/lib/version';

export default function PartyMerging() {
  const { state, actions } = useGame();
  const [parties, setParties] = useState<Party[]>([]);
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [currentMerge, setCurrentMerge] = useState<MergeCandidate | null>(null);
  const [newPartyName, setNewPartyName] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Party | null>(null);
  const [totalMerges, setTotalMerges] = useState(0);
  const [mergesDone, setMergesDone] = useState(0);
  const [done, setDone] = useState(false);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const initializeNextMerge = useCallback((candidates: MergeCandidate[], currentParties: Party[]) => {
    if (candidates.length === 0) {
      setCurrentMerge(null);
      setNewPartyName('');
      setSelectedLeader(null);
      return;
    }

    const nextMerge = candidates[0];
    setCurrentMerge(nextMerge);
    const suggestions = generateMergedPartyNames(nextMerge.party1, nextMerge.party2);
    setNewPartyName(suggestions[0] || `${nextMerge.party1.party} ${nextMerge.party2.party} Alliance`);
    setSelectedLeader(nextMerge.party1);

    // Suppress unused warning
    void currentParties;
  }, []);

  useEffect(() => {
    if (!state.pendingParties) return;

    setParties(state.pendingParties);
    const candidates = findMergeCandidates(state.pendingParties);
    setMergeCandidates(candidates);
    setTotalMerges(candidates.length);
    setMergesDone(0);
    initializeNextMerge(candidates, state.pendingParties);
  }, [state.pendingParties, initializeNextMerge]);



  // Reroll name suggestions (RNG — just re-trigger the memo by toggling a counter)
  const [rerollCount, setRerollCount] = useState(0);
  const rolledSuggestions = useMemo(() => {
    if (!currentMerge) return [];
    void rerollCount; // dependency to trigger re-computation
    return generateMergedPartyNames(currentMerge.party1, currentMerge.party2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMerge, rerollCount]);

  const remainingMerges = mergeCandidates.length;
  const similarityPercent = currentMerge ? Math.round(currentMerge.similarityScore * 100) : 0;

  // Remaining parties after all pending merges complete
  const partiesAfterMerging = useMemo(() => {
    // Each merge removes 2 parties and adds 1, net -1 per merge
    return parties.length - remainingMerges;
  }, [parties.length, remainingMerges]);

  const alignmentLabel = useMemo(() => {
    if (similarityPercent >= 90) return { text: 'near-identical — merger strongly recommended', color: 'text-green-400' };
    if (similarityPercent >= 80) return { text: 'very close — merger recommended', color: 'text-green-300' };
    if (similarityPercent >= 70) return { text: 'broadly aligned — merger viable', color: 'text-yellow-300' };
    return { text: 'some differences — merger optional', color: 'text-orange-400' };
  }, [similarityPercent]);

  const handleMerge = () => {
    if (!currentMerge || !selectedLeader || !newPartyName.trim()) return;

    const mergedParty = mergeParties(currentMerge.party1, currentMerge.party2, newPartyName.trim(), selectedLeader);
    const updatedParties = parties.filter(
      p => p.party !== currentMerge.party1.party && p.party !== currentMerge.party2.party
    );
    updatedParties.push(mergedParty);
    setParties(updatedParties);

    const remainingCandidates = findMergeCandidates(updatedParties);
    setMergeCandidates(remainingCandidates);
    setMergesDone(d => d + 1);
    setRerollCount(0);
    initializeNextMerge(remainingCandidates, updatedParties);
  };

  const handleSkipAll = () => {
    setMergeCandidates([]);
    setCurrentMerge(null);
    setNewPartyName('');
    setSelectedLeader(null);
  };

  const handleSkipMerge = () => {
    const remaining = mergeCandidates.slice(1);
    setMergeCandidates(remaining);
    setMergesDone(d => d + 1);
    setRerollCount(0);
    initializeNextMerge(remaining, parties);
  };

  // When all merges are done, immediately move to player-selection
  useEffect(() => {
    if (!currentMerge && parties.length > 0 && !done) {
      setDone(true);
      actions.setPartyList('Custom Coalition', parties);
      actions.setGamePhase('player-selection');
    }
  }, [currentMerge, parties, actions, done]);

  if (!currentMerge) {
    // Show nothing — transition fires immediately via useEffect above
    return null;
  }

  const mergeNumber = mergesDone + 1;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col gap-6">

          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <a
                href="https://indigo.spot"
                target="_blank"
                rel="noopener noreferrer"
                className="campaign-status text-xs sm:text-sm text-yellow-300 bg-slate-900/40 border border-yellow-500/40 rounded-full px-3 py-1 hover:text-yellow-200 transition-colors"
              >
                Built by Indigo
              </a>
            </div>
            <h1 className="newspaper-header text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {state.country || 'UNASSIGNED'} MERGER
            </h1>
            <p className="campaign-status text-xs sm:text-sm text-red-200 tracking-[0.35em]">
              MERGE CANDIDATES • ALIGN YOUR PLATFORM
            </p>
          </div>

          {/* Progress bar */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="campaign-status text-xs text-slate-400 uppercase tracking-widest">Progress</div>
              <div className="flex items-baseline gap-3">
                <span className="newspaper-header text-2xl font-black text-yellow-400">
                  Merge {mergeNumber} of {totalMerges}
                </span>
                <span className="text-xs text-slate-400">
                  {remainingMerges - 1} pairing{remainingMerges - 1 === 1 ? '' : 's'} left after this
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1">
                <div
                  className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalMerges > 0 ? ((mergesDone / totalMerges) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1 text-right">
              <div className="campaign-status text-xs text-slate-400 uppercase tracking-widest">After all merges</div>
              <div className="campaign-status text-lg text-slate-100">
                <span className="text-yellow-400 font-bold">{partiesAfterMerging}</span> parties saved
              </div>
            </div>
          </div>

          {/* Main merge card */}
          <div className="campaign-board p-5 sm:p-6 lg:p-8 rounded-xl space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="campaign-status text-lg sm:text-xl text-yellow-400">
                  {alignmentLabel.text.toUpperCase()}
                </h2>

              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSkipAll}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
                >
                  Skip All Mergers
                </button>
                <button
                  onClick={handleSkipMerge}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-yellow-400 text-yellow-200 hover:bg-yellow-900/20 font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
                >
                  Keep Separate
                </button>
              </div>
            </div>

            {/* Party comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[currentMerge.party1, currentMerge.party2].map(party => (
                <div
                  key={party.party}
                  className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex w-3 h-3 mt-1 rounded-full border border-white/70 flex-shrink-0"
                      style={{ backgroundColor: party.colour || 'transparent' }}
                    />
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="newspaper-header text-lg font-bold leading-tight text-slate-100 truncate">
                        {party.party}
                      </div>
                      <div className="text-xs text-slate-300 truncate">Led by {party.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        Support: {party.poll_percentage ? `${party.poll_percentage.toFixed(1)}%` : '0%'}
                      </div>
                      <div className="text-[0.65rem] text-slate-400">
                        {getIdeologyProfile([
                          party.prog_cons,
                          party.nat_glob,
                          party.env_eco,
                          party.soc_cap,
                          party.pac_mil,
                          party.auth_ana,
                          party.rel_sec
                        ])}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Name + leader selection */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="campaign-status text-xs text-slate-300">
                    New Party Name
                  </label>
                  <button
                    type="button"
                    onClick={() => setRerollCount(c => c + 1)}
                    className="campaign-status text-xs text-yellow-400 hover:text-yellow-200 border border-yellow-500/40 rounded px-2 py-0.5 transition-colors"
                  >
                    ↻ New suggestions
                  </button>
                </div>
                <input
                  type="text"
                  value={newPartyName}
                  onChange={event => setNewPartyName(event.target.value)}
                  placeholder="Enter a merged party name"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/40 text-slate-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {rolledSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setNewPartyName(suggestion)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors duration-200 ${newPartyName === suggestion
                        ? 'border-yellow-400 bg-yellow-900/40 text-yellow-100'
                        : 'border-slate-600 bg-slate-800/40 text-slate-200 hover:border-yellow-500 hover:text-yellow-100'
                        }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="campaign-status text-xs text-slate-300 block mb-2">
                  Choose a Leader
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[currentMerge.party1, currentMerge.party2].map(party => (
                    <button
                      key={`${party.party}-leader`}
                      type="button"
                      onClick={() => setSelectedLeader(party)}
                      className={`text-left px-3 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 ${selectedLeader?.party === party.party
                        ? 'border-yellow-400 bg-yellow-900/30 text-yellow-100'
                        : 'border-slate-600 bg-slate-800/40 text-slate-200 hover:border-yellow-600 hover:bg-slate-700/40'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex w-2.5 h-2.5 rounded-full border border-white/60 flex-shrink-0"
                          style={{ backgroundColor: party.colour || 'transparent' }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{party.name}</div>
                          <div className="text-[0.65rem] text-slate-400 truncate">{party.party}</div>
                        </div>
                        {selectedLeader?.party === party.party && (
                          <span className="ml-auto campaign-status text-[0.6rem] text-yellow-400">✓ selected</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">

              <button
                onClick={handleMerge}
                disabled={!newPartyName.trim() || !selectedLeader}
                className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 campaign-status text-sm disabled:cursor-not-allowed"
              >
                Merge These Parties →
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>Political Playground © {currentYear}</p>
            <p>Fictional simulator. No real-world endorsement or advice.</p>
            <p>Version {VERSION}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
