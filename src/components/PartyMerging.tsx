import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { findMergeCandidates, mergeParties, type Party, type MergeCandidate } from '@/lib/partyMerger';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';


// Helper to generate better party name suggestions
function generatePartyNameSuggestions(p1: Party, p2: Party): string[] {
  const names = [
    // Retain either party's name
    p1.party,
    p2.party,
    // Acronym of both names
    [p1.party, p2.party].map(n => n.split(/\s+/).map(w => w[0]).join('')).join('-'),
    // Blend: first word of p1 + last word of p2
    `${p1.party.split(' ')[0]} ${p2.party.split(' ').slice(-1)[0]}`,
    // "Alliance" or "Coalition" suffix
    `${p1.party}-${p2.party} Bloc`,
    `${p1.party} & ${p2.party} Coalition`,
    // Shortest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a, b) => a.length - b.length)[0];
      const p2w = p2.party.split(' ').sort((a, b) => a.length - b.length)[0];
      return `${p1w} ${p2w} Alliance`;
    })(),
    // Longest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a, b) => b.length - a.length)[0];
      const p2w = p2.party.split(' ').sort((a, b) => b.length - a.length)[0];
      return `${p1w} ${p2w} Party`;
    })(),
    // Shortest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a, b) => a.length - b.length)[0];
      const p2w = p2.party.split(' ').sort((a, b) => a.length - b.length)[0];
      return `${p2w} ${p1w} Alliance`;
    })(),
    // Longest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a, b) => b.length - a.length)[0];
      const p2w = p2.party.split(' ').sort((a, b) => b.length - a.length)[0];
      return `${p2w} ${p1w} Party`;
    })(),
  ];
  // Remove duplicates and empty
  return Array.from(new Set(names.filter(Boolean)));
}

