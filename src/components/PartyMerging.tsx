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
  const [done, setDone] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [ignoredPairs, setIgnoredPairs] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);
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
    if (!state.pendingParties || hasInitialized) return;

    setHasInitialized(true);
    const initializedParties = state.pendingParties.map(p => ({
      ...p,
      _uid: p._uid || crypto.randomUUID()
    }));
    setParties(initializedParties);
    const candidates = findMergeCandidates(initializedParties);
    setMergeCandidates(candidates);
    initializeNextMerge(candidates, initializedParties);
  }, [state.pendingParties, initializeNextMerge, hasInitialized]);

  // Reroll name suggestions (RNG — just re-trigger the memo by toggling a counter)
  const [rerollCount, setRerollCount] = useState(0);
  const rolledSuggestions = useMemo(() => {
    if (!currentMerge) return [];
    void rerollCount; // dependency to trigger re-computation
    return generateMergedPartyNames(currentMerge.party1, currentMerge.party2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMerge, rerollCount]);

  const similarityPercent = currentMerge ? Math.round(currentMerge.similarityScore * 100) : 0;

  const alignmentLabel = useMemo(() => {
    if (similarityPercent >= 90) return { text: 'near-identical — merger strongly recommended', color: 'text-green-400' };
    if (similarityPercent >= 80) return { text: 'very close — merger recommended', color: 'text-green-300' };
    if (similarityPercent >= 70) return { text: 'broadly aligned — merger viable', color: 'text-yellow-300' };
    return { text: 'some differences — merger optional', color: 'text-orange-400' };
  }, [similarityPercent]);

  const handleMerge = () => {
    if (!currentMerge || !selectedLeader || !newPartyName.trim()) return;

    const mergedParty = {
      ...mergeParties(currentMerge.party1, currentMerge.party2, newPartyName.trim(), selectedLeader),
      _uid: crypto.randomUUID()
    };
    const updatedParties = parties.filter(
      p => p._uid !== currentMerge.party1._uid && p._uid !== currentMerge.party2._uid
    );
    updatedParties.push(mergedParty);
    setParties(updatedParties);

    const remainingCandidates = findMergeCandidates(updatedParties).filter(c => {
      const p1 = c.party1._uid;
      const p2 = c.party2._uid;
      return !ignoredPairs.has(`${p1}|${p2}`) && !ignoredPairs.has(`${p2}|${p1}`);
    });
    setMergeCandidates(remainingCandidates);
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
    if (!currentMerge) return;
    const newIgnores = new Set(ignoredPairs);
    newIgnores.add(`${currentMerge.party1._uid}|${currentMerge.party2._uid}`);
    setIgnoredPairs(newIgnores);

    const remaining = mergeCandidates.slice(1);
    setMergeCandidates(remaining);
    setRerollCount(0);
    initializeNextMerge(remaining, parties);
  };

  // When all merges are done, immediately move to player-selection
  useEffect(() => {
    if (hasInitialized && !currentMerge && parties.length > 0 && !done) {
      setDone(true);
      actions.setPartyList('Custom Coalition', parties);
      actions.setGamePhase('player-selection');
    }
  }, [currentMerge, parties, actions, done, hasInitialized]);

  if (!hasInitialized) return null;

  if (parties.length > 0 && !optedIn && mergeCandidates.length > 0 && !done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="w-full max-w-2xl bg-slate-800/80 border border-slate-700 rounded-xl p-8 text-center space-y-6 shadow-2xl">
          <div className="flex justify-center mb-6">
            <span className="campaign-status text-xs sm:text-sm text-yellow-300 bg-slate-900/40 border border-yellow-500/40 rounded-full px-4 py-1.5">
              PRE-ELECTION PHASE
            </span>
          </div>
          <h1 className="newspaper-header text-4xl sm:text-5xl text-white font-black tracking-tight">PLATFORM CONSOLIDATION</h1>
          <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mt-4">
            We have detected <span className="text-yellow-400 font-bold">{mergeCandidates.length}</span> potential party merger{mergeCandidates.length !== 1 ? 's' : ''} based on shared ideological alignment.
          </p>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            Merging parties with similar platforms reduces vote splitting and builds stronger coalitions before the campaign begins. Would you like to review and merge them?
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <button
              onClick={handleSkipAll}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors campaign-status"
            >
              No, Skip Merging
            </button>
            <button
              onClick={() => setOptedIn(true)}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-slate-900 font-bold rounded-lg transition-colors campaign-status shadow-lg shadow-yellow-500/20"
            >
              Yes, Review Candidates →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentMerge) return null;

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

          {/* Status bar */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="campaign-status text-xs text-slate-400 uppercase tracking-widest">Merge Candidates</div>
              <div className="flex items-baseline gap-3">
                <span className="newspaper-header text-2xl font-black text-yellow-400">
                  {mergeCandidates.length} Pair{mergeCandidates.length !== 1 ? 's' : ''} Remaining
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1 text-right">
              <div className="campaign-status text-xs text-slate-400 uppercase tracking-widest">Active Parties</div>
              <div className="campaign-status text-lg text-slate-100">
                <span className="text-yellow-400 font-bold">{parties.length}</span> parties total
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
                  key={party._uid}
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
                      key={`${party._uid}-leader`}
                      type="button"
                      onClick={() => setSelectedLeader(party)}
                      className={`text-left px-3 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 ${selectedLeader?._uid === party._uid
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
                        {selectedLeader?._uid === party._uid && (
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
                onClick={handleSkipMerge}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-yellow-400 text-yellow-200 hover:bg-yellow-900/20 font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
              >
                Keep Separate
              </button>
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
            <p>Fictional election simulator.</p>
            <p>Version {VERSION}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
