'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { findMergeCandidates, mergeParties, type Party, type MergeCandidate } from '@/lib/partyMerger';

export default function PartyMerging() {
  const { state, actions } = useGame();
  const [parties, setParties] = useState<Party[]>([]);
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [currentMerge, setCurrentMerge] = useState<MergeCandidate | null>(null);
  const [newPartyName, setNewPartyName] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Party | null>(null);

  useEffect(() => {
    if (state.pendingParties) {
      setParties(state.pendingParties);
      const candidates = findMergeCandidates(state.pendingParties);
      setMergeCandidates(candidates);
      if (candidates.length > 0) {
        setCurrentMerge(candidates[0]);
        setNewPartyName(`${candidates[0].party1.party}-${candidates[0].party2.party} Alliance`);
        setSelectedLeader(candidates[0].party1);
      }
    }
  }, [state.pendingParties]);

  const handleMerge = () => {
    if (!currentMerge || !selectedLeader || !newPartyName.trim()) return;

    const mergedParty = mergeParties(currentMerge.party1, currentMerge.party2, newPartyName.trim(), selectedLeader);
    
    const updatedParties = parties.filter(p => 
      p.party !== currentMerge.party1.party && p.party !== currentMerge.party2.party
    );
    updatedParties.push(mergedParty);
    
    setParties(updatedParties);
    
    const remainingCandidates = findMergeCandidates(updatedParties);
    setMergeCandidates(remainingCandidates);
    
    if (remainingCandidates.length > 0) {
      setCurrentMerge(remainingCandidates[0]);
      setNewPartyName(`${remainingCandidates[0].party1.party}-${remainingCandidates[0].party2.party} Alliance`);
      setSelectedLeader(remainingCandidates[0].party1);
    } else {
      setCurrentMerge(null);
    }
  };

  const handleSkipMerge = () => {
    const remainingCandidates = mergeCandidates.slice(1);
    setMergeCandidates(remainingCandidates);
    
    if (remainingCandidates.length > 0) {
      setCurrentMerge(remainingCandidates[0]);
      setNewPartyName(`${remainingCandidates[0].party1.party}-${remainingCandidates[0].party2.party} Alliance`);
      setSelectedLeader(remainingCandidates[0].party1);
    } else {
      setCurrentMerge(null);
    }
  };

  const handleFinish = () => {
    actions.setPartyList('Custom Coalition', parties);
    actions.setGamePhase('player-selection');
  };

  if (!currentMerge) {
    return (
      <div className="min-h-screen p-2 sm:p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="newspaper-header text-2xl sm:text-3xl font-black text-white mb-4">
            MERGER COMPLETE
          </h1>
          <div className="vintage-border p-3 sm:p-4 mb-4" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">Final Opposition ({parties.length} parties)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parties.map((party, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-slate-100 border border-slate-300 rounded">
                  <div 
                    className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: party.colour }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{party.party}</div>
                    <div className="text-xs text-slate-700 truncate">{party.name}</div>
                    <div className="text-xs text-slate-600">{(party.party_pop * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
          >
            🚀 LAUNCH CAMPAIGN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="newspaper-header text-2xl sm:text-3xl font-black text-white mb-2">
            PARTY MERGER NEGOTIATIONS
          </h1>
          <div className="border-t-2 border-b-2 border-yellow-500 py-1 sm:py-2 my-2">
            <p className="campaign-status text-sm sm:text-base text-yellow-200">
              MERGER {mergeCandidates.length > 1 ? `1 OF ${mergeCandidates.length}` : 'FINAL'} • SIMILARITY: {(currentMerge.similarityScore * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Party 1 */}
          <div className="vintage-border p-3 sm:p-4" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 border-b border-slate-800 pb-1">
              {currentMerge.party1.party}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-5 h-5 rounded-full border border-slate-600 flex-shrink-0"
                  style={{ backgroundColor: currentMerge.party1.colour }}
                ></div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{currentMerge.party1.name}</div>
                  <div className="text-xs text-slate-600">Support: {(currentMerge.party1.party_pop * 100).toFixed(1)}%</div>
                </div>
              </div>
              {false && (<div className="grid grid-cols-2 gap-1 text-xs">
                <div>P/C: {currentMerge?.party1.prog_cons}</div>
                <div>N/G: {currentMerge?.party1.nat_glob}</div>
                <div>E/E: {currentMerge?.party1.env_eco}</div>
                <div>S/C: {currentMerge?.party1.soc_cap}</div>
                <div>P/M: {currentMerge?.party1.pac_mil}</div>
                <div>A/A: {currentMerge?.party1.auth_ana}</div>
                <div>R/S: {currentMerge?.party1.rel_sec}</div>
              </div>)}
            </div>
          </div>

          {/* Party 2 */}
          <div className="vintage-border p-3 sm:p-4" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 border-b border-slate-800 pb-1">
              {currentMerge.party2.party}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-5 h-5 rounded-full border border-slate-600 flex-shrink-0"
                  style={{ backgroundColor: currentMerge.party2.colour }}
                ></div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{currentMerge.party2.name}</div>
                  <div className="text-xs text-slate-600">Support: {(currentMerge.party2.party_pop * 100).toFixed(1)}%</div>
                </div>
              </div>
              {false && (<div className="grid grid-cols-2 gap-1 text-xs">
                <div>P/C: {currentMerge?.party2.prog_cons}</div>
                <div>N/G: {currentMerge?.party2.nat_glob}</div>
                <div>E/E: {currentMerge?.party2.env_eco}</div>
                <div>S/C: {currentMerge?.party2.soc_cap}</div>
                <div>P/M: {currentMerge?.party2.pac_mil}</div>
                <div>A/A: {currentMerge?.party2.auth_ana}</div>
                <div>R/S: {currentMerge?.party2.rel_sec}</div>
              </div>)}
            </div>
          </div>
        </div>

        {/* Merger Options */}
        <div className="vintage-border p-3 sm:p-4 mb-4 sm:mb-6" style={{ background: 'var(--newspaper-bg)' }}>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">Merger Details</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-1">New Party Name:</label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                className="w-full p-2 border border-slate-400 rounded font-mono text-sm"
                placeholder="Enter new party name..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Party Leader:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[currentMerge.party1, currentMerge.party2].map((party) => (
                  <div
                    key={party.party}
                    onClick={() => setSelectedLeader(party)}
                    className={`p-2 border rounded cursor-pointer transition-all ${
                      selectedLeader?.party === party.party
                        ? 'border-yellow-500 bg-yellow-100'
                        : 'border-slate-400 bg-slate-50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0"
                        style={{ backgroundColor: party.colour }}
                      ></div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">{party.name}</div>
                        <div className="text-xs text-slate-600 truncate">from {party.party}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <button
            onClick={handleSkipMerge}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 text-sm"
          >
            SKIP MERGER
          </button>
          
          <button
            onClick={handleMerge}
            disabled={!newPartyName.trim() || !selectedLeader}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
          >
            🤝 CONFIRM MERGER
          </button>
        </div>
      </div>
    </div>
  );
}