export default function PartyMerging() {
  const { state, actions } = useGame();
  const [parties, setParties] = useState<Party[]>([]);
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [currentMerge, setCurrentMerge] = useState<MergeCandidate | null>(null);
  const [newPartyName, setNewPartyName] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Party | null>(null);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const initializeNextMerge = useCallback((candidates: MergeCandidate[]) => {
    if (candidates.length === 0) {
      setCurrentMerge(null);
      setNewPartyName('');
      setSelectedLeader(null);
      return;
    }

    const nextMerge = candidates[0];
    setCurrentMerge(nextMerge);
    const suggestions = generatePartyNameSuggestions(nextMerge.party1, nextMerge.party2);
    setNewPartyName(suggestions[0] || `${nextMerge.party1.party}-${nextMerge.party2.party} Alliance`);
    setSelectedLeader(nextMerge.party1);
  }, []);

  useEffect(() => {
    if (!state.pendingParties) {
      return;
    }

    setParties(state.pendingParties);
    const candidates = findMergeCandidates(state.pendingParties);
    setMergeCandidates(candidates);
    initializeNextMerge(candidates);
  }, [state.pendingParties, initializeNextMerge]);

  const nameSuggestions = useMemo(() => {
    if (!currentMerge) {
      return [];
    }
    return generatePartyNameSuggestions(currentMerge.party1, currentMerge.party2);
  }, [currentMerge]);

  const remainingMerges = mergeCandidates.length;
  const similarityPercent = currentMerge ? Math.round(currentMerge.similarityScore * 100) : 0;

  const handleMerge = () => {
    if (!currentMerge || !selectedLeader || !newPartyName.trim()) {
      return;
    }

    const mergedParty = mergeParties(currentMerge.party1, currentMerge.party2, newPartyName.trim(), selectedLeader);

    const updatedParties = parties.filter(p =>
      p.party !== currentMerge.party1.party && p.party !== currentMerge.party2.party
    );
    updatedParties.push(mergedParty);

    setParties(updatedParties);

    const remainingCandidates = findMergeCandidates(updatedParties);
    setMergeCandidates(remainingCandidates);
    initializeNextMerge(remainingCandidates);
  };

  const handleSkipAll = () => {
    setMergeCandidates([]);
    initializeNextMerge([]);
  };

  const handleSkipMerge = () => {
    const remainingCandidates = mergeCandidates.slice(1);
    setMergeCandidates(remainingCandidates);
    initializeNextMerge(remainingCandidates);
  };

  const handleFinish = () => {
    actions.setPartyList('Custom Coalition', parties);
    actions.setGamePhase('player-selection');
  };

  if (!currentMerge) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col gap-6">
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
                COALITION READY
              </h1>
              <p className="campaign-status text-xs sm:text-sm text-red-200 tracking-[0.35em]">
                {state.country || 'UNASSIGNED'} • OPPOSITION CONFIGURED
              </p>
            </div>

            <div className="campaign-board p-5 sm:p-6 lg:p-8 rounded-xl space-y-6">
              <div className="space-y-1 text-center">
                <h2 className="campaign-status text-lg sm:text-xl text-yellow-400">
                  Final Opposition Lineup
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm">
                  {parties.length} part{parties.length === 1 ? 'y' : 'ies'} stand ready for the next stage. Pick your banner and lead the coalition.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {parties.map((party, index) => (
                  <div
                    key={`${party.party}-${index}`}
                    className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex w-3 h-3 rounded-full border border-white/70"
                        style={{ backgroundColor: party.colour || 'transparent' }}
                      ></span>
                      <div className="min-w-0">
                        <div className="newspaper-header text-lg font-bold leading-tight text-slate-100 truncate">
                          {party.party}
                        </div>
                        <div className="text-xs text-slate-300 truncate">{party.name}</div>
                        <div className="text-[0.65rem] text-slate-400 mt-1">
                          Support {(party.party_pop * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-center sm:justify-between gap-3">
                <button
                  onClick={() => actions.resetGame()}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
                >
                  ◄ Return to Map
                </button>

                <button
                  onClick={handleFinish}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-200 campaign-status text-sm"
                >
                  Go to choosing or create a custom party
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400 space-y-1">
              <p>Political Playground © {currentYear}</p>
              <p>Fictional simulator. No real-world endorsement or advice.</p>
              <p>Version 1.2.4</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col gap-6">
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

          <div className="campaign-board p-5 sm:p-6 lg:p-8 rounded-xl space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="campaign-status text-lg sm:text-xl text-yellow-400">
                  Should these parties combine?
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm max-w-lg">
                  Compare strengths, choose a leader, and confirm the merger. You can skip individual pairings or finish without merging.
                </p>
                <div className="campaign-status text-xs text-slate-300">
                  Similarity {similarityPercent}% • {remainingMerges} pairing{remainingMerges === 1 ? '' : 's'} remaining
                </div>
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
                  Skip This Pair
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[currentMerge.party1, currentMerge.party2].map(party => (
                <div
                  key={party.party}
                  className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex w-3 h-3 rounded-full border border-white/70"
                      style={{ backgroundColor: party.colour || 'transparent' }}
                    ></span>
                    <div className="min-w-0 space-y-1">
                      <div className="newspaper-header text-lg font-bold leading-tight text-slate-100 truncate">
                        {party.party}
                      </div>
                      <div className="text-xs text-slate-300 truncate">{party.name}</div>
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

            <div className="space-y-4">
              <div>
                <label className="campaign-status text-xs text-slate-300 block mb-2">
                  New Party Name
                </label>
                <input
                  type="text"
                  value={newPartyName}
                  onChange={event => setNewPartyName(event.target.value)}
                  placeholder="Enter a merged party name"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/40 text-slate-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {nameSuggestions.map(suggestion => (
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
                          className="inline-flex w-2.5 h-2.5 rounded-full border border-white/60"
                          style={{ backgroundColor: party.colour || 'transparent' }}
                        ></span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{party.name}</div>
                          <div className="text-[0.65rem] text-slate-400 truncate">{party.party}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={handleSkipMerge}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
              >
                ◄ Skip This Pair
              </button>

              <button
                onClick={handleMerge}
                disabled={!newPartyName.trim() || !selectedLeader}
                className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 campaign-status text-sm disabled:cursor-not-allowed"
              >
                Confirm Merge
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>Political Playground © {currentYear}</p>
            <p>Fictional simulator. No real-world endorsement or advice.</p>
            <p>Version 1.2.4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
